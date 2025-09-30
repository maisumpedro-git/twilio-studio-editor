import { useEffect, useMemo, useRef, useState } from "react";

import { APP_NAME } from "@shared/index";
import type { FlowSearchMatch } from "@shared/types";

import { useAppStore, selectActiveFlow } from "./modules/state/appStore";
import { VariablesPanel } from "./components/workspace/VariablesPanel";
import { PublishReviewModal } from "./components/workspace/PublishReviewModal";
import { ToolsMenuBar } from "./components/chrome/ToolsMenuBar";
import { MappingCreateModal } from "./components/workspace/MappingCreateModal";
import { PrimaryToolbar } from "./components/chrome/PrimaryToolbar";
import { SidebarExplorer } from "./components/sidebar/SidebarExplorer";
import { WorkspaceSplit } from "./components/workspace/WorkspaceSplit";
import { TabsBar } from "./components/workspace/TabsBar";
import { InitialPrompt } from "./components/workspace/InitialPrompt";
import { StatusBar } from "./components/chrome/StatusBar";
import { Toast } from "./components/ui/Toast";
import { useHotkeys } from "./hooks/useHotkeys";

const App = () => {
  const [version, setVersion] = useState<string>("");

  const flows = useAppStore((state) => state.flows);
  const sidebarMode = useAppStore((state) => state.sidebarMode);
  const isFetching = useAppStore((state) => state.isFetching);
  const isSearching = useAppStore((state) => state.isSearching);
  const searchTerm = useAppStore((state) => state.searchTerm);
  const searchResults = useAppStore((state) => state.searchResults);
  const toast = useAppStore((state) => state.toast);
  const activeFlowId = useAppStore((state) => state.activeFlowId);
  const activeFlow = useAppStore(selectActiveFlow);

  const initialize = useAppStore((state) => state.initialize);
  const refreshFlows = useAppStore((state) => state.refreshFlows);
  const openFlow = useAppStore((state) => state.openFlow);
  const openFlowInNewTab = useAppStore((s) => s.openFlowInNewTab);
  const closeTab = useAppStore((s) => s.closeTab);
  const downloadAllFlows = useAppStore((state) => state.downloadAllFlows);
  const validateActiveFlow = useAppStore((state) => state.validateActiveFlow);
  const saveActiveFlow = useAppStore((state) => state.saveActiveFlow);
  const publishActiveFlow = useAppStore((state) => state.publishActiveFlow);
  const toggleSidebarMode = useAppStore((state) => state.toggleSidebarMode);
  const ui = useAppStore((s) => s.ui);
  const openPublishReview = useAppStore((s) => s.openPublishReview);
  const confirmPublishWithValues = useAppStore((s) => s.confirmPublishWithValues);
  const openMappingCreate = useAppStore((s) => s.openMappingCreate);
  const closeMappingCreate = useAppStore((s) => s.closeMappingCreate);
  const confirmMappingCreate = useAppStore((s) => s.confirmMappingCreate);
  const setSidebarMode = useAppStore((state) => state.setSidebarMode);
  const setSearchTerm = useAppStore((state) => state.setSearchTerm);
  const setSearchResults = useAppStore((state) => state.setSearchResults);
  const performSearch = useAppStore((state) => state.performSearch);
  const pushToast = useAppStore((state) => state.pushToast);
  const clearToast = useAppStore((state) => state.clearToast);
  const setActiveSearchMatch = useAppStore((state) => state.setActiveSearchMatch);
  const setActiveWidget = useAppStore((state) => state.setActiveWidget);
  const selectedSearchMatch = useAppStore((state) => state.selectedSearchMatch);
  const openTabs = useAppStore((s) => s.openTabs);
  const selectedSearchFlowIds = useAppStore((s) => s.selectedSearchFlowIds);
  const toggleSelectedSearchFlowId = useAppStore((s) => s.toggleSelectedSearchFlowId);
  const selectAllSearchFlows = useAppStore((s) => s.selectAllSearchFlows);
  const clearSelectedSearchFlows = useAppStore((s) => s.clearSelectedSearchFlows);

  useEffect(() => {
    setVersion(window.twilioStudio.getAppVersion());
    void initialize();
  }, [initialize]);

  const handleChooseWorkspace = async () => {
    const result = await window.twilioStudio.chooseWorkspaceRoot();
    if (result?.path) {
      pushToast({ intent: "success", message: `Workspace: ${result.path}`, timestamp: Date.now() });
      await refreshFlows();
    }
  };

  useEffect(() => {
    if (!toast) {
      return;
    }
    const timer = window.setTimeout(() => {
      clearToast();
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [toast, clearToast]);

  useEffect(() => {
    if (sidebarMode !== "global-search") {
      setSearchResults([]);
      return;
    }

    const trimmed = searchTerm.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    const handle = window.setTimeout(() => {
      void performSearch(trimmed);
    }, 250);

    return () => window.clearTimeout(handle);
  }, [sidebarMode, searchTerm, selectedSearchFlowIds, performSearch, setSearchResults]);

  const handleSelectFlow = (filePath: string) => {
    void openFlow(filePath);
  };

  const handleSelectSearchResult = (match: FlowSearchMatch) => {
    const summary = flows.find((flow) => flow.id === match.fileId);
    if (!summary) {
      pushToast({
        intent: "info",
        message: "Não foi possível localizar o fluxo selecionado.",
        timestamp: Date.now()
      });
      return;
    }
    void openFlow(summary.filePath)
      .then(() => {
        setActiveSearchMatch(match);
        if (match.widgetName) {
          setActiveWidget(match.widgetName);
        }
        setSidebarMode("explorer");
      })
      .catch(() => undefined);
  };

  const showInitialPrompt = flows.length === 0;

  // Resizable sidebar width
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const raw = localStorage.getItem("sidebarWidth");
    const n = raw ? Number(raw) : NaN;
    if (!isFinite(n)) return 288;
    return Math.max(220, Math.min(600, n));
  }); // default 72 * 4px
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("sidebarCollapsed") === "1";
    } catch {
      return false;
    }
  });
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const latestWidthRef = useRef(sidebarWidth);
  useEffect(() => {
    latestWidthRef.current = sidebarWidth;
  }, [sidebarWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - startXRef.current;
      const next = Math.max(220, Math.min(600, startWidthRef.current + dx));
      setSidebarWidth(next);
    };
    const onUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      // persist width
      try {
        localStorage.setItem("sidebarWidth", String(latestWidthRef.current));
      } catch {}
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  useHotkeys(
    useMemo(
      () => [
        {
          combo: "mod+s",
          handler: () => {
            void saveActiveFlow();
          }
        },
        {
          combo: "mod+shift+p",
          handler: () => {
            void publishActiveFlow();
          }
        },
        {
          combo: "mod+shift+d",
          handler: () => {
            void downloadAllFlows();
          }
        },
        {
          combo: "mod+shift+f",
          handler: () => {
            setSidebarMode("global-search");
          }
        },
        {
          combo: "escape",
          handler: () => {
            setSidebarMode("explorer");
          }
        }
      ],
      [downloadAllFlows, publishActiveFlow, saveActiveFlow, setSidebarMode]
    )
  );

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      {/* Top menu */}
      <ToolsMenuBar onMappingCreate={() => void openMappingCreate()} />

      <PrimaryToolbar
        appName={APP_NAME}
        appVersion={version}
        sidebarMode={sidebarMode}
        currentFlowName={activeFlow?.flow.friendlyName}
        isFetching={isFetching}
        onRefreshFlows={refreshFlows}
        onToggleSidebarMode={toggleSidebarMode}
        onDownloadFlows={downloadAllFlows}
        onSaveFlow={saveActiveFlow}
        onValidateFlow={validateActiveFlow}
        onPublishFlow={publishActiveFlow}
        onChooseWorkspace={handleChooseWorkspace}
        onToggleSidebarCollapsed={() => {
          setSidebarCollapsed((prev) => {
            const next = !prev;
            try { localStorage.setItem("sidebarCollapsed", next ? "1" : "0"); } catch {}
            return next;
          });
        }}
      />

      <div className="flex flex-1 overflow-hidden">
        <div style={{ width: sidebarCollapsed ? 0 : sidebarWidth }} className="h-full shrink-0 transition-[width] duration-150">
          <SidebarExplorer
          mode={sidebarMode}
          flows={flows}
          activeFlowId={activeFlowId}
          isFetching={isFetching}
          searchTerm={searchTerm}
          searchResults={searchResults}
          isSearching={isSearching}
          selectedFlowIds={selectedSearchFlowIds}
          onSelectFlow={handleSelectFlow}
          onOpenFlowInNewTab={(fp) => void openFlowInNewTab(fp)}
          onChangeSearch={setSearchTerm}
          onToggleMode={toggleSidebarMode}
          onSelectSearchResult={handleSelectSearchResult}
          onToggleSearchFlowId={toggleSelectedSearchFlowId}
          onSelectAllSearchFlows={selectAllSearchFlows}
          onClearSelectedSearchFlows={clearSelectedSearchFlows}
          />
        </div>
        {!sidebarCollapsed ? (
        <div
          role="separator"
          aria-orientation="vertical"
          title="Arraste para redimensionar"
          onMouseDown={(e) => {
            isDraggingRef.current = true;
            startXRef.current = e.clientX;
            startWidthRef.current = sidebarWidth;
            document.body.style.cursor = "col-resize";
            document.body.style.userSelect = "none";
          }}
          className="h-full w-1 cursor-col-resize bg-slate-800/70 hover:bg-slate-700/80"
        />) : null}

        <main className="relative flex flex-1 overflow-hidden flex-col">
          <TabsBar
            tabs={openTabs}
            activeId={activeFlowId}
            onActivate={(id) => useAppStore.getState().setActiveFlow(id)}
            onClose={(id) => closeTab(id)}
          />
          {showInitialPrompt ? (
            <div className="relative z-10 flex-1 overflow-y-auto p-10">
              <InitialPrompt
                appVersion={version}
                isFetching={isFetching}
                onDownloadFlows={downloadAllFlows}
                onRefreshFlows={refreshFlows}
                onToggleSearch={() => setSidebarMode("global-search")}
              />
            </div>
          ) : (
            <WorkspaceSplit
              mode={"json"}
              flow={activeFlow}
              flowId={activeFlowId}
              selectedMatch={selectedSearchMatch}
            />
          )}
          {/* Right side expandable panel */}
          <VariablesPanel
            isOpen={ui.rightPanel.open}
            flow={activeFlow?.flow}
            onClose={() => useAppStore.setState((s) => ({ ui: { ...s.ui, rightPanel: { ...s.ui.rightPanel, open: false } } }))}
            onOpenChange={(open: boolean) => useAppStore.setState((s) => ({ ui: { ...s.ui, rightPanel: { ...s.ui.rightPanel, open } } }))}
          />
        </main>
      </div>

      <StatusBar
        isFetching={isFetching}
        flowsCount={flows.length}
        sidebarMode={sidebarMode}
        searchTerm={searchTerm}
        isSearching={isSearching}
        searchResultsCount={searchResults.length}
      />

      {/* Publish review modal */}
      <PublishReviewModal
        open={ui.publishReview.open}
        tokens={ui.publishReview.tokens}
        mapping={ui.publishReview.mapping}
        empties={ui.publishReview.empties}
        onCancel={() => useAppStore.setState((s) => ({ ui: { ...s.ui, publishReview: { ...s.ui.publishReview, open: false } } }))}
  onConfirm={(values: Record<string, string>) => void confirmPublishWithValues(values)}
        onRegenerateMapping={() => void window.twilioStudio.generateMappings().then(() => openPublishReview())}
      />

      {/* Mapping create modal */}
      <MappingCreateModal
        open={ui.mappingCreate.open}
        values={ui.mappingCreate.values}
        prefill={ui.mappingCreate.prefill}
        onCancel={() => closeMappingCreate()}
        onConfirm={(entries, apply) => void confirmMappingCreate(entries, apply)}
      />

      {toast ? (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50">
          <Toast toast={toast} onDismiss={clearToast} />
        </div>
      ) : null}
    </div>
  );
};

export default App;
