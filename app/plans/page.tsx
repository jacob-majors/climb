import { SectionHeading } from "@/components/section-heading";
import { Card } from "@/components/ui/card";
import { SavedPlanCard } from "@/components/saved-plan-card";
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
            <SavedPlanCard
              key={plan.id}
              plan={{
                id: plan.id,
                title: plan.title,
                dateRangeLabel: `${formatDate(plan.startDate)} - ${formatDate(plan.endDate)}`,
                summary: plan.summary,
                totalLoadScore: plan.totalLoadScore,
              }}
            />
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
