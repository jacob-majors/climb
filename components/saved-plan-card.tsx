"use client";

import Link from "next/link";
import { useRef } from "react";
import { deletePlanAction, duplicatePlanAction } from "@/app/actions";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";

type SavedPlanCardProps = {
  plan: {
    id: string;
    title: string;
    dateRangeLabel: string;
    summary: string;
    totalLoadScore: number;
  };
};

export function SavedPlanCard({ plan }: SavedPlanCardProps) {
  const deleteFormRef = useRef<HTMLFormElement>(null);

  function handleContextMenu(event: React.MouseEvent<HTMLDivElement>) {
    event.preventDefault();

    const confirmed = window.confirm(`Delete "${plan.title}"?\n\nThis will permanently remove the saved week.`);
    if (!confirmed) return;

    deleteFormRef.current?.requestSubmit();
  }

  return (
    <div onContextMenu={handleContextMenu}>
      <Card className="space-y-4 transition hover:border-pine/20">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-ink">{plan.title}</h3>
            <p className="mt-2 text-sm text-ink/65">
              {plan.dateRangeLabel} • load {plan.totalLoadScore}
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">{plan.summary}</p>
            <p className="mt-3 text-xs font-medium text-ink/45">Right-click this saved week to delete it.</p>
          </div>
          <div className="flex gap-3">
            <Link href={`/plans/${plan.id}`} className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold text-ink">
              Open
            </Link>
            <form action={duplicatePlanAction}>
              <input type="hidden" name="planId" value={plan.id} />
              <SubmitButton label="Duplicate week" pendingLabel="Duplicating..." className="bg-pine hover:bg-ink" />
            </form>
          </div>
        </div>

        <form ref={deleteFormRef} action={deletePlanAction} className="hidden">
          <input type="hidden" name="planId" value={plan.id} />
        </form>
      </Card>
    </div>
  );
}
