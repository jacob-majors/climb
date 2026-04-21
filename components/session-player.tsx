"use client";

import { useRef, useState, useTransition } from "react";
import { Activity, Clock3, Flag, Gauge, ListChecks, Zap } from "lucide-react";
import { logSessionSurveyAction } from "@/app/actions";
import { ClimbTimer } from "@/components/climb-timer";
import { formatSessionDuration } from "@/lib/format";

type SessionData = {
  id: string;
  title: string;
  planTitle: string;
  sessionTypeLabel: string;
  intensityLabel: string;
  loadScore: number;
  warmup: string;
  mainWork: string;
  cooldown: string;
  durationMinutes: number;
  scheduledWindowLabel?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  recoveryNotes: string;
  whyChosen: string;
  coach: {
    goal: string;
    effort: string;
    pacing: string;
    win: string;
  };
};

const SECTIONS = ["overview", "warmup", "main", "survey"] as const;
type SectionId = (typeof SECTIONS)[number];

const SECTION_LABELS: Record<SectionId, string> = {
  overview: "Overview",
  warmup: "Warm-up",
  main: "What to do",
  survey: "How did it go?",
};

function formatClock(value?: string | null) {
  if (!value) return null;
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const suffix = hours >= 12 ? "PM" : "AM";
  const twelve = hours % 12 || 12;
  return `${twelve}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function splitIntoSteps(text: string, maxItems = 4) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?:\.\s+|\n+|•|;)/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, maxItems);
}

function buildWarmupFlow(session: SessionData) {
  return [
    {
      title: "Get warm",
      detail: "5-10 minutes of easy movement: bike, brisk walk, light jog, or easy traversing.",
      duration: "5-10 min",
    },
    {
      title: "Open the body",
      detail: "Shoulders, wrists, hips, and ankles. Keep it smooth, not aggressive.",
      duration: "3-5 min",
    },
    {
      title: "Easy climbing",
      detail: "Climb well below your limit and gradually add bigger moves and stronger pulling.",
      duration: "10-15 min",
    },
    {
      title: "Session primer",
      detail: session.warmup || "Do 2-3 specific rehearsal sets before the main work starts.",
      duration: "5-10 min",
    },
  ];
}

// ── Scale picker (inline, compact) ────────────────────────────────────────────

function ScaleRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-ink/50">{label}</p>
      <div className="flex gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={`h-9 w-9 rounded-full text-xs font-semibold transition-all ${
              n === value ? "bg-pine text-chalk scale-110" : n < value ? "bg-pine/20 text-pine" : "bg-ink/6 text-ink/40 hover:bg-ink/12"
            }`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function SessionPlayer({ session }: { session: SessionData }) {
  const [sectionIndex, setSectionIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [survey, setSurvey] = useState({
    skin: 7, soreness: 3, energy: 7, actualMinutes: session.durationMinutes, notes: "",
  });

  const currentSection = SECTIONS[sectionIndex];
  const hasHangboard = session.durationMinutes > 0;
  const startX = useRef<number | null>(null);
  const warmupFlow = buildWarmupFlow(session);
  const mainSteps = splitIntoSteps(session.mainWork);

  // Swipe to advance
  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (startX.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    startX.current = null;
    if (dx < -60 && sectionIndex < SECTIONS.length - 1) setSectionIndex((i) => i + 1);
    if (dx > 60 && sectionIndex > 0) setSectionIndex((i) => i - 1);
  }

  function advance() { setSectionIndex((i) => Math.min(i + 1, SECTIONS.length - 1)); }
  function back() { setSectionIndex((i) => Math.max(i - 1, 0)); }

  function handleSubmit(status: "COMPLETED" | "MODIFIED" | "SKIPPED") {
    const fd = new FormData();
    fd.append("sessionId", session.id);
    fd.append("completionStatus", status);
    fd.append("actualDurationMinutes", String(survey.actualMinutes));
    fd.append("completionNotes", survey.notes);
    fd.append("skinQuality", String(survey.skin));
    fd.append("sorenessLevel", String(survey.soreness));
    fd.append("energyLevel", String(survey.energy));
    startTransition(() => { logSessionSurveyAction(fd); });
  }

  const sectionContent: Record<SectionId, string> = {
    overview: "",
    warmup: session.warmup,
    main: session.mainWork,
    survey: "",
  };

  return (
    <div
      className="min-h-[calc(100vh-8rem)] flex flex-col select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Header ── */}
      <div className="sticky top-0 z-10 bg-chalk/90 backdrop-blur border-b border-ink/8 px-4 py-3">
        <p className="text-xs text-ink/45 font-medium">{session.planTitle}</p>
        <p className="text-sm font-semibold text-ink truncate">{session.title}</p>
        <p className="mt-1 text-xs text-ink/50">
          {session.sessionTypeLabel} • {session.intensityLabel} • load {session.loadScore}
        </p>
        {/* Section dots */}
        <div className="flex gap-1.5 mt-2">
          {SECTIONS.map((s, i) => (
            <button key={s} type="button" onClick={() => setSectionIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === sectionIndex ? "bg-pine w-6" : i < sectionIndex ? "bg-pine/40 w-3" : "bg-ink/15 w-3"
              }`} />
          ))}
        </div>
      </div>

      {/* ── Section content ── */}
      <div className="flex-1 px-4 py-5 space-y-4 overflow-y-auto">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine/70">
          {SECTIONS.indexOf(currentSection) + 1} / {SECTIONS.length} · {SECTION_LABELS[currentSection]}
        </p>

        {currentSection === "overview" && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] border border-pine/10 bg-pine/5 p-4">
                <Clock3 className="h-4 w-4 text-pine" />
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-pine">Time</p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {session.scheduledStartTime && session.scheduledEndTime
                    ? `${formatClock(session.scheduledStartTime)}-${formatClock(session.scheduledEndTime)}`
                    : formatSessionDuration(session.durationMinutes)}
                </p>
              </div>
              <div className="rounded-[18px] border border-ink/10 bg-white p-4">
                <Gauge className="h-4 w-4 text-pine" />
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-pine">How hard</p>
                <p className="mt-1 text-sm font-semibold text-ink">{session.intensityLabel}</p>
              </div>
              <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 p-4">
                <Flag className="h-4 w-4 text-emerald-700" />
                <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Win today</p>
                <p className="mt-1 text-sm text-emerald-950/80">{session.coach.win}</p>
              </div>
            </div>

            <div className="rounded-[20px] border border-ink/10 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Simple plan</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[16px] border border-pine/10 bg-pine/5 p-4">
                  <Activity className="h-4 w-4 text-pine" />
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-pine">Goal</p>
                  <p className="mt-1 text-sm leading-6 text-ink">{session.coach.goal}</p>
                </div>
                <div className="rounded-[16px] border border-ink/10 bg-white p-4">
                  <Zap className="h-4 w-4 text-pine" />
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-pine">Effort</p>
                  <p className="mt-1 text-sm leading-6 text-ink">{session.coach.effort}</p>
                </div>
                <div className="rounded-[16px] border border-ink/10 bg-white p-4">
                  <ListChecks className="h-4 w-4 text-pine" />
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-pine">Keep in mind</p>
                  <p className="mt-1 text-sm leading-6 text-ink">{session.coach.pacing}</p>
                </div>
              </div>
              <details className="mt-4 rounded-[16px] border border-ink/8 bg-mist/40 p-4">
                <summary className="cursor-pointer list-none text-sm font-semibold text-ink">Why this session is here</summary>
                <p className="mt-3 text-sm leading-6 text-ink/75">{session.whyChosen}</p>
              </details>
            </div>
          </div>
        )}

        {currentSection !== "survey" && currentSection !== "overview" && (
          <>
            {currentSection === "warmup" && (
              <>
                {hasHangboard ? (
                  <>
                    <div className="rounded-[20px] border border-clay/10 bg-clay/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">1. Hangboard warm-up</p>
                      <p className="mt-2 text-sm leading-6 text-ink/75">
                        Start with a short finger activation block before the bigger warm-up. Use the built-in timer and let the beeps cue each switch.
                      </p>
                    </div>
                    <ClimbTimer
                      title="Hangboard timer"
                      description="Customize each section, save your default flow, and run the warm-up without leaving the session."
                      storageKey="climb:session-hang-timer"
                    />
                  </>
                ) : null}
                <div className="grid gap-3">
                  {warmupFlow.map((item, index) => (
                    <div key={item.title} className="rounded-[18px] border border-ink/10 bg-white/80 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pine text-sm font-semibold text-chalk">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-ink">{item.title}</p>
                          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-pine/70">{item.duration}</p>
                          <p className="mt-2 text-sm leading-6 text-ink/75">{item.detail}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <details className="rounded-[18px] border border-ink/10 bg-white px-4 py-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-ink">Full warm-up note</summary>
                  <p className="mt-3 text-sm leading-6 text-ink/70 whitespace-pre-line">{sectionContent[currentSection]}</p>
                </details>
              </>
            )}

            {currentSection === "main" && (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[18px] border border-pine/10 bg-pine/5 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pine">Goal</p>
                    <p className="mt-2 text-sm leading-6 text-ink">{session.coach.goal}</p>
                  </div>
                  <div className="rounded-[18px] border border-ink/10 bg-white p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pine">How hard</p>
                    <p className="mt-2 text-sm leading-6 text-ink">{session.coach.effort}</p>
                  </div>
                  <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">Win</p>
                    <p className="mt-2 text-sm leading-6 text-emerald-950/80">{session.coach.win}</p>
                  </div>
                </div>

                <div className="rounded-[20px] bg-white/80 border border-ink/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">What to do</p>
                  <div className="mt-3 space-y-3">
                    {(mainSteps.length ? mainSteps : [sectionContent[currentSection]]).map((step, index) => (
                      <div key={`${index}-${step}`} className="rounded-[16px] border border-ink/8 bg-mist/30 p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-semibold text-chalk">
                            {index + 1}
                          </div>
                          <p className="text-sm leading-6 text-ink">{step}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[20px] border border-ink/10 bg-mist/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Finish</p>
                  <p className="mt-2 text-sm leading-6 text-ink">{session.cooldown}</p>
                </div>

                <details className="rounded-[16px] border border-ink/10 bg-white px-4 py-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-ink">Full coach wording</summary>
                  <p className="mt-3 text-sm leading-6 text-ink/70 whitespace-pre-line">{sectionContent[currentSection]}</p>
                </details>
              </>
            )}
          </>
        )}

        {currentSection === "survey" && (
          <div className="space-y-5">
            <ScaleRow label="Skin quality" value={survey.skin} onChange={(v) => setSurvey((s) => ({ ...s, skin: v }))} />
            <ScaleRow label="Soreness" value={survey.soreness} onChange={(v) => setSurvey((s) => ({ ...s, soreness: v }))} />
            <ScaleRow label="Energy after" value={survey.energy} onChange={(v) => setSurvey((s) => ({ ...s, energy: v }))} />

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-ink/50">Actual duration (min)</p>
              <input type="number" value={survey.actualMinutes}
                onChange={(e) => setSurvey((s) => ({ ...s, actualMinutes: Number(e.target.value) }))}
                className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-pine" />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-ink/50">Notes (optional)</p>
              <textarea value={survey.notes} onChange={(e) => setSurvey((s) => ({ ...s, notes: e.target.value }))}
                placeholder="How the session felt, what you worked, who you climbed with…"
                rows={3}
                className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm outline-none resize-none focus:border-pine placeholder:text-ink/30" />
            </div>

            {session.recoveryNotes && (
              <div className="rounded-[16px] bg-amber-50 border border-amber-200 px-4 py-3">
                <p className="text-xs font-semibold text-amber-700 mb-1">Recovery note</p>
                <p className="text-sm text-amber-900/80">{session.recoveryNotes}</p>
              </div>
            )}
            <div className="rounded-[16px] border border-pine/15 bg-pine/5 px-4 py-3">
              <p className="text-xs font-semibold text-pine mb-1">Next step</p>
              <p className="text-sm text-ink/75">When you save this session, the app will open route analysis with the session details already carried over.</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom actions ── */}
      <div className="sticky bottom-0 border-t border-ink/8 bg-chalk/90 backdrop-blur px-4 py-4 space-y-2">
        {currentSection === "survey" ? (
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={() => handleSubmit("SKIPPED")} disabled={isPending}
              className="rounded-full border border-clay/20 py-3 text-sm font-semibold text-clay/70 hover:border-clay transition disabled:opacity-40">
              Skipped
            </button>
            <button type="button" onClick={() => handleSubmit("MODIFIED")} disabled={isPending}
              className="rounded-full border border-pine/20 py-3 text-sm font-semibold text-pine hover:border-pine transition disabled:opacity-40">
              Adjusted
            </button>
            <button type="button" onClick={() => handleSubmit("COMPLETED")} disabled={isPending}
              className="rounded-full bg-pine py-3 text-sm font-semibold text-chalk hover:bg-ink transition disabled:opacity-40">
              {isPending ? "Saving…" : "Done ✓"}
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            {sectionIndex > 0 && (
              <button type="button" onClick={back}
                className="rounded-full border border-ink/10 px-5 py-3 text-sm font-semibold text-ink/50 hover:text-ink transition">
                ←
              </button>
            )}
            <button type="button" onClick={advance}
              className="flex-1 rounded-full bg-pine py-3 text-sm font-semibold text-chalk hover:bg-ink transition">
              {sectionIndex === SECTIONS.length - 2 ? "Finish & log →" : "Complete section →"}
            </button>
          </div>
        )}
        <p className="text-center text-xs text-ink/30">Swipe left / right to navigate</p>
      </div>
    </div>
  );
}
