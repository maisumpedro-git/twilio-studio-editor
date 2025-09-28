import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from "react";
import clsx from "clsx";

export type ButtonVariant = "primary" | "ghost" | "outline" | "danger";

export type ButtonProps = PropsWithChildren<
  {
    variant?: ButtonVariant;
    icon?: ReactNode;
    isActive?: boolean;
  } & ButtonHTMLAttributes<HTMLButtonElement>
>;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-surface-500 text-slate-100 hover:bg-surface-400 focus-visible:ring-surface-300 disabled:bg-slate-700",
  ghost:
    "bg-transparent text-slate-300 hover:bg-slate-800 focus-visible:ring-slate-600 disabled:text-slate-600",
  outline:
    "border border-slate-700 text-slate-200 hover:bg-slate-800 focus-visible:ring-slate-600 disabled:border-slate-800 disabled:text-slate-600",
  danger:
    "bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-400 disabled:bg-red-900"
};

export const Button = ({
  variant = "primary",
  icon,
  children,
  className,
  isActive,
  ...props
}: ButtonProps) => {
  return (
    <button
      type="button"
      className={clsx(
        "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
        variantClasses[variant],
        isActive && variant === "ghost" && "bg-slate-800/80 text-slate-100",
        className
      )}
      {...props}
    >
      {icon ? <span className="flex h-4 w-4 items-center justify-center">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
};

export const IconButton = ({ icon, children, className, ...props }: ButtonProps) => {
  return (
    <Button
      {...props}
      className={clsx("px-2 py-2", className)}
      variant={props.variant ?? "ghost"}
      icon={icon}
    >
      {children}
    </Button>
  );
};
