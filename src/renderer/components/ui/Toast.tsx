import type { ReactNode } from "react";
import clsx from "clsx";
import type { ToastMessage } from "@renderer/modules/state/appStore";
import { CheckIcon, RefreshIcon, SplitIcon } from "./icons";

const intentStyles: Record<ToastMessage["intent"], string> = {
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-100",
  error: "border-rose-500/40 bg-rose-500/10 text-rose-100",
  info: "border-slate-500/40 bg-slate-500/10 text-slate-100"
};

const intentIcons: Record<ToastMessage["intent"], ReactNode> = {
  success: <CheckIcon className="h-4 w-4" />,
  error: <SplitIcon className="h-4 w-4" />,
  info: <RefreshIcon className="h-4 w-4" />
};

export type ToastProps = {
  toast: ToastMessage;
  onDismiss: () => void;
};

export const Toast = ({ toast, onDismiss }: ToastProps) => {
  return (
    <div className="pointer-events-auto">
      <div
        className={clsx(
          "flex min-w-[280px] items-start gap-3 rounded-lg border px-4 py-3 shadow-lg shadow-slate-950/50",
          intentStyles[toast.intent]
        )}
      >
        <span className="mt-1 text-slate-200">{intentIcons[toast.intent]}</span>
        <div className="flex-1 text-sm leading-relaxed text-slate-100">{toast.message}</div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs uppercase tracking-wide text-slate-400 transition hover:text-slate-100"
        >
          fechar
        </button>
      </div>
    </div>
  );
};

export default Toast;
