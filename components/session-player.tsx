"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { logSessionSurveyAction } from "@/app/actions";

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
  main: "Main work",
  survey: "How did it go?",
};

// ── Hangboard Timer ───────────────────────────────────────────────────────────

function HangTimer() {
  const [hangSec, setHangSec] = useState(7);
  const [restSec, setRestSec] = useState(180);
  const [phase, setPhase] = useState<"idle" | "hang" | "rest">("idle");
  const [remaining, setRemaining] = useState(7);
  const [sets, setSets] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  function beep(duration = 0.18, frequency = 880) {
    if (typeof window === "undefined") return;
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = audioRef.current ?? new AudioCtx();
    audioRef.current = ctx;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.0001;
    oscillator.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  function clearTimer() {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  function start() {
    beep(0.12, 620);
    setPhase("hang");
    setRemaining(hangSec);
    clearTimer();
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearTimer();
          beep(0.18, 980);
          setPhase("rest");
          setRemaining(restSec);
          setSets((s) => s + 1);
          intervalRef.current = setInterval(() => {
            setRemaining((r2) => {
              if (r2 <= 1) {
                clearTimer();
                beep(0.22, 720);
                setPhase("idle");
                return hangSec;
              }
              return r2 - 1;
            });
          }, 1000);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  }

  function reset() {
    clearTimer();
    setPhase("idle");
    setRemaining(hangSec);
  }

  useEffect(() => () => {
    clearTimer();
    audioRef.current?.close().catch(() => undefined);
  }, []);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const display = mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${secs}`;

  return (
    <div className="rounded-[20px] border border-ink/10 bg-white p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-ink">Hangboard timer</p>
        <span className="text-xs text-ink/40">{sets} set{sets !== 1 ? "s" : ""} done • beep cues on</span>
      </div>

      {/* Big time display */}
      <div className={`text-center py-4 rounded-2xl transition-colors ${
        phase === "hang" ? "bg-clay/10" : phase === "rest" ? "bg-moss/10" : "bg-ink/4"
      }`}>
        <p className={`text-5xl font-black tabular-nums ${
          phase === "hang" ? "text-clay" : phase === "rest" ? "text-pine" : "text-ink/50"
        }`}>{display}</p>
        <p className={`mt-1 text-xs font-semibold uppercase tracking-wider ${
          phase === "hang" ? "text-clay/70" : phase === "rest" ? "text-pine/70" : "text-ink/35"
        }`}>
          {phase === "hang" ? "HANG" : phase === "rest" ? "REST" : "READY"}
        </p>
      </div>

      {/* Duration controls */}
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-ink/50">
          Hang (sec)
          <input type="number" value={hangSec} min={3} max={30}
            onChange={(e) => { setHangSec(Number(e.target.value)); if (phase === "idle") setRemaining(Number(e.target.value)); }}
            className="mt-1 w-full rounded-xl border border-ink/10 bg-mist/30 px-3 py-1.5 text-sm outline-none focus:border-pine" />
        </label>
        <label className="text-xs text-ink/50">
          Rest (sec)
          <input type="number" value={restSec} min={30} max={600}
            onChange={(e) => setRestSec(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-ink/10 bg-mist/30 px-3 py-1.5 text-sm outline-none focus:border-pine" />
        </label>
      </div>

      <div className="flex gap-2">
        {phase === "idle" ? (
          <button type="button" onClick={start}
            className="flex-1 rounded-full bg-pine px-4 py-2.5 text-sm font-semibold text-chalk transition hover:bg-ink">
            Start
          </button>
        ) : (
          <button type="button" onClick={reset}
            className="flex-1 rounded-full border border-ink/10 px-4 py-2.5 text-sm font-semibold text-ink/60 hover:text-ink transition">
            Reset
          </button>
        )}
      </div>
    </div>
  );
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-pine/10 bg-pine/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pine">Today</p>
                <p className="mt-2 text-sm leading-6 text-ink">
                  {session.scheduledStartTime && session.scheduledEndTime
                    ? `${session.scheduledWindowLabel || "Scheduled"} • ${formatClock(session.scheduledStartTime)}-${formatClock(session.scheduledEndTime)}`
                    : `${session.durationMinutes} minute session`}
                </p>
              </div>
              <div className="rounded-[18px] border border-ink/10 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pine">Flow</p>
                <p className="mt-2 text-sm leading-6 text-ink">
                  Hangboard activation, advanced warm-up, main activity, then route analysis.
                </p>
              </div>
            </div>

            <div className="rounded-[20px] border border-ink/10 bg-white/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Session overview</p>
              <div className="mt-3 space-y-3 text-sm text-ink/75">
                <p><span className="font-semibold text-ink">Why this session:</span> {session.whyChosen}</p>
                <p><span className="font-semibold text-ink">Goal:</span> {session.coach.goal}</p>
                <p><span className="font-semibold text-ink">Pacing:</span> {session.coach.pacing}</p>
                <p><span className="font-semibold text-ink">Win:</span> {session.coach.win}</p>
              </div>
            </div>
          </div>
        )}

        {currentSection !== "survey" && currentSection !== "overview" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-pine/10 bg-pine/5 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pine">Goal</p>
                <p className="mt-2 text-sm leading-6 text-ink">{session.coach.goal}</p>
              </div>
              <div className="rounded-[18px] border border-ink/10 bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-pine">How Hard</p>
                <p className="mt-2 text-sm leading-6 text-ink">{session.coach.effort}</p>
              </div>
            </div>

            {currentSection === "warmup" && hasHangboard && (
              <>
                <div className="rounded-[20px] border border-clay/10 bg-clay/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-clay">1. Hangboard warm-up</p>
                  <p className="mt-2 text-sm leading-6 text-ink/75">
                    Start with a short finger activation block before the bigger warm-up. Use the built-in timer and let the beeps cue each switch.
                  </p>
                </div>
                <HangTimer />
                <div className="rounded-[20px] bg-white/80 border border-ink/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">2. Advanced warm-up</p>
                  <p className="mt-2 text-base leading-7 text-ink whitespace-pre-line">
                    {sectionContent[currentSection]}
                  </p>
                </div>
              </>
            )}

            {currentSection === "main" && (
              <>
                <div className="rounded-[20px] bg-white/80 border border-ink/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">3. Main activity</p>
                  <p className="mt-2 text-base leading-7 text-ink whitespace-pre-line">
                    {sectionContent[currentSection]}
                  </p>
                </div>
                <div className="rounded-[20px] border border-ink/10 bg-mist/30 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">4. Finish and log</p>
                  <p className="mt-2 text-base leading-7 text-ink whitespace-pre-line">
                    {session.cooldown}
                  </p>
                </div>
              </>
            )}

            {currentSection === "warmup" && (
              <div className="space-y-3">
                <div className="rounded-[16px] bg-pine/5 border border-pine/10 px-4 py-3">
                  <p className="text-xs font-semibold text-pine mb-1">Why this session</p>
                  <p className="text-sm text-ink/70 leading-relaxed">{session.whyChosen}</p>
                </div>
                <div className="rounded-[16px] border border-ink/10 bg-white px-4 py-3">
                  <p className="text-xs font-semibold text-pine mb-1">Pacing cue</p>
                  <p className="text-sm text-ink/70 leading-relaxed">{session.coach.pacing}</p>
                </div>
              </div>
            )}
            {currentSection === "main" && (
              <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3">
                <p className="text-xs font-semibold text-emerald-700 mb-1">What counts as a win</p>
                <p className="text-sm text-emerald-950/80 leading-relaxed">{session.coach.win}</p>
              </div>
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
