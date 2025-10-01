import type { FlowSummary, TwilioFlowDefinition } from "../shared";
import { buildFlowFileName, resolveFlowPath, writeFlowFile, listFlowSummaries } from "./fsService";
import { listFlows, fetchFlow, validateFlowViaApi, updateFlow } from "./twilioApiService";

export const downloadAllFlows = async () => {
  try {
    const flows = await listFlows();
    for (const f of flows) {
      if (!f.sid) continue;
      try {
        const detailed = await fetchFlow(f.sid);
        if (!detailed) continue;
        const fileName = buildFlowFileName(detailed.friendlyName);
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
  const fileName = buildFlowFileName(flow.friendlyName);
  const filePath = resolveFlowPath(fileName);
  return writeFlowFile(filePath, flow);
};
