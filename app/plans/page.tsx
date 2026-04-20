import Link from "next/link";
import { duplicatePlanAction } from "@/app/actions";
import { SectionHeading } from "@/components/section-heading";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/format";
import { getActiveAthlete } from "@/lib/data";
import { getOrCreateDbUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function SavedPlansPage() {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");
  const athlete = await getActiveAthlete(userId);

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Saved plans"
        title="Training plan history"
        description="Use this page to revisit previous weekly plans, duplicate one as a starting point, or export a printable version."
      />

      {athlete?.trainingPlans.length ? (
        <div className="grid gap-4">
          {athlete.trainingPlans.map((plan) => (
            <Card key={plan.id} className="space-y-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-ink">{plan.title}</h3>
                  <p className="mt-2 text-sm text-ink/65">
                    {formatDate(plan.startDate)} - {formatDate(plan.endDate)} • load {plan.totalLoadScore}
                  </p>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/70">{plan.summary}</p>
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
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-sm text-ink/70">No saved plans yet. Generate one from the dashboard once the athlete setup is ready.</p>
        </Card>
      )}
    </div>
  );
}
