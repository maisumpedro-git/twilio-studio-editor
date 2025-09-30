import type { FlowSummary, TwilioFlowDefinition } from "../shared";
import { buildFlowFileName, resolveFlowPath, writeFlowFile, listFlowSummaries } from "./fsService";
import { listFlows, fetchFlow, validateFlowViaApi, updateFlow } from "./twilioApiService";
import { generateMappings } from "./mappingService";

const parseJson = <T>(input: string): T | undefined => {
  try {
    return JSON.parse(input) as T;
  } catch (error) {
    console.error("Failed to parse JSON output", error);
    return undefined;
  }
};

export const downloadAllFlows = async () => {
  try {
    // First, generate mapping file for the current env to aid migration workflows
    try { await generateMappings(); } catch {}

    const flows = await listFlows();
    for (const f of flows) {
      if (!f.sid) continue;
      try {
        const detailed = await fetchFlow(f.sid);
        if (!detailed) continue;
        const fileName = buildFlowFileName(detailed.friendlyName, detailed.sid);
        const filePath = resolveFlowPath(fileName);
        await writeFlowFile(filePath, detailed);
      } catch (e) {
        console.error(`Failed to fetch flow ${f.sid}`, e);
      }
    }
    const summaries = await listFlowSummaries();
    return { success: true, message: `Downloaded ${summaries.length} flows`, flows: summaries };
  } catch (error) {
    return { success: false, message: (error as Error).message || "Unable to download flows", flows: [] as FlowSummary[] };
  }
};

export const validateFlow = async (flow: TwilioFlowDefinition) => {
  return validateFlowViaApi(flow);
};

export const publishFlow = async (flow: TwilioFlowDefinition) => {
  return updateFlow(flow);
};

export const saveFlowLocally = async (flow: TwilioFlowDefinition) => {
  const fileName = buildFlowFileName(flow.friendlyName, flow.sid);
  const filePath = resolveFlowPath(fileName);
  return writeFlowFile(filePath, flow);
};
