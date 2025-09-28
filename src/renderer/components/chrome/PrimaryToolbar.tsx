import { Fragment } from "react";
import clsx from "clsx";

import { Button, IconButton } from "../ui/Button";
import {
  DownloadIcon,
  RefreshIcon,
  SearchIcon,
  JsonIcon,
  GraphIcon,
  SplitIcon
} from "../ui/icons";
import type { SidebarMode, EditorMode } from "@shared/appManifest";

export type PrimaryToolbarProps = {
  appName: string;
  appVersion: string;
  sidebarMode: SidebarMode;
  editorMode: EditorMode;
  currentFlowName?: string;
  isFetching: boolean;
  onRefreshFlows: () => void;
  onToggleSidebarMode: () => void;
  onChangeEditorMode: (mode: EditorMode) => void;
  onDownloadFlows: () => void;
  onSaveFlow: () => void;
  onValidateFlow: () => void;
  onPublishFlow: () => void;
};

const editorModes: { key: EditorMode; label: string; icon: JSX.Element }[] = [
  { key: "json", label: "JSON", icon: <JsonIcon /> },
  { key: "graph", label: "Grafo", icon: <GraphIcon /> },
  { key: "split", label: "Dividido", icon: <SplitIcon /> }
];

export const PrimaryToolbar = ({
  appName,
  appVersion,
  sidebarMode,
  editorMode,
  currentFlowName,
  isFetching,
  onRefreshFlows,
  onToggleSidebarMode,
  onChangeEditorMode,
  onDownloadFlows,
  onSaveFlow,
  onValidateFlow,
  onPublishFlow
}: PrimaryToolbarProps) => {
  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950/70 px-4 backdrop-blur">
      <div className="flex items-center gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            {appName}
          </span>
          <span className="rounded-full border border-slate-800 px-2 py-0.5 text-xs text-slate-500">
            v{appVersion}
          </span>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <IconButton
            variant="ghost"
            icon={<SearchIcon />}
            onClick={onToggleSidebarMode}
            title={sidebarMode === "explorer" ? "Abrir busca global (Ctrl+F)" : "Voltar para Explorer"}
            isActive={sidebarMode === "global-search"}
          >
            {sidebarMode === "explorer" ? "Busca Global" : "Explorer"}
          </IconButton>
          <IconButton
            variant="ghost"
            icon={<RefreshIcon className={clsx(isFetching && "animate-spin")} />}
            onClick={onRefreshFlows}
            disabled={isFetching}
            title="Atualizar lista de fluxos"
          >
            Atualizar
          </IconButton>
        </div>
        <div className="hidden items-center gap-1 rounded-md border border-slate-800 bg-slate-900/60 p-1 lg:flex">
          {editorModes.map((mode) => (
            <Button
              key={mode.key}
              variant="ghost"
              onClick={() => onChangeEditorMode(mode.key)}
              isActive={editorMode === mode.key}
              icon={mode.icon}
              className="px-3"
            >
              {mode.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-2 pr-3 text-sm text-slate-400 sm:flex">
          <span className="text-xs uppercase tracking-wide text-slate-600">Fluxo ativo</span>
          <span className="rounded bg-slate-800 px-2 py-0.5 font-medium text-slate-200">
            {currentFlowName ?? "Nenhum fluxo carregado"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" icon={<DownloadIcon />} onClick={onDownloadFlows}>
            Baixar
          </Button>
          <Button variant="ghost" onClick={onValidateFlow}>
            Validar
          </Button>
          <Button variant="primary" onClick={onSaveFlow}>
            Salvar
          </Button>
          <Button variant="outline" onClick={onPublishFlow}>
            Publicar
          </Button>
        </div>
      </div>
    </header>
  );
};

export default PrimaryToolbar;
