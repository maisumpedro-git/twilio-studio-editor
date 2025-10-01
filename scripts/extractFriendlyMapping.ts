/*
  CLI script: extractFriendlyMapping
  - Validates .env for SOURCE_* and DEST_* creds; prompts if missing
  - Fetches resources from both accounts (TaskRouter, Serverless, Content, Studio)
  - Saves per-account JSON under scripts/data/{source|dest}/
  - Builds de-para mapping by name (friendlyName > uniqueName > name) into scripts/data/mapping/sid-mapping.json
*/

import fs from "fs";
import path from "path";
import inquirer from "inquirer";
import dotenv from "dotenv";
import axios, { AxiosInstance } from "axios";

dotenv.config();

type AccountCreds = { accountSid: string; authToken: string };
type Clients = {
  taskrouter: AxiosInstance;
  serverless: AxiosInstance;
  content: AxiosInstance;
  studio: AxiosInstance;
};

const rootDir = process.cwd();
const outBase = path.join(rootDir, "scripts", "data");

const ensureDir = (p: string) => {
  fs.mkdirSync(p, { recursive: true });
};

const writeJson = (p: string, data: unknown) => {
  ensureDir(path.dirname(p));
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
};

const getEnv = (key: string) => process.env[key] || "";

const promptMissingCreds = async (): Promise<{ source: AccountCreds; dest: AccountCreds }> => {
  const defaults = {
    sourceSid: getEnv("SOURCE_ACCOUNT_SID"),
    sourceToken: getEnv("SOURCE_AUTH_TOKEN"),
    destSid: getEnv("DEST_ACCOUNT_SID"),
    destToken: getEnv("DEST_AUTH_TOKEN")
  };
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "sourceSid",
      message: "Source Account SID (AC...):",
      default: defaults.sourceSid,
      validate: (v: string) => /^AC[0-9a-zA-Z]{32}$/.test(v) || "Informe um Account SID válido (AC...)"
    },
    {
      type: "password",
      name: "sourceToken",
      message: "Source Auth Token:",
      default: defaults.sourceToken,
      mask: "*",
      validate: (v: string) => v.trim().length >= 8 || "Informe um Auth Token válido"
    },
    {
      type: "input",
      name: "destSid",
      message: "Dest Account SID (AC...):",
      default: defaults.destSid,
      validate: (v: string) => /^AC[0-9a-zA-Z]{32}$/.test(v) || "Informe um Account SID válido (AC...)"
    },
    {
      type: "password",
      name: "destToken",
      message: "Dest Auth Token:",
      default: defaults.destToken,
      mask: "*",
      validate: (v: string) => v.trim().length >= 8 || "Informe um Auth Token válido"
    }
  ]);
  return {
    source: { accountSid: answers.sourceSid, authToken: answers.sourceToken },
    dest: { accountSid: answers.destSid, authToken: answers.destToken }
  };
};

const createClients = ({ accountSid, authToken }: AccountCreds): Clients => {
  const auth = { username: accountSid, password: authToken };
  const taskrouter = axios.create({ baseURL: `https://taskrouter.twilio.com/v1`, auth });
  const serverless = axios.create({ baseURL: `https://serverless.twilio.com/v1`, auth });
  const content = axios.create({ baseURL: `https://content.twilio.com/v1`, auth });
  const studio = axios.create({ baseURL: `https://studio.twilio.com/v2`, auth });
  for (const c of [taskrouter, serverless, content, studio]) {
    c.interceptors.response.use(
      (r) => r,
      (e) => {
        const d = e?.response?.data; const msg = d?.message || d?.detail || e.message;
        return Promise.reject(new Error(msg));
      }
    );
  }
  return { taskrouter, serverless, content, studio };
};

const arr = (v: any): any[] => (Array.isArray(v) ? v : []);
const pickName = (it: any): string => it?.friendlyName || it?.friendly_name || it?.uniqueName || it?.unique_name || it?.name || "";

type AccountData = {
  workspace?: { sid: string; name: string };
  taskQueues: Array<{ sid: string; name: string }>;
  workflows: Array<{ sid: string; name: string }>;
  activities: Array<{ sid: string; name: string }>;
  taskChannels: Array<{ sid: string; name: string }>;
  services: Array<{ sid: string; name: string }>;
  environments: Array<{ sid: string; name: string; serviceSid: string; serviceName: string }>;
  functions: Array<{ sid: string; name: string; serviceSid: string; serviceName: string }>;
  contentTemplates: Array<{ sid: string; name: string }>;
  studioFlows: Array<{ sid: string; name: string }>;
};

const fetchAccountData = async (label: "source" | "dest", creds: AccountCreds): Promise<AccountData> => {
  const outDir = path.join(outBase, label);
  ensureDir(outDir);
  const clients = createClients(creds);

  const data: AccountData = {
    taskQueues: [], workflows: [], activities: [], taskChannels: [],
    services: [], environments: [], functions: [], contentTemplates: [], studioFlows: []
  };

  // TaskRouter: workspace
  const wsRes = await clients.taskrouter.get(`/Workspaces`, { params: { PageSize: 100 } });
  const workspaces = arr(wsRes.data?.workspaces || wsRes.data?.data || Object.values(wsRes.data).find(Array.isArray));
  const ws = workspaces?.[0];
  if (ws?.sid) {
    data.workspace = { sid: ws.sid, name: pickName(ws) };
    writeJson(path.join(outDir, `workspace.json`), data.workspace);

    // Task Queues
    const tqRes = await clients.taskrouter.get(`/Workspaces/${encodeURIComponent(ws.sid)}/TaskQueues`, { params: { PageSize: 1000 } });
    data.taskQueues = arr(tqRes.data?.task_queues || tqRes.data?.data || Object.values(tqRes.data).find(Array.isArray))
      .map((q: any) => ({ sid: q.sid, name: pickName(q) }));
    writeJson(path.join(outDir, `task_queues.json`), data.taskQueues);

    // Workflows
    const wfRes = await clients.taskrouter.get(`/Workspaces/${encodeURIComponent(ws.sid)}/Workflows`, { params: { PageSize: 1000 } });
    data.workflows = arr(wfRes.data?.workflows || wfRes.data?.data || Object.values(wfRes.data).find(Array.isArray))
      .map((w: any) => ({ sid: w.sid, name: pickName(w) }));
    writeJson(path.join(outDir, `workflows.json`), data.workflows);

    // Activities
    const actRes = await clients.taskrouter.get(`/Workspaces/${encodeURIComponent(ws.sid)}/Activities`, { params: { PageSize: 1000 } });
    data.activities = arr(actRes.data?.activities || actRes.data?.data || Object.values(actRes.data).find(Array.isArray))
      .map((a: any) => ({ sid: a.sid, name: pickName(a) }));
    writeJson(path.join(outDir, `activities.json`), data.activities);

    // Task Channels
    const chRes = await clients.taskrouter.get(`/Workspaces/${encodeURIComponent(ws.sid)}/TaskChannels`, { params: { PageSize: 1000 } });
    data.taskChannels = arr(chRes.data?.task_channels || chRes.data?.data || Object.values(chRes.data).find(Array.isArray))
      .map((c: any) => ({ sid: c.sid, name: pickName(c) }));
    writeJson(path.join(outDir, `task_channels.json`), data.taskChannels);
  }

  // Serverless: services
  const svRes = await clients.serverless.get(`/Services`, { params: { PageSize: 1000 } });
  data.services = arr(svRes.data?.services || svRes.data?.data || Object.values(svRes.data).find(Array.isArray))
    .map((s: any) => ({ sid: s.sid, name: pickName(s) }));
  writeJson(path.join(outDir, `services.json`), data.services);

  // Environments per service
  for (const s of data.services) {
    const envRes = await clients.serverless.get(`/Services/${encodeURIComponent(s.sid)}/Environments`, { params: { PageSize: 1000 } });
    const envs = arr(envRes.data?.environments || envRes.data?.data || Object.values(envRes.data).find(Array.isArray))
      .map((e: any) => ({ sid: e.sid, name: pickName(e), serviceSid: s.sid, serviceName: s.name }));
    data.environments.push(...envs);

    const fnRes = await clients.serverless.get(`/Services/${encodeURIComponent(s.sid)}/Functions`, { params: { PageSize: 1000 } });
    const fns = arr(fnRes.data?.functions || fnRes.data?.data || Object.values(fnRes.data).find(Array.isArray))
      .map((f: any) => ({ sid: f.sid, name: pickName(f), serviceSid: s.sid, serviceName: s.name }));
    data.functions.push(...fns);
  }
  writeJson(path.join(outDir, `environments.json`), data.environments);
  writeJson(path.join(outDir, `functions.json`), data.functions);

  // Content Templates
  const ctRes = await clients.content.get(`/Content`, { params: { PageSize: 1000 } }).catch(async () => {
    // Some APIs might use /Templates
    return clients.content.get(`/Templates`, { params: { PageSize: 1000 } });
  });
  data.contentTemplates = arr(ctRes.data?.contents || ctRes.data?.templates || ctRes.data?.data || Object.values(ctRes.data).find(Array.isArray))
    .map((t: any) => ({ sid: t.sid || t.id, name: pickName(t) }));
  writeJson(path.join(outDir, `content_templates.json`), data.contentTemplates);

  // Studio Flows
  const flRes = await clients.studio.get(`/Flows`, { params: { PageSize: 1000 } });
  data.studioFlows = arr(flRes.data?.flows || flRes.data?.data || Object.values(flRes.data).find(Array.isArray))
    .map((f: any) => ({ sid: f.sid, name: pickName(f) }));
  writeJson(path.join(outDir, `studio_flows.json`), data.studioFlows);

  return data;
};

type MappingEntry = { name: string; sourceSid?: string; destSid?: string };

const buildDePara = (source: AccountData, dest: AccountData) => {
  const byName = (items: Array<{ sid: string; name: string }>) => {
    const map = new Map<string, string>();
    for (const it of items) {
      const key = (it.name || "").toLowerCase();
      if (!key) continue;
      if (!map.has(key)) map.set(key, it.sid);
    }
    return map;
  };
  const pair = (src: Array<{ sid: string; name: string }>, dst: Array<{ sid: string; name: string }>): MappingEntry[] => {
    const srcBy = byName(src);
    const dstBy = byName(dst);
    const names = new Set<string>([...Array.from(srcBy.keys()), ...Array.from(dstBy.keys())]);
    const out: MappingEntry[] = [];
    for (const nm of names) {
      out.push({ name: nm, sourceSid: srcBy.get(nm), destSid: dstBy.get(nm) });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name));
  };

  return {
    taskrouter: {
      workspace: source.workspace && dest.workspace ? { name: source.workspace.name.toLowerCase(), sourceSid: source.workspace.sid, destSid: dest.workspace.sid } : undefined,
      taskQueues: pair(source.taskQueues, dest.taskQueues),
      workflows: pair(source.workflows, dest.workflows),
      activities: pair(source.activities, dest.activities),
      taskChannels: pair(source.taskChannels, dest.taskChannels)
    },
    serverless: {
      services: pair(source.services, dest.services),
      environments: pair(source.environments, dest.environments),
      functions: pair(source.functions, dest.functions)
    },
    contentTemplates: pair(source.contentTemplates, dest.contentTemplates),
    studioFlows: pair(source.studioFlows, dest.studioFlows)
  };
};

async function main() {
  // Read or prompt credentials
  const creds = await promptMissingCreds();

  console.log("Coletando dados da conta de origem...");
  const src = await fetchAccountData("source", creds.source);
  console.log("Coletando dados da conta de destino...");
  const dst = await fetchAccountData("dest", creds.dest);

  console.log("Gerando de-para de SIDs...");
  const mapping = buildDePara(src, dst);
  const mapPath = path.join(outBase, "mapping", "sid-mapping.json");
  writeJson(mapPath, mapping);

  console.log("Concluído. Saídas em:", path.relative(rootDir, outBase));
}

// Execute if run directly
if (require.main === module) {
  main().catch((err) => {
    console.error("Erro:", err.message || err);
    process.exit(1);
  });
}
