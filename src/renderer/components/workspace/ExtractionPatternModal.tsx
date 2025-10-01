import { useEffect, useState } from "react";

export type ExtractionPatterns = {
  keyIncludes: string[]; // json keys to include, case-insensitive contains
  regexes: string[]; // additional regex patterns to match values
};

export const ExtractionPatternModal = ({
  open,
  initial,
  onCancel,
  onConfirm
}: {
  open: boolean;
  initial?: ExtractionPatterns;
  onCancel: () => void;
  onConfirm: (patterns: ExtractionPatterns) => void | Promise<void>;
}) => {
  const [keyIncludes, setKeyIncludes] = useState<string>("");
  const [regexes, setRegexes] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    setKeyIncludes((initial?.keyIncludes || []).join(", "));
    setRegexes((initial?.regexes || []).join(", "));
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-xl rounded-lg border border-slate-800 bg-slate-950 p-4 shadow-xl">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-sm font-medium text-slate-200">Padrões de extração</div>
          <button className="text-slate-400 hover:text-slate-200" onClick={onCancel}>Fechar</button>
        </div>
        <div className="space-y-3 text-xs text-slate-300">
          <label className="block">
            <div className="mb-1 text-slate-400">Chaves que devem conter (separadas por vírgula)</div>
            <input
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 outline-none focus:border-slate-600"
              value={keyIncludes}
              onChange={(e) => setKeyIncludes(e.target.value)}
              placeholder="TwilioSid"
            />
          </label>
          <label className="block">
            <div className="mb-1 text-slate-400">Regex de valores adicionais (separadas por vírgula)</div>
            <input
              className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1 text-slate-100 outline-none focus:border-slate-600"
              value={regexes}
              onChange={(e) => setRegexes(e.target.value)}
              placeholder={'AC[\\w]{32}'}
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <button className="rounded border border-slate-800 px-3 py-1 text-slate-200 hover:bg-slate-800" onClick={onCancel}>Cancelar</button>
            <button
              className="rounded border border-emerald-800 bg-emerald-700/30 px-3 py-1 text-emerald-200 hover:bg-emerald-700/50"
              onClick={() => onConfirm({
                keyIncludes: keyIncludes.split(",").map((s) => s.trim()).filter(Boolean),
                regexes: regexes.split(",").map((s) => s.trim()).filter(Boolean)
              })}
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExtractionPatternModal;