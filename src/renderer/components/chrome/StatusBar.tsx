import type { FlowSummary } from "@shared/index";
import { CheckIcon, RefreshIcon, SearchIcon } from "../ui/icons";

export type StatusBarProps = {
  isFetching: boolean;
  flowsCount: number;
  sidebarMode: "explorer" | "global-search";
  searchTerm: string;
};

export const StatusBar = ({ isFetching, flowsCount, sidebarMode, searchTerm }: StatusBarProps) => {
  return (
    <footer className="flex h-8 items-center justify-between border-t border-slate-900 bg-slate-950/80 px-4 text-xs text-slate-500">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center gap-1">
          <RefreshIcon className={`h-3.5 w-3.5 ${isFetching ? "animate-spin text-surface-400" : ""}`} />
          {isFetching ? "Sincronizando fluxos com o disco" : `Fluxos carregados: ${flowsCount}`}
        </span>
        <span className="inline-flex items-center gap-1">
          <CheckIcon className="h-3.5 w-3.5 text-emerald-400" />
          Estado sincronizado
        </span>
      </div>
      <div className="flex items-center gap-2 text-slate-600">
        <span className="inline-flex items-center gap-1">
          <SearchIcon className="h-3.5 w-3.5" />
          {sidebarMode === "global-search" ? `Busca: ${searchTerm || ""}` : "Explorer"}
        </span>
      </div>
    </footer>
  );
};

export default StatusBar;
