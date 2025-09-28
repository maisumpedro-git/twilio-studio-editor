import clsx from "clsx";
import { useMemo } from "react";

import type { FlowSummary, SidebarMode } from "@shared/index";
import { SearchIcon, FlowIcon } from "../ui/icons";

export type SidebarExplorerProps = {
  mode: SidebarMode;
  flows: FlowSummary[];
  activeFlowId?: string;
  isFetching: boolean;
  searchTerm: string;
  onSelectFlow: (flowId: string) => void;
  onChangeSearch: (value: string) => void;
  onToggleMode: () => void;
};

export const SidebarExplorer = ({
  mode,
  flows,
  activeFlowId,
  isFetching,
  searchTerm,
  onSelectFlow,
  onChangeSearch,
  onToggleMode
}: SidebarExplorerProps) => {
  const sortedFlows = useMemo(() => {
    return [...flows].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [flows]);

  return (
    <aside className="flex h-full w-72 flex-col border-r border-slate-800 bg-slate-950/80">
      <div className="flex items-center justify-between border-b border-slate-900 px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {mode === "explorer" ? "Fluxos" : "Busca Global"}
        </span>
        <button
          type="button"
          onClick={onToggleMode}
          className="text-xs text-slate-500 transition hover:text-slate-200"
        >
          {mode === "explorer" ? "Ctrl+F" : "Esc"}
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
          <p className="text-xs text-slate-500">
            Resultados aparecerão em tempo real. Pressione Esc para voltar ao Explorer.
          </p>
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
                      <span className="text-xs text-slate-500">{flow.fileName}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-center text-sm text-slate-600">
            <p>
              Digite um termo para iniciar a busca global. Resultados detalhados serão exibidos aqui na
              próxima etapa.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default SidebarExplorer;
