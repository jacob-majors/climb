import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, Circle, Play } from "lucide-react";
import { ClimbTimer } from "@/components/climb-timer";
import { TrainSessionWorkbench } from "@/components/train-session-workbench";
import { Card } from "@/components/ui/card";
import { getOrCreateDbUser } from "@/lib/auth";
import { getActiveAthlete } from "@/lib/data";
import { formatSessionDuration, formatSessionType, intensityClass, intensityLabel } from "@/lib/format";
import { getUpcomingSession } from "@/lib/plan-progress";
import { buildPlanAdvice } from "@/lib/plan-advisor";

const WARMUP_ITEMS = [
  "Leg swings forward/back",
  "Leg swings side to side",
  "Open the gate",
  "Arm swings",
  "Arm circles",
  "Wrist circles",
  "Shoulder rolls",
];

export default async function TrainPage() {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");

  const athlete = await getActiveAthlete(userId);
  if (!athlete?.scheduleConstraint) redirect("/profile");

  const schedule = athlete.scheduleConstraint;
  const currentPlan = athlete.trainingPlans[0] ?? null;
  const sessionEntry = getUpcomingSession(currentPlan, schedule.trainingAvailability);

  const weekSessions = currentPlan?.sessions
    .filter((s) => s.durationMinutes > 0)
    .sort((a, b) => a.dayIndex - b.dayIndex) ?? [];

  const advice = currentPlan
    ? buildPlanAdvice(weekSessions.map((s) => ({
        dayIndex: s.dayIndex,
        dayLabel: s.dayLabel,
        sessionType: s.sessionType,
        intensity: s.intensity,
        loadScore: s.loadScore,
        durationMinutes: s.durationMinutes,
      })))
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Session hero */}
      {sessionEntry ? (
        <div className="rounded-[28px] bg-[linear-gradient(135deg,#1d3a33_0%,#274E45_100%)] p-6 text-chalk shadow-[0_20px_60px_rgba(16,36,32,0.22)]">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-chalk/50">
            {sessionEntry.session.dayLabel}
            {sessionEntry.windowLabel ? ` · ${sessionEntry.windowLabel}` : ""}
          </p>
          <p className="mt-2 text-2xl font-bold leading-tight">{sessionEntry.session.title}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-chalk/10 px-3 py-1 text-xs font-semibold text-chalk/80">
              {formatSessionType(sessionEntry.session.sessionType)}
            </span>
            <span className="rounded-full bg-chalk/10 px-3 py-1 text-xs font-semibold text-chalk/80">
              {formatSessionDuration(sessionEntry.session.durationMinutes)}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${intensityClass(sessionEntry.session.intensity)}`}>
              {intensityLabel(sessionEntry.session.intensity)}
            </span>
          </div>

          <Link
            href={`/sessions/${sessionEntry.session.id}`}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-chalk px-5 py-2.5 text-sm font-bold text-pine transition hover:bg-chalk/90"
          >
            <Play className="h-4 w-4" />
            Start session
          </Link>
        </div>
      ) : (
        <div className="rounded-[28px] border border-ink/10 bg-white/80 p-6">
          <p className="text-sm font-semibold text-ink">No upcoming session</p>
          <p className="mt-1 text-sm text-ink/55">Generate a plan from the dashboard to see your next block here.</p>
          <Link href="/dashboard" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-pine hover:text-pine/70 transition-colors">
            Go to dashboard <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Main work + Warmup/Cooldown */}
      {sessionEntry && (
        <Card className="space-y-4">
          {sessionEntry.session.mainWork && (
            <div className="rounded-[24px] bg-mist p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-pine">Plan</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl border border-ink/8 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/35">Goal</p>
                  <p className="mt-2 text-sm font-semibold text-ink">{formatSessionType(sessionEntry.session.sessionType)}</p>
                </div>
                <div className="rounded-2xl border border-ink/8 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/35">How hard</p>
                  <p className="mt-2 text-sm font-semibold text-ink">{intensityLabel(sessionEntry.session.intensity)}</p>
                </div>
              </div>
            </div>
          )}

          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3">
              <p className="text-xs font-semibold text-ink/60">Warmup</p>
              <span className="text-[10px] text-ink/30 transition-transform group-open:rotate-180">▼</span>
            </summary>
            <div className="px-4 pb-4 space-y-1.5">
              {WARMUP_ITEMS.map((item) => (
                <p key={item} className="flex items-center gap-2 text-xs text-ink/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-pine/40 flex-shrink-0" />
                  {item}
                </p>
              ))}
              {sessionEntry.session.warmup && (
                <div className="mt-2 rounded-2xl border border-ink/8 bg-mist/40 px-3 py-2.5">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/35">Extra today</p>
                  <p className="mt-1 text-xs leading-5 text-ink/55">{sessionEntry.session.warmup}</p>
                </div>
              )}
            </div>
          </details>

          <TrainSessionWorkbench
            sessionId={sessionEntry.session.id}
            sessionTitle={sessionEntry.session.title}
            mainWork={sessionEntry.session.mainWork}
            cooldown={sessionEntry.session.cooldown}
            whyChosen={sessionEntry.session.whyChosen}
          />
        </Card>
      )}

      {/* This week sessions */}
      {weekSessions.length > 0 && (
        <div>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.2em] text-ink/40">This week</p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {weekSessions.map((s) => {
              const isActive = s.id === sessionEntry?.session.id;
              return (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className={`flex-shrink-0 rounded-2xl border px-4 py-3 text-left transition min-w-[140px] ${
                    isActive
                      ? "border-pine/30 bg-pine/8 text-pine"
                      : "border-ink/10 bg-white/70 text-ink hover:border-pine/20"
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40">{s.dayLabel}</p>
                  <p className="mt-1 text-xs font-semibold leading-snug">{s.title}</p>
                  <p className="mt-1 text-[10px] text-ink/45">{formatSessionDuration(s.durationMinutes)}</p>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* AI plan check */}
      {advice && (
        <Card className="space-y-3">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full flex-shrink-0 ${
              advice.status === "good" ? "bg-emerald-500" :
              advice.status === "warning" ? "bg-amber-400" : "bg-red-500"
            }`} />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">Plan check</p>
          </div>
          <p className="text-sm font-semibold text-ink">{advice.headline}</p>
          {advice.insights.slice(1).map((insight, i) => (
            <p key={i} className="text-sm text-ink/65">{insight}</p>
          ))}
          {advice.tweaks.length > 0 && (
            <div className="space-y-1.5 border-t border-ink/8 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-pine">Suggested tweaks</p>
              {advice.tweaks.map((tweak, i) => (
                <p key={i} className="flex items-start gap-2 text-xs leading-5 text-ink/65">
                  <span className="mt-0.5 text-pine flex-shrink-0">→</span>
                  {tweak}
                </p>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Interval timer */}
      <Card className="space-y-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-pine">Interval timer</p>
          <p className="mt-1 text-sm font-semibold text-ink">Hangboard warmup</p>
          <p className="text-xs text-ink/50">7 on / 5 rest — move down edge sizes each round.</p>
        </div>

        <ClimbTimer
          storageKey="climb:train-timer"
          defaultConfig={{
            rounds: 8,
            phases: [
              { id: "hang", label: "Hang", durationSec: 7, tone: "clay" },
              { id: "reset", label: "Reset", durationSec: 5, tone: "pine" },
            ],
          }}
        />
      </Card>
    </div>
  );
}
