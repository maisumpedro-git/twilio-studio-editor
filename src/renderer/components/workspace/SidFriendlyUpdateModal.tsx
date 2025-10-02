import { useEffect, useState } from "react";

export const SidFriendlyUpdateModal = ({ open, onCancel, onConfirm }: { open: boolean; onCancel: () => void; onConfirm: (sid: string, token: string, envName?: string) => void | Promise<void> }) => {
  const [sid, setSid] = useState("");
  const [token, setToken] = useState("");
  const [envName, setEnvName] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return;
    setSid(""); setToken(""); setEnvName(""); setLoading(false);
  }, [open]);
  if (!open) return null;
  const validSid = /^AC[A-Za-z0-9]{32}$/.test(sid);
  const validToken = token.trim().length >= 8;
  const validEnv = envName.trim() === "" || /^[a-z0-9][a-z0-9-]*$/.test(envName.trim());
  const canSubmit = validSid && validToken && validEnv && !loading;
  const handleConfirm = async () => {
    if (!canSubmit) return;
    try {
      setLoading(true);
      await onConfirm(sid.trim(), token.trim(), envName.trim() || undefined);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg border border-slate-800 bg-slate-950 p-4 shadow-xl">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-200">Atualizar nomes amigáveis (SIDs)</div>
          <button className="text-slate-400 hover:text-slate-200" onClick={onCancel} disabled={loading}>Fechar</button>
        </div>
        <div className="space-y-3 text-xs text-slate-300">
          <label className="block">
            <div className="mb-1 text-slate-400">Account SID (AC...)</div>
            <input className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 outline-none focus:border-slate-600 disabled:opacity-60" value={sid} onChange={(e) => setSid(e.target.value)} placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" disabled={loading} />
          </label>
          <label className="block">
            <div className="mb-1 text-slate-400">Auth Token</div>
            <input className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 outline-none focus:border-slate-600 disabled:opacity-60" value={token} onChange={(e) => setToken(e.target.value)} placeholder="************************" disabled={loading} />
          </label>
          <label className="block">
            <div className="mb-1 text-slate-400">Nome do novo ambiente (opcional)</div>
            <input className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 outline-none focus:border-slate-600 disabled:opacity-60" value={envName} onChange={(e) => setEnvName(e.target.value.toLowerCase())} placeholder="ex.: qa, prod" disabled={loading} />
            {!validEnv ? (
              <div className="pt-0.5 text-[10px] text-amber-300">Use letras minúsculas, números e hífen. Deve começar com letra ou número.</div>
            ) : null}
          </label>
          <div className="flex items-center justify-end gap-2">
            <button className="rounded border border-slate-800 px-3 py-1 text-slate-200 hover:bg-slate-800 disabled:opacity-50" onClick={onCancel} disabled={loading}>Cancelar</button>
            <button className="rounded border border-emerald-800 bg-emerald-700/30 px-3 py-1 text-emerald-200 hover:bg-emerald-700/50 disabled:opacity-50" disabled={!canSubmit} onClick={handleConfirm}>{loading ? "Atualizando…" : "Atualizar"}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SidFriendlyUpdateModal;