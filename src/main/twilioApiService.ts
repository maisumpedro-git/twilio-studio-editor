import axios, { AxiosInstance } from "axios";
import type { TwilioFlowDefinition } from "../shared";
import { getTwilioConfig } from "./envService";

type ApiClient = {
  core: AxiosInstance; // api.twilio.com
  studio: AxiosInstance; // studio.twilio.com
};

const createClient = (): ApiClient => {
  const cfg = getTwilioConfig();
  if (!cfg.accountSid || !cfg.authToken) {
    throw new Error("Credenciais ausentes. Configure TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN no .env do workspace.");
  }
  const auth = { username: cfg.accountSid, password: cfg.authToken };

  const core = axios.create({ baseURL: `${cfg.coreApiBaseUrl}/2010-04-01/Accounts/${cfg.accountSid}`, auth });
  const studio = axios.create({ baseURL: `${cfg.studioBaseUrl}/v2`, auth });

  // Basic error interceptor to present Twilio errors
  for (const client of [core, studio]) {
    client.interceptors.response.use(
      (r) => r,
      (error) => {
        const data = error?.response?.data;
        const detail = data?.message || data?.detail || error.message;
        return Promise.reject(new Error(detail));
      }
    );
  }

  return { core, studio };
};

const transformFlow = (api: any): TwilioFlowDefinition => {
  let definition = api.definition;
  if (typeof definition === "string") {
    try { definition = JSON.parse(definition); } catch {}
  }
  return {
    sid: api.sid,
    friendlyName: api.friendly_name ?? api.friendlyName ?? "",
    definition,
  } as TwilioFlowDefinition;
};

export const listFlows = async (): Promise<TwilioFlowDefinition[]> => {
  const { studio } = createClient();
  // GET /v2/Flows returns { flows: [...] }
  const res = await studio.get("/Flows", { params: { PageSize: 1000 } });
  const flows = (res.data?.flows || res.data?.data || []) as any[];
  return flows.map((f) => transformFlow(f));
};

export const fetchFlow = async (sid: string): Promise<TwilioFlowDefinition | undefined> => {
  const { studio } = createClient();
  const res = await studio.get(`/Flows/${encodeURIComponent(sid)}`);
  // Twilio API returns a single object
  return transformFlow(res.data);
};

export type ValidationResult = {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number | null;
};

// There is no public "validate" endpoint separate from update; mimic CLI validate by calling the validator endpoint if available.
// Fallback: perform a dry-run by calling the Update with Validate=true on a copy, or use local schema checks if necessary.
export const validateFlowViaApi = async (flow: TwilioFlowDefinition): Promise<ValidationResult> => {
  const { studio } = createClient();
  try {
    // Preferred: POST form-encoded to /v2/Flows/Validate with Definition
    const form = new URLSearchParams();
    form.set("Definition", JSON.stringify(flow.definition));
    const res = await studio.post(`/Flows/Validate`, form, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    return { success: true, stdout: JSON.stringify(res.data), stderr: "", exitCode: 0 };
  } catch (error) {
    // Fallback: attempt update with ValidationOnly if available
    try {
      if (!flow.sid) throw new Error("Flow SID required for validation fallback");
      const form = new URLSearchParams();
      form.set("Definition", JSON.stringify(flow.definition));
      form.set("Status", "published");
      if (flow.friendlyName) form.set("FriendlyName", flow.friendlyName);
      const res = await studio.post(`/Flows/Validate`, form, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });
      return { success: true, stdout: JSON.stringify(res.data), stderr: "", exitCode: 0 };
    } catch (e2) {
      return { success: false, stdout: "", stderr: (e2 as Error).message, exitCode: 1 };
    }
  }
};

export const updateFlow = async (flow: TwilioFlowDefinition): Promise<ValidationResult> => {
  if (!flow.sid) return { success: false, stdout: "", stderr: "Flow SID is required to publish", exitCode: 1 };
  const { studio } = createClient();
  try {
    const form = new URLSearchParams();
    form.set("Definition", JSON.stringify(flow.definition));
    if (flow.friendlyName) form.set("FriendlyName", flow.friendlyName);
    form.set("CommitMessage", "Atualização via Twilio Studio Editor");
    form.set("Status", "published");
    const res = await studio.post(`/Flows/${encodeURIComponent(flow.sid)}`, form, { headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    return { success: true, stdout: JSON.stringify(res.data), stderr: "", exitCode: 0 };
  } catch (error) {
    return { success: false, stdout: "", stderr: (error as Error).message, exitCode: 1 };
  }
};
