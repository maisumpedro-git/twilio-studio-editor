import fs from "fs";
import path from "path";
import { getWorkspaceRoot } from "./constants";
import { getTwilioConfig } from "./envService";
import { readSidFriendlyMap } from "./accountDataService";

export type ProductMapping = Record<string, Record<string, string>>; // { product: { tokenKey: actualValue } }

const writeJson = (absPath: string, data: any) => {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, JSON.stringify(data, null, 2));
};

export const buildMappingFileName = (envName: string) => `mapping-${envName}.json`;

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

const SID_REGEX = /^[A-Z]{2}[A-Za-z0-9]{32}$/;

const tryTransformValue = (
  value: string,
  devFriendly: Record<string, string>,
  targetFriendly: Record<string, string>
): string => {
  // If it's a SID: map SID->friendly in dev, then friendly->SID in target
  if (SID_REGEX.test(value)) {
    const friendly = devFriendly[value];
    if (friendly) {
      const targetSid = Object.entries(targetFriendly).find(([, name]) => name === friendly)?.[0];
      return targetSid || value;
    }
    return value;
  }
  // If it's a URL: attempt hostname replacement via friendly domain entry
  if (/^https?:\/\//i.test(value)) {
    try {
      const u = new URL(value);
      const hostLower = u.hostname.toLowerCase();
      const friendly = devFriendly[hostLower]; // we store domain_base keys in lowercase
      if (friendly) {
        const targetDomain = Object.entries(targetFriendly).find(([, name]) => name === friendly)?.[0];
        if (targetDomain) {
          const rebuilt = `${u.protocol}//${targetDomain}${u.port ? ":" + u.port : ""}${u.pathname}${u.search}${u.hash}`;
          return rebuilt;
        }
      }
    } catch {}
    return value;
  }
  return value;
};

export const generateMappingFromFriendly = async (
  targetEnvName: string,
  targetSidFriendly: Record<string, string>,
  baseEnvName = "dev",
  devSidFriendly?: Record<string, string>
): Promise<{ path: string }> => {
  const root = getWorkspaceRoot();
  const scriptsDir = path.join(root, "scripts");
  const baseFile = path.join(scriptsDir, buildMappingFileName(baseEnvName));
  let base: ProductMapping = {};
  try { base = JSON.parse(fs.readFileSync(baseFile, "utf-8")) as ProductMapping; } catch {}
  const devFriendly = devSidFriendly || (await readSidFriendlyMap());

  const out: ProductMapping = {};
  for (const product of Object.keys(base)) {
    const bag = base[product] || {};
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(bag)) {
      if (typeof value === "string") {
        next[key] = tryTransformValue(value, devFriendly, targetSidFriendly);
      } else {
        next[key] = value as any;
      }
    }
    out[product] = next;
  }

  const outFile = path.join(scriptsDir, buildMappingFileName(targetEnvName));
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2));
  return { path: outFile };
};
