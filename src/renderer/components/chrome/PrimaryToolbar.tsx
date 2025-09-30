import { Fragment } from "react";
import clsx from "clsx";

import { Button, IconButton } from "../ui/Button";
import { DownloadIcon, RefreshIcon, SearchIcon, FolderIcon, ChevronRightIcon } from "../ui/icons";
import type { SidebarMode } from "@shared/appManifest";

export type PrimaryToolbarProps = {
  appName: string;
  appVersion: string;
  sidebarMode: SidebarMode;
  currentFlowName?: string;
  isFetching: boolean;
  onRefreshFlows: () => void;
  onToggleSidebarMode: () => void;
  onDownloadFlows: () => void;
  onSaveFlow: () => void;
  onValidateFlow: () => void;
  onPublishFlow: () => void;
  onChooseWorkspace?: () => void;
  onToggleSidebarCollapsed?: () => void;
};

export const PrimaryToolbar = ({
  appName,
  appVersion,
  sidebarMode,
  currentFlowName,
  isFetching,
  onRefreshFlows,
  onToggleSidebarMode,
  onDownloadFlows,
  onSaveFlow,
  onValidateFlow,
  onPublishFlow,
  onChooseWorkspace,
  onToggleSidebarCollapsed
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
            icon={<ChevronRightIcon style={{ transform: "rotate(180deg)" }} />}
            onClick={onToggleSidebarCollapsed}
            title="Reduzir/expandir Sidebar"
          >
            Sidebar
          </IconButton>
          <IconButton
            variant="ghost"
            icon={<SearchIcon />}
            onClick={onToggleSidebarMode}
            title={sidebarMode === "explorer" ? "Abrir busca global (Ctrl+Shift+F)" : "Voltar para Explorer"}
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
        {/* Editor mode switch removed (only JSON mode now) */}
      </div>
      <div className="flex items-center gap-2">
        {onChooseWorkspace ? (
          <Button variant="ghost" icon={<FolderIcon />} onClick={onChooseWorkspace}>
            Workspace
          </Button>
        ) : null}
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
