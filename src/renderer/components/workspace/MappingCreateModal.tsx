import { useEffect, useMemo, useState } from "react";

export const MappingCreateModal = ({
  open,
  values,
  prefill,
  indicators,
  onCancel,
  onConfirm
}: {
  open: boolean;
  values: string[];
  prefill: Record<string, string>;
  indicators?: Record<string, { existing?: boolean; friendly?: boolean; friendlyName?: string }>;
  onCancel: () => void;
  onConfirm: (entries: Record<string, string>, applyToDoc: boolean) => void | Promise<void>;
}) => {
  const [names, setNames] = useState<Record<string, string>>({});
  const [apply, setApply] = useState<boolean>(true);

  useEffect(() => {
    if (!open) return;
    const init: Record<string, string> = {};
    for (const v of values) init[v] = prefill[v] || "";
    setNames(init);
  }, [open, values.join("|"), JSON.stringify(prefill)]);

  const invalidCount = useMemo(
    () => values.filter((v) => !names[v] || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(names[v])).length,
    [values, names]
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl rounded-lg border border-slate-800 bg-slate-950 p-4 shadow-xl">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-200">Criar variáveis do fluxo</div>
          <button className="text-slate-400 hover:text-slate-200" onClick={onCancel}>Fechar</button>
        </div>
        <div className="mb-2 text-xs text-slate-400">Edite os nomes das variáveis. Use letras, números e _ (não iniciar com número).</div>
        <div className="max-h-[50vh] overflow-auto rounded-md border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="sticky top-0 bg-slate-900 text-slate-400">
              <tr>
                <th className="px-2 py-2">Valor</th>
                <th className="px-2 py-2">Origem</th>
                <th className="px-2 py-2 w-60">Nome da variável</th>
              </tr>
            </thead>
            <tbody>
              {values.map((v) => (
                <tr key={v} className="border-t border-slate-800">
                  <td className="max-w-[520px] truncate px-2 py-2 text-slate-200" title={v}>{v}</td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {indicators?.[v]?.existing ? (
                      <span className="mr-2 rounded bg-sky-800/30 px-2 py-0.5 text-[10px] text-sky-200">existente</span>
                    ) : null}
                    {indicators?.[v]?.friendly ? (
                      <span title={indicators?.[v]?.friendlyName}
                        className="rounded bg-emerald-800/30 px-2 py-0.5 text-[10px] text-emerald-200">friendly</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-2">
                    <input
                      className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-100 outline-none focus:border-slate-600"
                      value={names[v] ?? ""}
                      onChange={(e) => setNames((n) => ({ ...n, [v]: e.target.value }))}
                      placeholder="Ex.: WorkflowSidRela"
                    />
                    {!names[v] || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(names[v]) ? (
                      <div className="pt-0.5 text-[10px] text-amber-300">Nome inválido</div>
                    ) : null}
                  </td>
                </tr>
              ))}
              {values.length === 0 ? (
                <tr>
                  <td className="px-2 py-3 text-slate-500" colSpan={2}>Nenhum valor novo encontrado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <label className="flex items-center gap-2 text-slate-400">
            <input type="checkbox" checked={apply} onChange={(e) => setApply(e.target.checked)} />
            Aplicar substituição no documento e salvar
          </label>
          <div className="flex gap-2">
            <button className="rounded border border-slate-800 px-3 py-1 text-slate-200 hover:bg-slate-800" onClick={onCancel}>Cancelar</button>
            <button
              className="rounded border border-emerald-800 bg-emerald-700/30 px-3 py-1 text-emerald-200 hover:bg-emerald-700/50 disabled:opacity-50"
              onClick={() => onConfirm(names, apply)}
              disabled={values.length === 0 || invalidCount > 0}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MappingCreateModal;