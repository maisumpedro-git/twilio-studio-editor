import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@renderer/modules/state/appStore";

export const DownloadFlowsModal = () => {
  const ui = useAppStore((s) => s.ui.downloadFlows);
  const setState = useAppStore.setState;
  const close = useAppStore((s) => s.closeSelectiveDownload);
  const confirm = useAppStore((s) => s.confirmSelectiveDownload);

  const [localSelected, setLocalSelected] = useState<string[]>([]);
  const [localDir, setLocalDir] = useState<string | null>(null);

  useEffect(() => {
    if (ui.open) {
      setLocalSelected(ui.selectedSids);
      setLocalDir(ui.targetDir);
    }
  }, [ui.open]);

  const all = ui.remote;
  const toggle = (sid: string) => {
    setLocalSelected((prev) => (prev.includes(sid) ? prev.filter((s) => s !== sid) : [...prev, sid]));
  };
  const selectAll = () => setLocalSelected(all.map((r) => r.sid));
  const clear = () => setLocalSelected([]);

  const chooseDir = async () => {
    const res = await window.twilioStudio.chooseDirectory();
    if (res?.path) setLocalDir(res.path);
  };

  const disabled = ui.busy || localSelected.length === 0 || !localDir;

  if (!ui.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-3xl rounded-md border border-slate-800 bg-slate-950 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-900 px-4 py-3">
          <div className="text-sm font-medium text-slate-200">Baixar fluxos da conta</div>
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-slate-400 hover:bg-slate-800"
            onClick={close}
            disabled={ui.busy}
          >
            Fechar
          </button>
        </div>
        <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-hidden p-4">
          <div className="flex min-h-0 flex-col">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs uppercase tracking-wide text-slate-500">Fluxos remotos</div>
              <div className="flex items-center gap-2">
                <button className="rounded px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-800" onClick={selectAll} disabled={ui.busy}>Todos</button>
                <button className="rounded px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-800" onClick={clear} disabled={ui.busy}>Limpar</button>
              </div>
            </div>
            <ul className="min-h-0 flex-1 space-y-1 overflow-auto pr-1">
              {all.map((f) => {
                const checked = localSelected.includes(f.sid);
                return (
                  <li key={f.sid} className="flex items-center gap-2 rounded bg-slate-900/50 px-2 py-1">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 rounded border-slate-700 bg-slate-900 text-surface-500"
                      checked={checked}
                      onChange={() => toggle(f.sid)}
                      disabled={ui.busy}
                    />
                    <span className="truncate text-xs text-slate-200">{f.friendlyName}</span>
                    <span className="ml-auto truncate text-[11px] text-slate-500">{f.sid}</span>
                  </li>
                );
              })}
              {all.length === 0 ? (
                <li className="text-xs text-slate-500">Nenhum fluxo remoto encontrado ou credenciais ausentes.</li>
              ) : null}
            </ul>
          </div>
          <div className="flex min-h-0 flex-col">
            <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">Destino</div>
            <div className="rounded-md border border-slate-800 bg-slate-950/40 p-3">
              <div className="mb-2 text-xs text-slate-400">Pasta onde salvar os fluxos selecionados:</div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={localDir || ""}
                  placeholder="Escolha uma pasta"
                  className="w-full rounded border border-slate-800 bg-slate-900/50 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-600"
                />
                <button type="button" className="rounded px-2 py-1 text-xs text-slate-300 hover:bg-slate-800" onClick={chooseDir} disabled={ui.busy}>Escolher</button>
              </div>
            </div>
            <div className="mt-auto flex items-center justify-end gap-2">
              <button type="button" className="rounded px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800" onClick={close} disabled={ui.busy}>Cancelar</button>
              <button
                type="button"
                className="rounded bg-surface-600 px-3 py-1.5 text-xs text-white hover:bg-surface-500 disabled:opacity-50"
                onClick={() => { if (!disabled) void confirm(localSelected, localDir!); }}
                disabled={disabled}
              >
                Baixar selecionados
              </button>
            </div>
          </div>
        </div>
        {ui.error ? (
          <div className="border-t border-slate-900 px-4 py-2 text-[11px] text-red-400">{ui.error}</div>
        ) : null}
      </div>
    </div>
  );
};

export default DownloadFlowsModal;