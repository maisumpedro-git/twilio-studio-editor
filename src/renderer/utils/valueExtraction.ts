export type ValueCandidate = {
  path: string; // JSON path like $.states[0].properties.key
  key?: string;
  value: string;
};

export const collectStringValuesWithPath = (obj: any, basePath = "$", out: ValueCandidate[] = []): ValueCandidate[] => {
  if (obj == null) return out;
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      collectStringValuesWithPath(obj[i], `${basePath}[${i}]`, out);
    }
    return out;
  }
  if (typeof obj === "object") {
    for (const k of Object.keys(obj)) {
      collectStringValuesWithPath(obj[k], `${basePath}.${k}`, out);
    }
    return out;
  }
  if (typeof obj === "string") {
    out.push({ path: basePath, value: obj });
  }
  return out;
};

export const isTokenString = (s: string) => /^\$\{tse\.vars\.[^}]+\}$/.test(s);

export const isInterestingValue = (s: string): boolean => {
  if (!s) return false;
  if (isTokenString(s)) return false;
  if (/^\s*$/.test(s)) return false;
  // Heuristics: SIDs, URLs, phone numbers, or strings with at least 4 visible chars
  if (/^(AC|WK|WS|MG|VA)[A-Za-z0-9]{32}$/.test(s)) return true;
  if (/^https?:\/\//.test(s)) return true;
  if (/^\+\d{10,15}$/.test(s)) return true;
  if (s.replace(/\s+/g, "").length >= 4) return true;
  return false;
};

export const replaceValuesWithTokens = (obj: any, valueToVarName: Record<string, string>): any => {
  if (Array.isArray(obj)) return obj.map((v) => replaceValuesWithTokens(v, valueToVarName));
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj)) out[k] = replaceValuesWithTokens((obj as any)[k], valueToVarName);
    return out;
  }
  if (typeof obj === "string" && valueToVarName[obj]) {
    return `\${tse.vars.${valueToVarName[obj]}}`.replace(/^\\/, "$"); // ensure proper ${}
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
  if (/^\+\d{10,15}$/.test(value)) return "PhoneNumber";
  if (/^[A-Z]{2}[A-Za-z0-9]{32}$/.test(value)) return "TwilioSid";
  if (/^[0-9a-f]{32}$/i.test(value)) return "HashValue";
  if (value.length < 32) return cap(value.replace(/[^a-zA-Z0-9]/g, " ").split(" ").slice(0, 4).map(cap).join(""));
  return "ValueVar";
};

const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s);
