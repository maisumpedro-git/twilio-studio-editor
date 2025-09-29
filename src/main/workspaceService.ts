import fs from "fs";
import path from "path";
import { getWorkspaceRoot } from "./constants";

export type EnvFileInfo = { name: string; path: string };

export const listEnvFiles = (): EnvFileInfo[] => {
  const root = getWorkspaceRoot();
  try {
    const files = fs.readdirSync(root);
    return files
      .filter((f) => f === ".env" || f.startsWith(".env."))
      .map((f) => ({ name: f, path: path.join(root, f) }));
  } catch {
    return [];
  }
};

export const setActiveEnv = (envFileName: string) => {
  const root = getWorkspaceRoot();
  const src = path.join(root, envFileName);
  const dst = path.join(root, ".env");
  if (!fs.existsSync(src)) throw new Error(`Env file not found: ${envFileName}`);
  fs.copyFileSync(src, dst);
  return { success: true } as const;
};

export const ensureMigrationTemplate = () => {
  const root = getWorkspaceRoot();
  const scriptPath = path.join(root, "migration.template.js");
  if (!fs.existsSync(scriptPath)) {
    const content = [
      "// Migration template: replace values in JSON flows with token format: '${tse.vars.var_name}'.",
      "// Reads mapping-<env>.json files to gather variables.",
      "// Usage (Node): node migration.template.js <flowsDir> <env>",
      "const fs = require('fs');",
      "const path = require('path');",
      "",
      "function loadMapping(root, env) {",
      "  const file = path.join(",
      "    root,",
      "    env === 'dev' ? 'mapping-dev.json' : env === 'qa' ? 'mapping-qa.json' : 'mapping-prod.json'",
      "  );",
      "  if (!fs.existsSync(file)) return {};",
      "  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return {}; }",
      "}",
      "",
      "function walk(dir, out = []) {",
      "  const entries = fs.readdirSync(dir, { withFileTypes: true });",
      "  for (const e of entries) {",
      "    const p = path.join(dir, e.name);",
      "    if (e.isDirectory()) walk(p, out); else if (e.isFile() && p.endsWith('.json')) out.push(p);",
      "  }",
      "  return out;",
      "}",
      "",
      "function toToken(key) { return '${tse.vars.' + key + '}'; }",
      "",
      "function replaceAllValues(obj, mapping) {",
      "  if (Array.isArray(obj)) return obj.map((v) => replaceAllValues(v, mapping));",
      "  if (obj && typeof obj === 'object') {",
      "    const out = Array.isArray(obj) ? [] : {};",
      "    for (const k of Object.keys(obj)) {",
      "      out[k] = replaceAllValues(obj[k], mapping);",
      "    }",
      "    return out;",
      "  }",
      "  const val = String(obj);",
      "  const key = mapping[val];",
      "  return key ? toToken(key) : obj;",
      "}",
      "",
      "function main() {",
      "  const flowsDir = process.argv[2] || process.cwd();",
      "  const env = (process.argv[3] || 'dev').toLowerCase();",
      "  const mappingByProduct = loadMapping(process.cwd(), env);",
      "  const mapping = Object.values(mappingByProduct).reduce((acc, product) => Object.assign(acc, product || {}), {});",
      "  const files = walk(flowsDir);",
      "  for (const f of files) {",
      "    try {",
      "      const json = JSON.parse(fs.readFileSync(f, 'utf-8'));",
      "      const replaced = replaceAllValues(json, mapping);",
      "      fs.writeFileSync(f, JSON.stringify(replaced, null, 2));",
      "      console.log('Migrated', f);",
      "    } catch (e) {",
      "      console.warn('Skip', f, e && e.message ? e.message : 'unknown error');",
      "    }",
      "  }",
      "}",
      "",
      "if (require.main === module) main();",
      ""
    ].join("\n");
    fs.writeFileSync(scriptPath, content);
  }
  return { path: scriptPath } as const;
};
