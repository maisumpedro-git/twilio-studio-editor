import clsx from "clsx";

export type TabItem = { id: string; title: string; filePath: string };

export function TabsBar({
  tabs,
  activeId,
  onActivate,
  onClose
}: {
  tabs: TabItem[];
  activeId?: string;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-800 bg-slate-950/60 px-2 py-1">
      {tabs.map((t) => (
        <div
          key={t.id}
          className={clsx(
            "group flex items-center gap-2 rounded-t-md border-x border-t border-slate-800 px-3 py-1 text-sm",
            t.id === activeId ? "bg-slate-900 text-slate-100" : "bg-slate-950 text-slate-300 hover:bg-slate-900"
          )}
        >
          <button type="button" className="truncate" onClick={() => onActivate(t.id)}>
            {t.title}
          </button>
          <button
            type="button"
            className="invisible rounded bg-slate-800 px-1 text-xs text-slate-300 group-hover:visible"
            onClick={() => onClose(t.id)}
            title="Fechar aba"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
