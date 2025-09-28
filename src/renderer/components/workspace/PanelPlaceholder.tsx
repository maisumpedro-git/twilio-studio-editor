import type { ReactNode } from "react";
import clsx from "clsx";

export type PanelPlaceholderProps = {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
};

export const PanelPlaceholder = ({ icon, title, description, className }: PanelPlaceholderProps) => {
  return (
    <div
      className={clsx(
        "flex h-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-10 text-center text-slate-400",
        className
      )}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/60 text-slate-200">
        {icon}
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        <p className="max-w-md text-sm text-slate-400">{description}</p>
      </div>
    </div>
  );
};

export default PanelPlaceholder;
