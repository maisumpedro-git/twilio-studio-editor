import { useEffect, useMemo, useState } from "react";
import type { TwilioFlowDefinition } from "@shared/types";
import { collectFlowTokens } from "@shared/tokenUtils";

export const VariablesPanel = ({
  isOpen,
  flow,
  onClose,
  onOpenChange
}: {
  isOpen: boolean;
  flow?: TwilioFlowDefinition;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
}) => {
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const tokens = useMemo(() => (flow ? collectFlowTokens(flow) : []), [flow]);

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
  }, [flow?.sid]);

  if (!isOpen) return null;

  const empties = tokens.filter((t) => !mapping[t] || String(mapping[t]).trim() === "");

  return (
    <aside className="absolute right-0 top-0 z-30 h-full w-80 border-l border-slate-800 bg-slate-950/95 p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-slate-500">Variáveis do fluxo</div>
        <button
          className="rounded border border-slate-800 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-800"
          onClick={onClose}
        >
          Fechar
        </button>
      </div>
      <div className="space-y-2">
        <div className="text-xs text-slate-400">Encontradas ({tokens.length})</div>
        <ul className="max-h-[40vh] space-y-1 overflow-auto">
          {tokens.map((t) => (
            <li key={t} className="flex items-center justify-between rounded bg-slate-900 px-2 py-1">
              <span className="text-xs text-slate-200">{t}</span>
              <span className="text-xs text-slate-400">{mapping[t] || ""}</span>
            </li>
          ))}
          {tokens.length === 0 ? <li className="text-xs text-slate-500">Nenhuma variável encontrada.</li> : null}
        </ul>
        <div className="text-xs text-slate-400">Vazias ({empties.length})</div>
        <ul className="max-h-[20vh] space-y-1 overflow-auto">
          {empties.map((t) => (
            <li key={t} className="rounded bg-yellow-900/20 px-2 py-1 text-xs text-yellow-300">{t}</li>
          ))}
          {empties.length === 0 ? <li className="text-xs text-slate-500">Nenhuma.</li> : null}
        </ul>
        <div className="pt-2">
          <button
            className="w-full rounded border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
            onClick={() => onOpenChange(false)}
          >
            Ocultar painel
          </button>
        </div>
      </div>
    </aside>
  );
};
