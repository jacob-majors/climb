"use client";

export function PlanPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full border border-ink/15 px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink hover:bg-chalk"
    >
      Printable view / PDF
    </button>
  );
}
