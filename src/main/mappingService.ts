import fs from "fs";
import path from "path";
import axios from "axios";
import { getWorkspaceRoot } from "./constants";
import { getTwilioConfig } from "./envService";

export type ProductMapping = Record<string, Record<string, string>>; // { product: { tokenKey: actualValue } }

const writeJson = (absPath: string, data: any) => {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, JSON.stringify(data, null, 2));
};

export const buildMappingFileName = (envName: string) => `mapping-${envName}.json`;

export const generateMappings = async (): Promise<{ path: string; products: string[] }> => {
  const cfg = getTwilioConfig();
  const root = getWorkspaceRoot();
  const products: ProductMapping = {};

  const auth = { username: cfg.accountSid, password: cfg.authToken } as const;

  // Messaging Service IDs -> map by friendly name and SID
  try {
    const res = await axios.get(`${cfg.messagingBaseUrl}/v1/Services`, { auth, params: { PageSize: 1000 } });
    const services: any[] = res.data?.services || res.data?.data || [];
    products.messaging = {};
    for (const s of services) {
      if (s.sid) products.messaging[s.friendly_name || s.sid] = s.sid;
    }
  } catch {}

  // Verify Services
  try {
    const res = await axios.get(`${cfg.verifyBaseUrl}/v2/Services`, { auth, params: { PageSize: 1000 } });
    const services: any[] = res.data?.services || res.data?.data || [];
    products.verify = {};
    for (const s of services) {
      if (s.sid) products.verify[s.friendly_name || s.sid] = s.sid;
    }
  } catch {}

  // Phone Numbers (Incoming) via Core API
  try {
    const res = await axios.get(`${cfg.coreApiBaseUrl}/2010-04-01/Accounts/${cfg.accountSid}/IncomingPhoneNumbers.json`, { auth, params: { PageSize: 1000 } });
    const nums: any[] = res.data?.incoming_phone_numbers || res.data?.data || [];
    products.phoneNumbers = {};
    for (const n of nums) {
      const label = n.friendly_name || n.phone_number;
      const value = n.phone_number || n.sid;
      if (label && value) products.phoneNumbers[label] = value;
    }
  } catch {}

  // Write consolidated mapping-<env>.json in scripts/
  const scriptsDir = path.join(root, "scripts");
  fs.mkdirSync(scriptsDir, { recursive: true });
  const fileName = buildMappingFileName(cfg.envName);
  const abs = path.join(scriptsDir, fileName);
  writeJson(abs, products);
  return { path: abs, products: Object.keys(products) };
};

export const readCurrentMapping = (): ProductMapping => {
  const cfg = getTwilioConfig();
  const root = getWorkspaceRoot();
  const scriptsDir = path.join(root, "scripts");
  const fileName = buildMappingFileName(cfg.envName);
  const abs = path.join(scriptsDir, fileName);
  try {
    const raw = fs.readFileSync(abs, "utf-8");
    return JSON.parse(raw) as ProductMapping;
  } catch {
    return {} as ProductMapping;
  }
};

export const flattenMapping = (m: ProductMapping): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const product of Object.keys(m || {})) {
    const bag = m[product] || {};
    for (const k of Object.keys(bag)) {
      out[k] = bag[k];
    }
  }
  return out;
};

export const upsertMapping = (entries: Record<string, string>): { path: string; added: number; updated: number } => {
  const cfg = getTwilioConfig();
  const root = getWorkspaceRoot();
  const scriptsDir = path.join(root, "scripts");
  fs.mkdirSync(scriptsDir, { recursive: true });
  const fileName = buildMappingFileName(cfg.envName);
  const abs = path.join(scriptsDir, fileName);
  let current: ProductMapping = {};
  try {
    current = JSON.parse(fs.readFileSync(abs, "utf-8")) as ProductMapping;
  } catch {}
  if (!current.custom) current.custom = {};
  let added = 0;
  let updated = 0;
  // Avoid duplicating by value: if some existing var already maps to this value, prefer that existing var.
  const currentFlat = flattenMapping(current);
  for (const [name, value] of Object.entries(entries)) {
    const existingName = Object.keys(currentFlat).find((k) => currentFlat[k] === value);
    if (existingName && existingName !== name) {
      // Skip creating a new var with a different name for the same value
      continue;
    }
    if (current.custom[name] == null) {
      current.custom[name] = value;
      added += 1;
    } else if (current.custom[name] !== value) {
      current.custom[name] = value;
      updated += 1;
    }
  }
  fs.writeFileSync(abs, JSON.stringify(current, null, 2));
  return { path: abs, added, updated };
};
