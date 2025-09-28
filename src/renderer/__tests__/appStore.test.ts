/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAppStore } from "../modules/state/appStore";
import type { FlowFile, FlowSearchMatch, TwilioFlowDefinition } from "../../shared/types/flow";

type TwilioStudioAPI = {
  getAppVersion: () => string;
  listFlows: () => Promise<any[]>;
  openFlow: (filePath: string) => Promise<FlowFile>;
  saveFlow: (filePath: string, flow: TwilioFlowDefinition) => Promise<FlowFile>;
  deleteFlow: (filePath: string) => Promise<boolean>;
  searchFlows: (term: string) => Promise<FlowSearchMatch[]>;
  resolveFlowPath: (fileName: string) => Promise<string>;
  downloadAllFlows: () => Promise<{ success: boolean; message: string; flows: any[] }>;
  validateFlow: (flow: TwilioFlowDefinition) => Promise<any>;
  publishFlow: (flow: TwilioFlowDefinition) => Promise<any>;
  saveFlowLocally: (flow: TwilioFlowDefinition) => Promise<FlowFile>;
};

const makeFlow = (id: string, name: string): FlowFile => ({
  id,
  fileName: `${name}.json`,
  filePath: `/tmp/${name}.json`,
  updatedAt: Date.now(),
  flow: {
    sid: `FW${id}`,
    friendly_name: name,
    definition: { states: [], initial_state: "Start" }
  } as unknown as TwilioFlowDefinition
});

describe("appStore actions", () => {
  beforeEach(() => {
    // reset store state between tests
    const { getState, setState } = useAppStore;
    const state = getState();
    setState({ ...state, flows: [], documents: {}, activeFlowId: undefined, searchResults: [], isSearching: false });

    // mock API
  const mockApi: TwilioStudioAPI = {
      getAppVersion: () => "0.0.0-test",
      listFlows: vi.fn().mockResolvedValue([
        { id: "1", fileName: "A.json", filePath: "/tmp/A.json", updatedAt: Date.now(), friendlyName: "A", hasSid: true },
        { id: "2", fileName: "B.json", filePath: "/tmp/B.json", updatedAt: Date.now(), friendlyName: "B", hasSid: true }
      ]),
      openFlow: vi.fn().mockImplementation(async (filePath: string) => {
        const name = filePath.split("/").pop()!.replace(".json", "");
        const id = name === "A" ? "1" : "2";
        return makeFlow(id, name);
      }),
      saveFlow: vi.fn().mockImplementation(async (_filePath: string, flow: TwilioFlowDefinition) => {
        return makeFlow("1", flow.friendly_name || "Saved");
      }),
      deleteFlow: vi.fn().mockResolvedValue(true),
      searchFlows: vi.fn().mockResolvedValue([
        { fileId: "1", fileName: "A.json", matchedText: "A", path: "$.friendly_name", line: 2, column: 20, preview: "\"friendly_name\": \"A\"" }
      ] as FlowSearchMatch[]),
      resolveFlowPath: vi.fn().mockResolvedValue("/tmp/A.json"),
      downloadAllFlows: vi.fn().mockResolvedValue({ success: true, message: "ok", flows: [] }),
      validateFlow: vi.fn().mockResolvedValue({ success: true, stdout: "ok" } as any),
      publishFlow: vi.fn().mockResolvedValue({ success: true } as any),
      saveFlowLocally: vi.fn().mockResolvedValue(makeFlow("1", "Local"))
    };
    (window as unknown as { twilioStudio: TwilioStudioAPI }).twilioStudio = mockApi;
  });

  it("refreshFlows loads flows", async () => {
    await useAppStore.getState().refreshFlows();
    const { flows, isFetching } = useAppStore.getState();
    expect(isFetching).toBe(false);
    expect(flows.length).toBe(2);
  });

  it("openFlow loads document and sets activeFlowId", async () => {
    await useAppStore.getState().openFlow("/tmp/A.json");
    const { activeFlowId, documents } = useAppStore.getState();
    expect(activeFlowId).toBe("1");
    expect(documents["1"]).toBeTruthy();
    expect(JSON.parse(documents["1"].json).friendly_name).toBe("A");
  });

  it("performSearch sets results and clears searching", async () => {
    useAppStore.getState().setSearchTerm("A");
    await useAppStore.getState().performSearch("A");
    const { isSearching, searchResults } = useAppStore.getState();
    expect(isSearching).toBe(false);
    expect(searchResults.length).toBe(1);
  });
});

