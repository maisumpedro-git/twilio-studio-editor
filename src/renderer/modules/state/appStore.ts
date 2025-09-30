import { create } from "zustand";
import { devtools } from "zustand/middleware";
import type { StateCreator, StoreApi } from "zustand";

import type {
  FlowFile,
  FlowSearchMatch,
  FlowSummary,
  TwilioFlowDefinition,
  EditorMode,
  SidebarMode
} from "@shared/index";
import { APPLICATION_STATE_BLUEPRINT } from "@shared/appManifest";
import { collectFlowTokens, substituteTokens } from "@shared/tokenUtils";

export type FlowDocument = {
  file: FlowFile;
  json: string;
  isDirty: boolean;
  lastSyncedAt: number;
  validation?: {
    status: "idle" | "success" | "error";
    message?: string;
  };
};

export type ToastMessage = {
  intent: "success" | "error" | "info";
  message: string;
  timestamp: number;
};

type AppState = {
  flows: FlowSummary[];
  documents: Record<string, FlowDocument>;
  activeFlowId?: string;
  openTabs: Array<{ id: string; title: string; filePath: string }>;
  sidebarMode: SidebarMode;
  editorMode: EditorMode;
  isFetching: boolean;
  isSearching: boolean;
  searchTerm: string;
  searchResults: FlowSearchMatch[];
  selectedSearchFlowIds: string[]; // empty means all
  activeWidgetName?: string;
  toast?: ToastMessage;
  selectedSearchMatch?: FlowSearchMatch;
  initialize: () => Promise<void>;
  refreshFlows: () => Promise<void>;
  openFlow: (filePath: string) => Promise<void>;
  openFlowInNewTab: (filePath: string) => Promise<void>;
  closeTab: (id: string) => void;
  downloadAllFlows: () => Promise<void>;
  validateActiveFlow: () => Promise<void>;
  saveActiveFlow: () => Promise<void>;
  publishActiveFlow: () => Promise<void>;
  openPublishReview: () => Promise<void>;
  confirmPublishWithValues: (values: Record<string, string>) => Promise<void>;
  setActiveFlow: (flowId: string) => void;
  updateDocumentJson: (flowId: string, json: string) => void;
  markSaved: (flowId: string, file: FlowFile) => void;
  setSidebarMode: (mode: SidebarMode) => void;
  toggleSidebarMode: () => void;
  setEditorMode: (mode: EditorMode) => void;
  setSearchTerm: (term: string) => void;
  setSearchResults: (results: FlowSearchMatch[]) => void;
  performSearch: (term: string) => Promise<void>;
  setSelectedSearchFlowIds: (ids: string[]) => void;
  toggleSelectedSearchFlowId: (id: string) => void;
  selectAllSearchFlows: () => void;
  clearSelectedSearchFlows: () => void;
  setActiveWidget: (widgetName?: string) => void;
  setActiveSearchMatch: (match?: FlowSearchMatch) => void;
  pushToast: (toast: ToastMessage) => void;
  clearToast: () => void;
  ui: {
    publishReview: {
      open: boolean;
      tokens: string[];
      mapping: Record<string, string>;
      empties: string[];
    };
    rightPanel: {
      open: boolean;
      tab: "variables" | "info";
      flowTokens: string[];
    };
  };
};

const ensureApi = () => {
  if (!window.twilioStudio) {
    throw new Error("Twilio Studio API bridge not available");
  }
  return window.twilioStudio;
};

const parseJson = (json: string): TwilioFlowDefinition => {
  return JSON.parse(json) as TwilioFlowDefinition;
};

const addOrActivateTab = (
  tabs: Array<{ id: string; title: string; filePath: string }>,
  entry: { id: string; title: string; filePath: string }
) => {
  const exists = tabs.some((t) => t.id === entry.id);
  if (exists) return tabs;
  return [...tabs, entry];
};

const appStateCreator: StateCreator<AppState, [["zustand/devtools", never]], [], AppState> = (
  set: StoreApi<AppState>["setState"],
  get: StoreApi<AppState>["getState"]
) => ({
  flows: [],
  documents: {},
  activeFlowId: APPLICATION_STATE_BLUEPRINT.activeFlowId,
  openTabs: [],
  sidebarMode: APPLICATION_STATE_BLUEPRINT.sidebarMode,
  editorMode: APPLICATION_STATE_BLUEPRINT.editorMode,
  isFetching: APPLICATION_STATE_BLUEPRINT.isFetching,
  isSearching: APPLICATION_STATE_BLUEPRINT.isSearching ?? false,
  searchTerm: APPLICATION_STATE_BLUEPRINT.globalSearchTerm,
  searchResults: [],
  selectedSearchFlowIds: [],
  activeWidgetName: APPLICATION_STATE_BLUEPRINT.activeWidgetName,
  toast: undefined,
  selectedSearchMatch: undefined,
  ui: {
    publishReview: { open: false, tokens: [], mapping: {}, empties: [] },
    rightPanel: { open: false, tab: "variables", flowTokens: [] }
  },

  initialize: async () => {
    await get().refreshFlows();
    const { flows } = get();
    if (flows.length > 0) {
      await get().openFlow(flows[0].filePath);
    }
  },

  refreshFlows: async () => {
    const api = ensureApi();
    set({ isFetching: true });
    try {
  const flows = await api.listFlows();
  set({ flows, isFetching: false, selectedSearchMatch: undefined });
    } catch (error) {
      console.error("Failed to list flows", error);
      set({ isFetching: false });
      get().pushToast({
        intent: "error",
        message: "Não foi possível carregar os fluxos. Verifique as credenciais no .env.",
        timestamp: Date.now()
      });
    }
  },

  openFlow: async (filePath: string) => {
    const api = ensureApi();
    try {
      const file = await api.openFlow(filePath);
      const json = JSON.stringify(file.flow, null, 2);
      const document: FlowDocument = {
        file,
        json,
        isDirty: false,
        lastSyncedAt: Date.now(),
        validation: { status: "idle" }
      };

      set((state: AppState) => ({
        documents: { ...state.documents, [file.id]: document },
        activeFlowId: file.id,
        openTabs: addOrActivateTab(state.openTabs, { id: file.id, title: file.flow.friendlyName || file.id, filePath: file.filePath }),
        flows: state.flows.map((summary: FlowSummary) =>
          summary.id === file.id
            ? {
                ...summary,
                updatedAt: file.updatedAt,
                friendlyName: file.flow.friendlyName ?? summary.friendlyName,
                hasSid: Boolean(file.flow.sid),
                sid: file.flow.sid ?? summary.sid
              }
            : summary
        ),
        ui: {
          ...state.ui,
          rightPanel: {
            ...state.ui.rightPanel,
            open: true,
            flowTokens: collectFlowTokens(file.flow)
          }
        }
      }));
    } catch (error) {
      console.error(`Failed to open flow ${filePath}`, error);
      get().pushToast({
        intent: "error",
        message: "Erro ao abrir o fluxo selecionado.",
        timestamp: Date.now()
      });
    }
  },

  openFlowInNewTab: async (filePath: string) => {
    // For now, same behavior as openFlow but ensures a new tab entry exists
    await get().openFlow(filePath);
  },

  closeTab: (id: string) => {
    set((state: AppState) => {
      const remaining = state.openTabs.filter((t) => t.id !== id);
      const newActive = state.activeFlowId === id ? remaining[remaining.length - 1]?.id : state.activeFlowId;
      return { openTabs: remaining, activeFlowId: newActive };
    });
  },

  downloadAllFlows: async () => {
    const api = ensureApi();
    set({ isFetching: true });
    try {
      const result = await api.downloadAllFlows();
      set({ flows: result.flows ?? [], isFetching: false });
      get().setActiveSearchMatch(undefined);
      get().pushToast({
        intent: result.success ? "success" : "error",
        message: result.message,
        timestamp: Date.now()
      });
      // Auto-open the most recent flow after download to make graph visible immediately
      if (result.success && (result.flows?.length ?? 0) > 0) {
        const first = result.flows[0];
        await get().openFlow(first.filePath);
      }
    } catch (error) {
      console.error("Failed to download flows", error);
      set({ isFetching: false });
      get().pushToast({
        intent: "error",
        message: "Erro ao baixar fluxos. Verifique as credenciais no .env.",
        timestamp: Date.now()
      });
    }
  },

  validateActiveFlow: async () => {
    const api = ensureApi();
    const document = selectActiveDocument(get());
    if (!document) {
      get().pushToast({
        intent: "info",
        message: "Selecione um fluxo para validar.",
        timestamp: Date.now()
      });
      return;
    }

    try {
      const flow = parseJson(document.json);
      const result = await api.validateFlow(flow);
      get().pushToast({
        intent: result.success ? "success" : "error",
        message: result.success ? "Fluxo válido." : result.stderr || "Falha na validação.",
        timestamp: Date.now()
      });
      set((state: AppState) => ({
        documents: {
          ...state.documents,
          [document.file.id]: {
            ...state.documents[document.file.id],
            validation: {
              status: result.success ? "success" : "error",
              message: result.success ? undefined : result.stderr
            }
          }
        }
      }));
    } catch (error) {
      console.error("Failed to validate flow", error);
      get().pushToast({
        intent: "error",
        message: error instanceof Error ? error.message : "Erro inesperado ao validar fluxo.",
        timestamp: Date.now()
      });
    }
  },

  saveActiveFlow: async () => {
    const api = ensureApi();
    const document = selectActiveDocument(get());
    if (!document) {
      get().pushToast({
        intent: "info",
        message: "Nenhum fluxo ativo para salvar.",
        timestamp: Date.now()
      });
      return;
    }

    try {
      const flow = parseJson(document.json);
      const saved = await api.saveFlow(document.file.filePath, flow);
      get().markSaved(saved.id, saved);
      get().pushToast({
        intent: "success",
        message: "Fluxo salvo com sucesso.",
        timestamp: Date.now()
      });
    } catch (error) {
      console.error("Failed to save flow", error);
      get().pushToast({
        intent: "error",
        message: error instanceof Error ? error.message : "Erro ao salvar fluxo.",
        timestamp: Date.now()
      });
    }
  },

  publishActiveFlow: async () => {
    // Open the publish review modal first
    await get().openPublishReview();
  },

  openPublishReview: async () => {
    const api = ensureApi();
    const document = selectActiveDocument(get());
    if (!document) {
      get().pushToast({
        intent: "info",
        message: "Selecione um fluxo para publicar.",
        timestamp: Date.now()
      });
      return;
    }
    try {
      const flow = parseJson(document.json);
      if (!flow.sid) throw new Error("Flow SID é obrigatório para publicar.");
      const tokens = collectFlowTokens(flow);
      let mapping: Record<string, string> = {};
      try {
        mapping = await api.getMappingFlat();
      } catch {
        mapping = {};
      }
      const empties = tokens.filter((t) => !mapping[t] || String(mapping[t]).trim() === "");
      set((state: AppState) => ({
        ui: { ...state.ui, publishReview: { open: true, tokens, mapping, empties } }
      }));
    } catch (error) {
      console.error("Failed to prepare publish review", error);
      get().pushToast({
        intent: "error",
        message: error instanceof Error ? error.message : "Erro ao preparar revisão de publicação.",
        timestamp: Date.now()
      });
    }
  },

  confirmPublishWithValues: async (values: Record<string, string>) => {
    const api = ensureApi();
    const document = selectActiveDocument(get());
    if (!document) return;
    try {
      const flow = parseJson(document.json);
      if (!flow.sid) throw new Error("Flow SID é obrigatório para publicar.");
      const newDef = substituteTokens(flow.definition, values);
      const toPublish = { ...flow, definition: newDef };
      const result = await api.publishFlow(toPublish);
      get().pushToast({
        intent: result.success ? "success" : "error",
        message: result.success ? "Fluxo publicado com sucesso." : result.stderr || "Falha na publicação.",
        timestamp: Date.now()
      });
      // Close modal
      set((state: AppState) => ({ ui: { ...state.ui, publishReview: { ...state.ui.publishReview, open: false } } }));
      if (result.success) {
        await get().refreshFlows();
      }
    } catch (error) {
      console.error("Failed to publish flow with values", error);
      get().pushToast({
        intent: "error",
        message: error instanceof Error ? error.message : "Erro ao publicar fluxo.",
        timestamp: Date.now()
      });
    }
  },

  setActiveFlow: (flowId: string) => {
    const document = get().documents[flowId];
    if (!document) {
      return;
    }
    set({ activeFlowId: flowId, activeWidgetName: undefined, selectedSearchMatch: undefined });
  },

  updateDocumentJson: (flowId: string, json: string) => {
    set((state: AppState) => {
      const document = state.documents[flowId];
      if (!document) {
  return state;
      }

      let parsed: TwilioFlowDefinition | undefined;
      try {
        parsed = parseJson(json);
      } catch {
        parsed = undefined;
      }

      return {
        ...state,
        documents: {
          ...state.documents,
          [flowId]: {
            ...document,
            json,
            isDirty: true,
            file: parsed ? { ...document.file, flow: parsed } : document.file
          }
        }
      };
    });
  },

  markSaved: (flowId: string, file: FlowFile) => {
    set((state: AppState) => ({
      documents: {
        ...state.documents,
        [flowId]: {
          ...state.documents[flowId],
          file,
          json: JSON.stringify(file.flow, null, 2),
          isDirty: false,
          lastSyncedAt: Date.now()
        }
      },
      flows: state.flows.map((summary: FlowSummary) =>
        summary.id === flowId
          ? {
              ...summary,
              updatedAt: file.updatedAt,
              friendlyName: file.flow.friendlyName ?? summary.friendlyName,
              hasSid: Boolean(file.flow.sid),
              sid: file.flow.sid ?? summary.sid
            }
          : summary
      )
    }));
  },

  setSidebarMode: (mode: SidebarMode) => set({ sidebarMode: mode }),
  toggleSidebarMode: () =>
    set((state: AppState) => ({
      sidebarMode: state.sidebarMode === "explorer" ? "global-search" : "explorer"
    })),
  setEditorMode: (mode: EditorMode) => set({ editorMode: mode }),
  setSearchTerm: (term: string) => set({ searchTerm: term }),
  setSearchResults: (results: FlowSearchMatch[]) => set({ searchResults: results }),
  performSearch: async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) {
      set({ searchResults: [], isSearching: false, selectedSearchMatch: undefined });
      return;
    }

    const api = ensureApi();
  set({ isSearching: true, selectedSearchMatch: undefined });
    try {
      const filterIds = get().selectedSearchFlowIds;
      const results = await api.searchFlows(trimmed, filterIds.length > 0 ? filterIds : undefined);
      if (get().searchTerm.trim() !== trimmed) {
        set({ isSearching: false });
        return;
      }
      set({ searchResults: results, isSearching: false });
    } catch (error) {
      console.error("Failed to search flows", error);
  set({ isSearching: false, selectedSearchMatch: undefined });
      get().pushToast({
        intent: "error",
        message: "Não foi possível buscar nos fluxos.",
        timestamp: Date.now()
      });
    }
  },
  setSelectedSearchFlowIds: (ids: string[]) => set({ selectedSearchFlowIds: ids }),
  toggleSelectedSearchFlowId: (id: string) =>
    set((state: AppState) => {
      const setIds = new Set(state.selectedSearchFlowIds);
      if (setIds.has(id)) setIds.delete(id);
      else setIds.add(id);
      return { selectedSearchFlowIds: Array.from(setIds) };
    }),
  selectAllSearchFlows: () => set((state: AppState) => ({ selectedSearchFlowIds: state.flows.map((f) => f.id) })),
  clearSelectedSearchFlows: () => set({ selectedSearchFlowIds: [] }),
  setActiveWidget: (widgetName?: string) => set({ activeWidgetName: widgetName }),
  setActiveSearchMatch: (match?: FlowSearchMatch) => set({ selectedSearchMatch: match }),
  pushToast: (toast: ToastMessage) => set({ toast }),
  clearToast: () => set({ toast: undefined })
});

export const useAppStore = create<AppState>()(devtools(appStateCreator, { name: "app-store" }));

export const selectActiveDocument = (state: AppState) =>
  state.activeFlowId ? state.documents[state.activeFlowId] : undefined;

export const selectActiveFlow = (state: AppState) => selectActiveDocument(state)?.file;
