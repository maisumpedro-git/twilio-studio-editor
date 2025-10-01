import fs from "fs";
import path from "path";
import axios, { AxiosInstance } from "axios";
import { getWorkspaceRoot } from "./constants";
import { getTwilioConfig } from "./envService";

const ensureDir = (p: string) => fs.mkdirSync(p, { recursive: true });

const outDir = () => path.join(getWorkspaceRoot(), "scripts", "data");
const mapFilePath = () => path.join(outDir(), "sid-to-friendly.json");

const client = (baseURL: string, auth: { username: string; password: string }): AxiosInstance => {
  const c = axios.create({ baseURL, auth });
  c.interceptors.response.use(
    (r) => r,
    (e) => Promise.reject(new Error(e?.response?.data?.message || e?.response?.data?.detail || e.message))
  );
  return c;
};

const pickName = (it: any): string => it?.friendly_name || it?.unique_name || "empty";
const pickChildName = (parent: any, it: any): string => `${pickName(parent)}_${pickName(it)}`;
const arr = (v: any): any[] => (Array.isArray(v) ? v : []);

export const fetchSidFriendlyMap = async (): Promise<Record<string, string>> => {
  const cfg = getTwilioConfig();
  if (!cfg.accountSid || !cfg.authToken) throw new Error("Credenciais ausentes no .env do workspace.");
  const auth = { username: cfg.accountSid, password: cfg.authToken };
  const taskrouter = client(`https://taskrouter.twilio.com/v1`, auth);
  const serverless = client(`https://serverless.twilio.com/v1`, auth);
  const content = client(`https://content.twilio.com/v1`, auth);
  const studio = client(`${cfg.studioBaseUrl}/v2`, auth);

  const map: Record<string, string> = {};

  // TaskRouter workspace and subresources
  try {
    const wsRes = await taskrouter.get(`/Workspaces`, { params: { PageSize: 100 } });
    const workspaces = arr(wsRes.data?.workspaces || wsRes.data?.data || Object.values(wsRes.data).find(Array.isArray));
    const ws = workspaces?.[0];
    if (ws?.sid) map[ws.sid] = pickName(ws);
    if (ws?.sid) {
      const [tqRes, wfRes, actRes, chRes] = await Promise.all([
        taskrouter.get(`/Workspaces/${encodeURIComponent(ws.sid)}/TaskQueues`, { params: { PageSize: 1000 } }),
        taskrouter.get(`/Workspaces/${encodeURIComponent(ws.sid)}/Workflows`, { params: { PageSize: 1000 } }),
        taskrouter.get(`/Workspaces/${encodeURIComponent(ws.sid)}/Activities`, { params: { PageSize: 1000 } }),
        taskrouter.get(`/Workspaces/${encodeURIComponent(ws.sid)}/TaskChannels`, { params: { PageSize: 1000 } })
      ]);
      for (const q of arr(tqRes.data?.task_queues || tqRes.data?.data || Object.values(tqRes.data).find(Array.isArray))) map[q.sid] = pickName(q);
      for (const w of arr(wfRes.data?.workflows || wfRes.data?.data || Object.values(wfRes.data).find(Array.isArray))) map[w.sid] = pickName(w);
      for (const a of arr(actRes.data?.activities || actRes.data?.data || Object.values(actRes.data).find(Array.isArray))) map[a.sid] = pickName(a);
      for (const c of arr(chRes.data?.task_channels || chRes.data?.data || Object.values(chRes.data).find(Array.isArray))) map[c.sid] = pickName(c);
    }
  } catch {}

  // Serverless services/environments/functions
  try {
    const svRes = await serverless.get(`/Services`, { params: { PageSize: 100 } });
    const services = arr(svRes.data?.services || svRes.data?.data || Object.values(svRes.data).find(Array.isArray));
    for (const s of services) map[s.sid] = pickName(s);
    for (const s of services) map[s.domain_base.toLowerCase()] = pickChildName(s, { friendly_name: "domain" });
    for (const s of services) {
      const [envRes, fnRes] = await Promise.all([
        serverless.get(`/Services/${encodeURIComponent(s.sid)}/Environments`, { params: { PageSize: 100 } }),
        serverless.get(`/Services/${encodeURIComponent(s.sid)}/Functions`, { params: { PageSize: 100 } })
      ]);
      for (const e of arr(envRes.data?.environments || envRes.data?.data || Object.values(envRes.data).find(Array.isArray))) map[e.sid] = pickChildName(s, e);
      for (const f of arr(fnRes.data?.functions || fnRes.data?.data || Object.values(fnRes.data).find(Array.isArray))) map[f.sid] = pickChildName(s, f);
    }
  } catch(err) {
    console.error("Erro ao buscar dados do Serverless:", err);
  }

  // Content templates
  try {
    const ctRes = await content.get(`/Content`, { params: { PageSize: 1000 } }).catch(async () => content.get(`/Templates`, { params: { PageSize: 1000 } }));
    const templates = arr(ctRes.data?.contents || ctRes.data?.templates || ctRes.data?.data || Object.values(ctRes.data).find(Array.isArray));
    for (const t of templates) {
      const sid = t.sid || t.id; if (sid) map[sid] = pickName(t);
    }
  } catch {}

  // Studio flows
  try {
    const flRes = await studio.get(`/Flows`, { params: { PageSize: 1000 } });
    for (const f of arr(flRes.data?.flows || flRes.data?.data || Object.values(flRes.data).find(Array.isArray))) map[f.sid] = pickName(f);
  } catch {}

  return map;
};

export const writeSidFriendlyMap = async (map: Record<string, string>) => {
  const base = outDir(); ensureDir(base);
  const filePath = mapFilePath();
  fs.writeFileSync(filePath, JSON.stringify(map, null, 2), "utf-8");
  return filePath;
};

export const readSidFriendlyMap = async (): Promise<Record<string, string>> => {
  try {
    const raw = fs.readFileSync(mapFilePath(), "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
};
