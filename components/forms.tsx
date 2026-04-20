import { ReactNode } from "react";
import { clsx } from "clsx";

export function FormGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={clsx("grid gap-4 md:grid-cols-2", className)}>{children}</div>;
}

export function Field({
  label,
  children,
  hint,
  className = "",
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={clsx("grid gap-2 text-sm font-medium text-ink", className)}>
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs font-normal text-ink/55">{hint}</span> : null}
    </label>
  );
}

export function inputClassName() {
  return "w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition placeholder:text-ink/35 focus:border-pine focus:ring-2 focus:ring-pine/15";
}

export function textareaClassName() {
  return `${inputClassName()} min-h-[120px] resize-y`;
}
