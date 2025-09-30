import { useEffect, useMemo, useState } from "react";

export const PublishReviewModal = ({
  open,
  tokens,
  mapping,
  empties,
  onCancel,
  onConfirm,
  onRegenerateMapping
}: {
  open: boolean;
  tokens: string[];
  mapping: Record<string, string>;
  empties: string[];
  onCancel: () => void;
  onConfirm: (values: Record<string, string>) => void;
  onRegenerateMapping: () => void;
}) => {
  const [localValues, setLocalValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const values: Record<string, string> = {};
    for (const t of tokens) values[t] = mapping[t] ?? "";
    setLocalValues(values);
  }, [open, tokens.join("|"), JSON.stringify(mapping)]);

  const unresolved = useMemo(
    () => tokens.filter((t) => !localValues[t] || String(localValues[t]).trim() === ""),
    [tokens, localValues]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-slate-800 bg-slate-950 p-4 shadow-xl">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-200">Revisar variáveis para publicação</div>
          <button className="text-slate-400 hover:text-slate-200" onClick={onCancel}>
            Fechar
          </button>
        </div>
        <div className="mb-3 rounded-md border border-slate-800 bg-slate-900/60 p-2 text-xs text-slate-300">
          As variáveis abaixo serão substituídas nos valores do fluxo (formato ${"${tse.vars.*}"}). Campos vazios serão mantidos como token ou causarão erro no destino.
        </div>
        <div className="max-h-[50vh] space-y-2 overflow-auto pr-1">
          {tokens.length === 0 ? (
            <div className="text-xs text-slate-500">Nenhuma variável encontrada no fluxo.</div>
          ) : (
            tokens.map((t) => (
              <div key={t} className="flex items-center gap-2">
                <div className="w-64 truncate rounded bg-slate-900 px-2 py-1 text-xs text-slate-200">{t}</div>
                <input
                  className="flex-1 rounded border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-slate-700"
                  value={localValues[t] ?? ""}
                  placeholder="valor para substituir"
                  onChange={(e) => setLocalValues((v) => ({ ...v, [t]: e.target.value }))}
                />
              </div>
            ))
          )}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="text-slate-400">
            Vazias: <span className={unresolved.length ? "text-yellow-300" : "text-slate-300"}>{unresolved.length}</span>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded border border-slate-800 px-3 py-1 text-slate-200 hover:bg-slate-800"
              onClick={onRegenerateMapping}
            >
              Regerar mapping
            </button>
            <button
              className="rounded border border-slate-800 px-3 py-1 text-slate-200 hover:bg-slate-800"
              onClick={onCancel}
            >
              Cancelar
            </button>
            <button
              className="rounded border border-emerald-800 bg-emerald-700/30 px-3 py-1 text-emerald-200 hover:bg-emerald-700/50 disabled:opacity-50"
              onClick={() => onConfirm(localValues)}
              disabled={tokens.length > 0 && unresolved.length > 0}
              title={unresolved.length > 0 ? "Preencha todas as variáveis antes de publicar" : "Publicar"}
            >
              Publicar agora
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
