import clsx from "clsx";
import { useMemo } from "react";

import type { FlowSummary, SidebarMode, FlowSearchMatch } from "@shared/index";
import { SearchIcon, FlowIcon } from "../ui/icons";

export type SidebarExplorerProps = {
  mode: SidebarMode;
  flows: FlowSummary[];
  activeFlowId?: string;
  isFetching: boolean;
  searchTerm: string;
  searchResults: FlowSearchMatch[];
  isSearching: boolean;
  selectedFlowIds?: string[];
  onSelectFlow: (filePath: string) => void;
  onChangeSearch: (value: string) => void;
  onToggleMode: () => void;
  onSelectSearchResult: (match: FlowSearchMatch) => void;
  onToggleSearchFlowId?: (id: string) => void;
  onSelectAllSearchFlows?: () => void;
  onClearSelectedSearchFlows?: () => void;
};

export const SidebarExplorer = ({
  mode,
  flows,
  activeFlowId,
  isFetching,
  searchTerm,
  searchResults,
  isSearching,
  selectedFlowIds,
  onSelectFlow,
  onChangeSearch,
  onToggleMode,
  onSelectSearchResult,
  onToggleSearchFlowId,
  onSelectAllSearchFlows,
  onClearSelectedSearchFlows
}: SidebarExplorerProps) => {
  const sortedFlows = useMemo(() => {
    return [...flows].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [flows]);

  return (
    <aside className="flex h-full w-full flex-col border-r border-slate-800 bg-slate-950/80">
      <div className="flex items-center justify-between border-b border-slate-900 px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {mode === "explorer" ? "Fluxos" : "Busca Global"}
        </span>
        <button
          type="button"
          onClick={onToggleMode}
          className="text-xs text-slate-500 transition hover:text-slate-200"
        >
          {mode === "explorer" ? "Ctrl+Shift+F" : "Esc"}
        </button>
      </div>

      {mode === "global-search" ? (
        <div className="flex flex-col gap-2 px-4 py-3">
          <label className="text-xs uppercase tracking-wide text-slate-500" htmlFor="global-search">
            Buscar nos fluxos
          </label>
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
            <input
              id="global-search"
              type="search"
              autoFocus
              value={searchTerm}
              onChange={(event) => onChangeSearch(event.target.value)}
              placeholder="Digite para buscar..."
              className="w-full rounded-md border border-slate-800 bg-slate-950/50 py-2 pl-8 pr-3 text-sm text-slate-100 placeholder:text-slate-600 focus:border-surface-500 focus:outline-none"
            />
          </div>
          <div className="mt-2 rounded-md border border-slate-800 bg-slate-950/30 p-2">
            <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
              <span>Filtrar por fluxos</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  onClick={onSelectAllSearchFlows}
                >
                  Selecionar todos
                </button>
                <button
                  type="button"
                  className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  onClick={onClearSelectedSearchFlows}
                >
                  Limpar
                </button>
              </div>
            </div>
            <div className="max-h-36 space-y-1 overflow-auto pr-1">
              {sortedFlows.map((flow) => {
                const checked = selectedFlowIds?.includes(flow.id) ?? false;
                return (
                  <label key={flow.id} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs text-slate-300 hover:bg-slate-900">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleSearchFlowId?.(flow.id)}
                      className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-surface-500"
                    />
                    <span className="truncate">{flow.friendlyName}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
            <span>Pressione Esc para voltar</span>
            <span>
              {isSearching
                ? "Buscando..."
                : searchTerm.trim().length === 0
                  ? "Aguardando termo"
                  : `${searchResults.length} resultado${searchResults.length === 1 ? "" : "s"}`}
            </span>
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto">
        {mode === "explorer" ? (
          <ul className="space-y-1 px-2 py-3">
            {sortedFlows.length === 0 ? (
              <li className="rounded-md border border-dashed border-slate-800 bg-slate-950/40 p-4 text-center text-xs text-slate-500">
                {isFetching ? "Carregando fluxos..." : "Nenhum fluxo encontrado. Baixe pelo Twilio CLI."}
              </li>
            ) : null}
            {sortedFlows.map((flow) => {
              const isActive = flow.id === activeFlowId;
              return (
                <li key={flow.id}>
                  <button
                    type="button"
                    onClick={() => onSelectFlow(flow.filePath)}
                    className={clsx(
                      "flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm transition",
                      isActive
                        ? "bg-surface-600/40 text-slate-50"
                        : "text-slate-300 hover:bg-slate-800/80"
                    )}
                  >
                    <FlowIcon className="mt-0.5 h-4 w-4" />
                    <span className="flex-1">
                      <span className="block text-sm font-medium">{flow.friendlyName}</span>
                      <span className="text-xs text-slate-500">
                        {flow.sid ? (
                          <>
                            <span className="text-slate-400">SID:</span> {flow.sid}
                            <span className="mx-2 text-slate-600">·</span>
                          </>
                        ) : null}
                        {flow.fileName}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex h-full flex-col gap-3 px-2 py-3">
            {searchTerm.trim().length === 0 && searchResults.length === 0 && !isSearching ? (
              <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/40 px-4 py-6 text-center text-xs text-slate-500">
                Digite pelo menos 2 caracteres para buscar nos fluxos.
              </div>
            ) : null}
            {isSearching ? (
              <div className="rounded-md border border-slate-800 bg-slate-950/40 px-4 py-4 text-center text-xs text-slate-500">
                Buscando em seus fluxos...
              </div>
            ) : null}
            {!isSearching && searchTerm.trim().length > 0 && searchResults.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/40 px-4 py-6 text-center text-xs text-slate-500">
                Nenhum resultado encontrado para “{searchTerm}”.
              </div>
            ) : null}
            <ul className="space-y-2">
              {searchResults.map((match) => (
                <li key={`${match.fileId}-${match.line}-${match.column}`}>
                  <button
                    type="button"
                    onClick={() => onSelectSearchResult(match)}
                    className="w-full rounded-md border border-slate-800 bg-slate-950/50 px-3 py-2 text-left text-xs text-slate-400 transition hover:border-slate-700 hover:bg-slate-900/70"
                  >
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
                      <span>{match.fileName}</span>
                      <span>{match.path}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-100">{match.preview}</p>
                    {match.widgetName ? (
                      <p className="mt-1 text-[11px] text-slate-500">
                        Widget: <span className="text-slate-300">{match.widgetName}</span>
                        {match.widgetType ? ` · ${match.widgetType}` : ""}
                      </p>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
  );
};

export default SidebarExplorer;
