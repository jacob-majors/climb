import Link from "next/link";
import { redirect } from "next/navigation";
import { duplicatePlanAction } from "@/app/actions";
import { LoadChart } from "@/components/load-chart";
import { PeakGraph } from "@/components/peak-graph";
import { PlanScheduler } from "@/components/plan-scheduler";
import { PlanPrintButton } from "@/components/plan-print-button";
import { SectionHeading } from "@/components/section-heading";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate, formatSessionType, intensityClass, intensityLabel } from "@/lib/format";
import { getActiveAthlete, getPlan } from "@/lib/data";
import { getOrCreateDbUser } from "@/lib/auth";
import { buildPeakForecast } from "@/lib/peak-forecast";

function completionBadge(status: string) {
  switch (status) {
    case "COMPLETED":
      return { label: "Completed", className: "bg-pine/10 text-pine" };
    case "MODIFIED":
      return { label: "Adjusted", className: "bg-sandstone/35 text-clay" };
    case "SKIPPED":
      return { label: "Skipped", className: "bg-clay/10 text-clay" };
    default:
      return { label: "Planned", className: "bg-mist text-ink/70" };
  }
}

export default async function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await getPlan(id);

  if (!plan) {
    const userId = await getOrCreateDbUser();
    const athlete = userId ? await getActiveAthlete(userId) : null;
    const latestPlan = athlete?.trainingPlans[0];

    if (latestPlan) {
      redirect(`/plans/${latestPlan.id}`);
    }

    redirect("/dashboard");
  }

  const forecast = plan.user.scheduleConstraint
    ? buildPeakForecast({
        schedule: plan.user.scheduleConstraint,
        competitions: plan.user.competitionEvents,
        sessions: plan.sessions,
        planStartDate: plan.startDate,
      })
    : null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <SectionHeading
            eyebrow="Weekly plan"
            title={plan.title}
            description={`${formatDate(plan.startDate)} - ${formatDate(plan.endDate)} for ${plan.user.name}`}
          />
          <p className="max-w-4xl text-sm leading-6 text-ink/70">{plan.summary}</p>
        </div>
        <div className="no-print flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <PlanPrintButton />
          <form action={duplicatePlanAction}>
            <input type="hidden" name="planId" value={plan.id} />
            <SubmitButton label="Duplicate previous week" pendingLabel="Duplicating..." className="bg-pine hover:bg-ink" />
          </form>
          <Link href="/plans" className="rounded-full border border-ink/10 px-4 py-2 text-center text-sm font-semibold text-ink">
            Back to history
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <Card className="space-y-4">
            <h3 className="text-lg font-semibold text-ink">Why this week looks this way</h3>
            <p className="text-sm leading-6 text-ink/70">{plan.explanation}</p>
            <div className="rounded-2xl bg-mist p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">Main weakness</p>
              <p className="mt-2 text-sm text-ink">{plan.mainWeakness}</p>
            </div>
            <div className="rounded-2xl bg-mist p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">Key focus areas</p>
              <p className="mt-2 text-sm text-ink">{plan.keyFocusAreas}</p>
            </div>
          </Card>

          <LoadChart sessions={plan.sessions.map((session) => ({ dayLabel: session.dayLabel, loadScore: session.loadScore }))} />

          {forecast ? (
            <PeakGraph
              forecast={forecast}
              title="Predicted peak window"
              description="This forecast uses your current readiness plus the actual session load in this plan to estimate when you should feel sharpest."
            />
          ) : null}

          <Card className="space-y-4">
            <h3 className="text-lg font-semibold text-ink">Recovery and comp notes</h3>
            <p className="text-sm leading-6 text-ink/70">{plan.recoveryNotes}</p>
            <p className="text-sm leading-6 text-ink/70">{plan.compPrepNotes}</p>
            <p className="text-sm leading-6 text-ink/70">{plan.pushBackoffNotes}</p>
          </Card>
        </div>

        <div className="space-y-4">
          <PlanScheduler
            sessions={plan.sessions.map((session) => ({
              id: session.id,
              dayIndex: session.dayIndex,
              dayLabel: session.dayLabel,
              scheduledWindowLabel: session.scheduledWindowLabel,
              scheduledStartTime: session.scheduledStartTime,
              scheduledEndTime: session.scheduledEndTime,
              title: session.title,
              durationMinutes: session.durationMinutes,
              sessionType: session.sessionType,
              intensity: session.intensity,
              completionStatus: session.completionStatus,
              whyChosen: session.whyChosen,
            }))}
            trainingAvailabilityRaw={plan.user.scheduleConstraint?.trainingAvailability}
            weeklyCalendarRaw={plan.user.scheduleConstraint?.weeklyCalendar}
          />

          {plan.sessions.map((session) => (
            <Card key={session.id} className="space-y-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">{session.dayLabel}</p>
                  <h3 className="mt-1 text-lg font-semibold text-ink sm:text-xl">{session.title}</h3>
                  <p className="mt-2 text-sm text-ink/55">
                    {formatSessionType(session.sessionType)} • {session.durationMinutes} min
                    {session.scheduledStartTime && session.scheduledEndTime ? ` • ${session.scheduledWindowLabel || "Scheduled"} ${session.scheduledStartTime}-${session.scheduledEndTime}` : ""}
                    {session.actualDurationMinutes && session.actualDurationMinutes !== session.durationMinutes ? ` • logged ${session.actualDurationMinutes} min` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${completionBadge(session.completionStatus).className}`}>
                    {completionBadge(session.completionStatus).label}
                  </span>
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${intensityClass(session.intensity)}`}>
                    {intensityLabel(session.intensity)}
                  </span>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">Warm-up</p>
                  <p className="mt-2 text-sm leading-6 text-ink/70">{session.warmup}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">Main work</p>
                  <p className="mt-2 text-sm leading-6 text-ink/70">{session.mainWork}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">Cool-down</p>
                  <p className="mt-2 text-sm leading-6 text-ink/70">{session.cooldown}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">Why today</p>
                  <p className="mt-2 text-sm leading-6 text-ink/70">{session.whyChosen}</p>
                </div>
              </div>
              <div className="rounded-2xl bg-mist p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">Recovery note</p>
                <p className="mt-2 text-sm leading-6 text-ink/70">{session.recoveryNotes}</p>
                {session.completionNotes ? <p className="mt-3 text-sm leading-6 text-ink/70">Logged note: {session.completionNotes}</p> : null}
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
