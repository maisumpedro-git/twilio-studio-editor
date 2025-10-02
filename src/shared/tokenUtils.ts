import type { TwilioFlowDefinition } from "./types";

const VAR_TOKEN_REGEX = /\$\{tse\.vars\.([a-zA-Z0-9_\-\.]+)\}/g;

export const findTokensInText = (text: string): string[] => {
  const out = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = VAR_TOKEN_REGEX.exec(text)) != null) {
    if (m[1]) out.add(m[1]);
  }
  return Array.from(out);
};

export const collectFlowTokens = (flow: TwilioFlowDefinition): string[] => {
  const json = JSON.stringify(flow);
  return findTokensInText(json);
};

export const substituteTokens = (obj: any, values: Record<string, string>): any => {
  if (Array.isArray(obj)) return obj.map((v) => substituteTokens(v, values));
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(obj)) out[k] = substituteTokens((obj as any)[k], values);
    return out;
  }
  if (typeof obj === "string") {
    return obj.replace(VAR_TOKEN_REGEX, (_m, p1) => (p1 in values ? values[p1] : _m));
  }
  return obj;
};
