import clsx from "clsx";
import { useMemo } from "react";

import type { EditorMode, FlowFile } from "@shared/index";
import { PanelPlaceholder } from "./PanelPlaceholder";
import { JsonIcon, GraphIcon, SplitIcon } from "../ui/icons";

export type WorkspaceSplitProps = {
  mode: EditorMode;
  flow?: FlowFile;
};

export const WorkspaceSplit = ({ mode, flow }: WorkspaceSplitProps) => {
  const placeholders = useMemo(() => {
    const baseDescription = flow
      ? `O fluxo "${flow.flow.friendly_name}" será exibido aqui com edição JSON sincronizada com o grafo.`
      : "Selecione um fluxo para começar a editar.";

    return {
      json: (
        <PanelPlaceholder
          icon={<JsonIcon />}
          title="Editor JSON"
          description={`${baseDescription} Monaco Editor será inicializado nesta área.`}
        />
      ),
      graph: (
        <PanelPlaceholder
          icon={<GraphIcon />}
          title="Visualização de Fluxo"
          description="O grafo interativo do React Flow aparecerá aqui, mantendo-se sincronizado com o JSON."
        />
      ),
      split: (
        <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-2">
          <PanelPlaceholder
            icon={<JsonIcon />}
            title="Editor JSON"
            description={`${baseDescription} Monaco Editor suporta validação contextual e navegação.`}
          />
          <PanelPlaceholder
            icon={<GraphIcon />}
            title="Grafo do Fluxo"
            description="Os widgets do Twilio Studio serão exibidos como nodes com zoom e pan responsivos."
          />
        </div>
      )
    } as const;
  }, [flow]);

  return (
    <div
      className={clsx(
        "relative flex-1 overflow-hidden p-6",
        mode === "split" ? "bg-slate-950/40" : "bg-slate-950/60"
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/60 via-slate-950 to-slate-900/60" />
      <div className="relative z-10 h-full">
        {mode === "json" && placeholders.json}
        {mode === "graph" && placeholders.graph}
        {mode === "split" && placeholders.split}
      </div>
      <div className="pointer-events-none absolute inset-x-6 top-4 flex items-center justify-center text-xs text-slate-600">
        <SplitIcon className="mr-2 h-3.5 w-3.5" />
        <span>Esta área alternará automaticamente entre JSON, grafo ou visão dividida conforme selecionado.</span>
      </div>
    </div>
  );
};

export default WorkspaceSplit;
