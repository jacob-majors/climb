import { PropsWithChildren } from "react";
import { clsx } from "clsx";

type CardProps = PropsWithChildren<{
  className?: string;
}>;

export function Card({ className, children }: CardProps) {
  return <div className={clsx("rounded-[24px] border border-ink/10 bg-white p-4 shadow-card sm:rounded-[28px] sm:p-6", className)}>{children}</div>;
}
