import { useEffect, useMemo, useState } from "react";

import { APP_NAME } from "@shared/index";
import type { FlowSearchMatch } from "@shared/types";

import { useAppStore, selectActiveFlow } from "./modules/state/appStore";
import { PrimaryToolbar } from "./components/chrome/PrimaryToolbar";
import { SidebarExplorer } from "./components/sidebar/SidebarExplorer";
import { WorkspaceSplit } from "./components/workspace/WorkspaceSplit";
import { InitialPrompt } from "./components/workspace/InitialPrompt";
import { StatusBar } from "./components/chrome/StatusBar";
import { Toast } from "./components/ui/Toast";
import { useHotkeys } from "./hooks/useHotkeys";

const App = () => {
  const [version, setVersion] = useState<string>("");

  const flows = useAppStore((state) => state.flows);
  const sidebarMode = useAppStore((state) => state.sidebarMode);
  const editorMode = useAppStore((state) => state.editorMode);
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
  const downloadAllFlows = useAppStore((state) => state.downloadAllFlows);
  const validateActiveFlow = useAppStore((state) => state.validateActiveFlow);
  const saveActiveFlow = useAppStore((state) => state.saveActiveFlow);
  const publishActiveFlow = useAppStore((state) => state.publishActiveFlow);
  const toggleSidebarMode = useAppStore((state) => state.toggleSidebarMode);
  const setSidebarMode = useAppStore((state) => state.setSidebarMode);
  const setEditorMode = useAppStore((state) => state.setEditorMode);
  const setSearchTerm = useAppStore((state) => state.setSearchTerm);
  const setSearchResults = useAppStore((state) => state.setSearchResults);
  const performSearch = useAppStore((state) => state.performSearch);
  const pushToast = useAppStore((state) => state.pushToast);
  const clearToast = useAppStore((state) => state.clearToast);
  const setActiveSearchMatch = useAppStore((state) => state.setActiveSearchMatch);
  const selectedSearchMatch = useAppStore((state) => state.selectedSearchMatch);

  useEffect(() => {
    setVersion(window.twilioStudio.getAppVersion());
    void initialize();
  }, [initialize]);

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
  }, [sidebarMode, searchTerm, performSearch, setSearchResults]);

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
        setSidebarMode("explorer");
      })
      .catch(() => undefined);
  };

  const showInitialPrompt = flows.length === 0;

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
          combo: "mod+f",
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
      <PrimaryToolbar
        appName={APP_NAME}
        appVersion={version}
        sidebarMode={sidebarMode}
        editorMode={editorMode}
        currentFlowName={activeFlow?.flow.friendly_name}
        isFetching={isFetching}
        onRefreshFlows={refreshFlows}
        onToggleSidebarMode={toggleSidebarMode}
        onChangeEditorMode={setEditorMode}
        onDownloadFlows={downloadAllFlows}
        onSaveFlow={saveActiveFlow}
        onValidateFlow={validateActiveFlow}
        onPublishFlow={publishActiveFlow}
      />

      <div className="flex flex-1 overflow-hidden">
        <SidebarExplorer
          mode={sidebarMode}
          flows={flows}
          activeFlowId={activeFlowId}
          isFetching={isFetching}
          searchTerm={searchTerm}
          searchResults={searchResults}
          isSearching={isSearching}
          onSelectFlow={handleSelectFlow}
          onChangeSearch={setSearchTerm}
          onToggleMode={toggleSidebarMode}
          onSelectSearchResult={handleSelectSearchResult}
        />

        <main className="relative flex flex-1 overflow-hidden">
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
              mode={editorMode}
              flow={activeFlow}
              flowId={activeFlowId}
              selectedMatch={selectedSearchMatch}
            />
          )}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slate-950 via-transparent to-slate-900/70" />
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

      {toast ? (
        <div className="pointer-events-none fixed bottom-6 right-6 z-50">
          <Toast toast={toast} onDismiss={clearToast} />
        </div>
      ) : null}
    </div>
  );
};

export default App;
