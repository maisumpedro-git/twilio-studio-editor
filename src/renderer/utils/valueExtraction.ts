export type ValueCandidate = {
  path: string; // JSON path like $.states[0].properties.key
  key?: string;
  value: string;
};

export const collectStringValuesWithPath = (
  obj: any,
  basePath = "$",
  out: ValueCandidate[] = [],
  currentKey?: string
): ValueCandidate[] => {
  if (obj == null) return out;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      collectStringValuesWithPath(obj[i], `${basePath}[${i}]`, out, currentKey);
    }
    return out;
  }
  if (typeof obj === "object") {
    for (const k of Object.keys(obj)) {
      collectStringValuesWithPath(obj[k], `${basePath}.${k}`, out, k);
    }
    return out;
  }
  if (typeof obj === "string") {
    out.push({ path: basePath, key: currentKey, value: obj });
  }
  return out;
};

export const isTokenString = (s: string) => /^\$\{tse\.vars\.[^}]+\}$/.test(s);

export const isInterestingValue = (s: string): boolean => {
  if (!s) return false;
  if (isTokenString(s)) return false;
  if (/^\s*$/.test(s)) return false;
  // Heuristics: SIDs, URLs, phone numbers, or strings with at least 4 visible chars
  if (/^(AC|WK|WS|MG|VA|WW|TC|FW|ZE|ZH|ZS|HX)[A-Za-z0-9]{32}$/.test(s)) return true;
  if (/^https?:\/\//.test(s)) return true;
  return false;
};

export const replaceValuesWithTokens = (obj: any, valueToVarName: Record<string, string>): any => {
  if (Array.isArray(obj)) return obj.map((v) => replaceValuesWithTokens(v, valueToVarName));
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj)) out[k] = replaceValuesWithTokens((obj as any)[k], valueToVarName);
    return out;
  }
  if (typeof obj === "string") {
    // Exact value replacement first
    if (valueToVarName[obj]) {
      return `\${tse.vars.${valueToVarName[obj]}}`.replace(/^\\/, "$");
    }
    // If the string looks like a URL, attempt hostname-only substitution
    if (/^https?:\/\//i.test(obj)) {
      try {
        const u = new URL(obj);
        const host = u.hostname.replace('.twil.io', '');
        if (valueToVarName[host]) {
          const token = `\${tse.vars.${valueToVarName[host]}}`.replace(/^\\/, "$");
          const rebuilt = obj.replace(host, token);
          return rebuilt;
        }
      } catch {}
    }
  }
  return obj;
};

export const suggestVarName = (value: string): string => {
  if (/^https?:\/\//.test(value)) {
    try {
      const u = new URL(value);
      const host = u.hostname.replace(/[^a-zA-Z0-9]/g, " ").split(" ").map(cap).join("");
      return `${host}Url`;
    } catch {}
    return "ExternalUrl";
  }
  if (/^[A-Z]{2}[A-Za-z0-9]{32}$/.test(value)) return "TwilioSid";
  return "ValueVar";
};

const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);
