import type { FlowSummary, TwilioFlowDefinition } from "../shared";
import { buildFlowFileName, resolveFlowPath, writeFlowFile, listFlowSummaries } from "./fsService";
import { executeTwilioCLI, withTempFlowFile } from "./twilioCli";

const parseJson = <T>(input: string): T | undefined => {
  try {
    return JSON.parse(input) as T;
  } catch (error) {
    console.error("Failed to parse Twilio CLI output", error);
    return undefined;
  }
};

export const downloadAllFlows = async () => {
  // Try to fetch as many flows as possible in one call (Twilio CLI supports --limit)
  const result = await executeTwilioCLI([
    "api:studio:v2:flows:list",
    "--limit",
    process.env.TWILIO_CLI_LIST_LIMIT || "1000",
    "-o",
    "json"
  ]);
  if (!result.success) {
    return {
      success: false,
      message: result.stderr || "Unable to download flows",
      flows: [] as FlowSummary[]
    };
  }

  const parsed = parseJson<
    { flows?: TwilioFlowDefinition[]; data?: TwilioFlowDefinition[] } | TwilioFlowDefinition[]
  >(result.stdout);
  // Twilio CLI may return either a top-level array or an object with `flows` or `data`
  const flowsArray = Array.isArray(parsed)
    ? parsed
    : parsed?.flows || parsed?.data || [];

  for (const flow of flowsArray) {
    if (!flow.sid) {
      continue;
    }
    const fetchResult = await executeTwilioCLI([
      "api:studio:v2:flows:fetch",
      "--sid",
      flow.sid,
      "-o",
      "json"
    ]);
    if (!fetchResult.success) {
      console.error(`Failed to fetch flow ${flow.sid}`, fetchResult.stderr);
      continue;
    }

    const detailed = parseJson<TwilioFlowDefinition[]>(fetchResult.stdout)?.[0];
    if (!detailed) {
      continue;
    }

    const fileName = buildFlowFileName(detailed.friendlyName, detailed.sid);
    const filePath = resolveFlowPath(fileName);
    await writeFlowFile(filePath, detailed);
  }

  const summaries = await listFlowSummaries();
  return {
    success: true,
    message: `Downloaded ${summaries.length} flows`,
    flows: summaries
  };
};

export const validateFlow = async (flow: TwilioFlowDefinition) => {
  const payload = JSON.stringify(flow, null, 2);
  const temp = await withTempFlowFile(payload);
  try {
    const result = await executeTwilioCLI([
      "api:studio:v2:flows:validate",
      "--definition",
      `@${temp.path}`,
      "-o",
      "json"
    ]);
    return result;
  } finally {
    await temp.cleanup();
  }
};

export const publishFlow = async (flow: TwilioFlowDefinition) => {
  const payload = JSON.stringify(flow, null, 2);
  const temp = await withTempFlowFile(payload);
  try {
    if (!flow.sid) {
      throw new Error("Flow SID is required to publish");
    }
    const result = await executeTwilioCLI([
      "api:studio:v2:flows:update",
      "--sid",
      flow.sid,
      "--definition",
      `@${temp.path}`,
      "-o",
      "json"
    ]);
    return result;
  } finally {
    await temp.cleanup();
  }
};

export const saveFlowLocally = async (flow: TwilioFlowDefinition) => {
  const fileName = buildFlowFileName(flow.friendlyName, flow.sid);
  const filePath = resolveFlowPath(fileName);
  return writeFlowFile(filePath, flow);
};
