import fs from "fs";
import path from "path";
import { getWorkspaceRoot } from "./constants";

export type EnvVars = Record<string, string>;

const parseLine = (line: string): [string, string] | null => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const eq = trimmed.indexOf("=");
  if (eq <= 0) return null;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return [key, value];
};

export const readWorkspaceEnv = (): EnvVars => {
  const root = getWorkspaceRoot();
  const envPath = path.join(root, ".env");
  const out: EnvVars = {};
  try {
    const raw = fs.readFileSync(envPath, "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const kv = parseLine(line);
      if (kv) out[kv[0]] = kv[1];
    }
  } catch {
    // no .env in workspace
  }
  return out;
};

export type TwilioConfig = {
  accountSid: string;
  authToken: string;
  region?: string;
  edge?: string;
  studioBaseUrl: string; // e.g. https://studio.twilio.com
  coreApiBaseUrl: string; // e.g. https://api.twilio.com
  messagingBaseUrl: string; // e.g. https://messaging.twilio.com
  verifyBaseUrl: string; // e.g. https://verify.twilio.com
  envName: string; // dev|qa|prod or fallback
};

export const getTwilioConfig = (override?: EnvVars): TwilioConfig => {
  const env = { ...readWorkspaceEnv(), ...(override || {}) };
  const accountSid = env.TWILIO_ACCOUNT_SID || env.ACCOUNT_SID || "";
  const authToken = env.TWILIO_AUTH_TOKEN || env.AUTH_TOKEN || "";
  const region = env.TWILIO_REGION || env.REGION;
  const edge = env.TWILIO_EDGE || env.EDGE;

  // Base URLs – support custom overrides if present
  const studioBaseUrl = (env.TWILIO_STUDIO_BASE_URL || "https://studio.twilio.com").replace(/\/$/, "");
  const coreApiBaseUrl = (env.TWILIO_API_BASE_URL || "https://api.twilio.com").replace(/\/$/, "");
  const messagingBaseUrl = (env.TWILIO_MESSAGING_BASE_URL || "https://messaging.twilio.com").replace(/\/$/, "");
  const verifyBaseUrl = (env.TWILIO_VERIFY_BASE_URL || "https://verify.twilio.com").replace(/\/$/, "");

  // Infer environment tag for mapping file naming
  const envName = (env.TSE_ENV || env.ENV || env.NODE_ENV || "dev").toLowerCase();

  return { accountSid, authToken, region, edge, studioBaseUrl, coreApiBaseUrl, messagingBaseUrl, verifyBaseUrl, envName };
};
