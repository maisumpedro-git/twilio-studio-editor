import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";

import type { FlowSummary, SidebarMode, FlowSearchMatch } from "@shared/index";
import { SearchIcon, FlowIcon } from "../ui/icons";
import { useAppStore } from "@renderer/modules/state/appStore";
import { collectFlowTokens } from "@shared/tokenUtils";
import { TreeView, buildTree } from "./TreeView";

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
  onOpenFlowInNewTab?: (filePath: string) => void;
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
  onClearSelectedSearchFlows,
  onOpenFlowInNewTab
}: SidebarExplorerProps) => {
  const ui = useAppStore((s) => s.ui);
  const setUi = useAppStore.setState;
  const sortedFlows = useMemo(() => {
    return [...flows].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [flows]);

  const tree = useMemo(
    () => buildTree(sortedFlows.map((f) => ({ fileName: f.fileName, filePath: f.filePath, friendlyName: f.friendlyName }))),
    [sortedFlows]
  );

  const [mapping, setMapping] = useState<Record<string, string>>({});
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const flat = await window.twilioStudio.getMappingFlat();
        if (mounted) setMapping(flat || {});
      } catch {
        if (mounted) setMapping({});
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activeFlowId]);

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
          <details className="mt-2 rounded-md border border-slate-800 bg-slate-950/30 p-2" open>
            <summary className="flex cursor-pointer items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
              <span>Filtrar por fluxos</span>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  onClick={(e) => {
                    e.preventDefault();
                    onSelectAllSearchFlows?.();
                  }}
                >
                  Selecionar todos
                </button>
                <button
                  type="button"
                  className="rounded px-1.5 py-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                  onClick={(e) => {
                    e.preventDefault();
                    onClearSelectedSearchFlows?.();
                  }}
                >
                  Limpar
                </button>
              </div>
            </summary>
            <div className="mt-2 max-h-32 space-y-1 overflow-auto pr-1">
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
          </details>
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
          <div className="px-2 py-3">
            {sortedFlows.length === 0 ? (
              <div className="rounded-md border border-dashed border-slate-800 bg-slate-950/40 p-4 text-center text-xs text-slate-500">
                {isFetching ? "Carregando fluxos..." : "Nenhum fluxo encontrado. Baixe via API com credenciais do .env."}
              </div>
            ) : (
              <TreeView
                nodes={tree}
                activeFileId={sortedFlows.find((f) => f.id === activeFlowId)?.filePath}
                onOpenFile={onSelectFlow}
                onOpenInNewTab={onOpenFlowInNewTab}
              />
            )}
            <div className="mt-3 rounded-md border border-slate-800 bg-slate-950/40 p-2">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[11px] uppercase tracking-wide text-slate-500">Variáveis do fluxo</div>
                <button
                  type="button"
                  className="rounded px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-800"
                  onClick={() => {
                    const open = !ui.rightPanel.open; // reuse flag to show/hide within sidebar
                    setUi((s) => ({ ui: { ...s.ui, rightPanel: { ...s.ui.rightPanel, open } } }));
                  }}
                >
                  {ui.rightPanel.open ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              {ui.rightPanel.open ? (
                <FlowVariablesList activeFlowId={activeFlowId} mapping={mapping} />
              ) : (
                <div className="text-xs text-slate-500">Oculto</div>
              )}
            </div>

            <WorkspaceSettingsBlock />
          </div>
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

function WorkspaceSettingsBlock() {
  const [envFiles, setEnvFiles] = useState<Array<{ name: string; path: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await window.twilioStudio.listEnvFiles();
        if (mounted) setEnvFiles(list);
      } catch {}
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const setActive = async (name: string) => {
    try {
      setBusy(true);
      await window.twilioStudio.setActiveEnv(name);
      setMsg(`.env atualizado a partir de ${name}`);
    } catch (e) {
      setMsg(`Falha ao atualizar .env (${name})`);
    } finally {
      setBusy(false);
    }
  };

  const ensureTemplate = async () => {
    try {
      setBusy(true);
      const res = await window.twilioStudio.ensureMigrationTemplate();
      setMsg(`Template gerado em ${res.path}`);
    } catch {
      setMsg("Falha ao gerar template de migração");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-4 space-y-2 rounded-md border border-slate-800 bg-slate-950/40 p-2">
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-slate-500">
        <span>Workspace settings</span>
        <button
          type="button"
          className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
          onClick={ensureTemplate}
          disabled={busy}
        >
          Gerar migration template
        </button>
      </div>
      <div className="text-xs text-slate-400">Arquivos .env detectados:</div>
      <ul className="space-y-1">
        {envFiles.map((e) => (
          <li key={e.name} className="flex items-center justify-between">
            <span className="truncate text-xs text-slate-300">{e.name}</span>
            <button
              type="button"
              className="rounded px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-800"
              onClick={() => void setActive(e.name)}
              disabled={busy}
            >
              Usar como .env
            </button>
          </li>
        ))}
        {envFiles.length === 0 ? (
          <li className="text-xs text-slate-500">Nenhum .env encontrado neste workspace.</li>
        ) : null}
      </ul>
      {msg ? <div className="text-[11px] text-slate-500">{msg}</div> : null}
    </div>
  );
}

function FlowVariablesList({ activeFlowId, mapping }: { activeFlowId?: string; mapping: Record<string, string> }) {
  const doc = useAppStore((s) => (activeFlowId ? s.documents[activeFlowId] : undefined));
  const tokens = useMemo(() => (doc?.file ? collectFlowTokens(doc.file.flow) : []), [doc?.file?.id, doc?.file?.updatedAt]);
  const empties = tokens.filter((t) => !mapping[t] || String(mapping[t]).trim() === "");

  if (!doc?.file) {
    return <div className="text-xs text-slate-500">Abra um fluxo para ver as variáveis.</div>;
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-slate-400">Encontradas ({tokens.length})</div>
      <ul className="max-h-40 space-y-1 overflow-auto pr-1">
        {tokens.map((t) => (
          <li key={t} className="flex items-center justify-between rounded bg-slate-900 px-2 py-1">
            <span className="text-xs text-slate-200">{t}</span>
            <span className="text-xs text-slate-400">{mapping[t] || ""}</span>
          </li>
        ))}
        {tokens.length === 0 ? <li className="text-xs text-slate-500">Nenhuma variável encontrada.</li> : null}
      </ul>
      <div className="text-xs text-slate-400">Vazias ({empties.length})</div>
      <ul className="max-h-20 space-y-1 overflow-auto pr-1">
        {empties.map((t) => (
          <li key={t} className="rounded bg-yellow-900/20 px-2 py-1 text-xs text-yellow-300">{t}</li>
        ))}
        {empties.length === 0 ? <li className="text-xs text-slate-500">Nenhuma.</li> : null}
      </ul>
    </div>
  );
}
