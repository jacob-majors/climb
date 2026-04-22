"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, X } from "lucide-react";

type TimerPhase = {
  id: string;
  label: string;
  durationSec: number;
  tone: "clay" | "pine" | "ink";
};

type TimerConfig = {
  rounds: number;
  phases: TimerPhase[];
};

type ClimbTimerProps = {
  title?: string;
  description?: string;
  storageKey?: string;
  defaultConfig?: TimerConfig;
};

const DEFAULT_CONFIG: TimerConfig = {
  rounds: 6,
  phases: [
    { id: "prepare", label: "Prepare", durationSec: 10, tone: "ink" },
    { id: "hang", label: "Hang", durationSec: 7, tone: "clay" },
    { id: "rest", label: "Rest", durationSec: 53, tone: "pine" },
  ],
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toneClasses(tone: TimerPhase["tone"], active: boolean) {
  switch (tone) {
    case "clay":
      return active ? "bg-clay/10 text-clay" : "bg-clay/6 text-clay/75";
    case "pine":
      return active ? "bg-pine/10 text-pine" : "bg-pine/6 text-pine/75";
    default:
      return active ? "bg-ink/8 text-ink" : "bg-ink/5 text-ink/65";
  }
}

// Fullscreen background colors per tone
const TONE_BG: Record<TimerPhase["tone"], string> = {
  clay: "#B8481E",
  pine: "#1E6044",
  ink: "#111214",
};

const TONE_ACCENT: Record<TimerPhase["tone"], string> = {
  clay: "rgba(255,255,255,0.18)",
  pine: "rgba(255,255,255,0.18)",
  ink: "rgba(255,255,255,0.12)",
};

function totalCycleSeconds(config: TimerConfig) {
  return config.phases.reduce((sum, phase) => sum + phase.durationSec, 0);
}

function haptic(pattern: number | number[]) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export function ClimbTimer({
  title = "Climbing timer",
  description = "Tune the lengths, hit start, and let the cues move you through each round.",
  storageKey = "climb:timer-config",
  defaultConfig = DEFAULT_CONFIG,
}: ClimbTimerProps) {
  const [config, setConfig] = useState<TimerConfig>(defaultConfig);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [roundIndex, setRoundIndex] = useState(0);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [remaining, setRemaining] = useState(defaultConfig.phases[0].durationSec);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [flash, setFlash] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<AudioContext | null>(null);

  const activePhase = config.phases[phaseIndex] ?? config.phases[0];
  const totalSeconds = useMemo(() => totalCycleSeconds(config) * config.rounds, [config]);
  const elapsedSeconds = useMemo(() => {
    const completedRounds = totalCycleSeconds(config) * roundIndex;
    const completedPhases = config.phases
      .slice(0, phaseIndex)
      .reduce((sum, phase) => sum + phase.durationSec, 0);
    const currentProgress = activePhase.durationSec - remaining;
    return completedRounds + completedPhases + Math.max(currentProgress, 0);
  }, [activePhase.durationSec, config, phaseIndex, remaining, roundIndex]);
  const progressPercent = totalSeconds > 0 ? Math.min(100, (elapsedSeconds / totalSeconds) * 100) : 0;

  function clearTimer() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function beep(duration = 0.16, frequency = 880) {
    if (typeof window === "undefined") return;
    const AudioCtx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  function triggerFlash() {
    setFlash(true);
    setTimeout(() => setFlash(false), 180);
  }

  function resetTimer(nextConfig = config) {
    clearTimer();
    setIsRunning(false);
    setIsFinished(false);
    setRoundIndex(0);
    setPhaseIndex(0);
    setRemaining(nextConfig.phases[0]?.durationSec ?? 0);
  }

  function advancePhase() {
    setPhaseIndex((currentPhaseIndex) => {
      const nextPhaseIndex = currentPhaseIndex + 1;

      if (nextPhaseIndex < config.phases.length) {
        const nextPhase = config.phases[nextPhaseIndex];
        setRemaining(nextPhase.durationSec);
        beep(0.2, nextPhase.tone === "clay" ? 960 : nextPhase.tone === "pine" ? 680 : 560);
        haptic(150);
        triggerFlash();
        return nextPhaseIndex;
      }

      if (roundIndex + 1 < config.rounds) {
        const firstPhase = config.phases[0];
        setRoundIndex((v) => v + 1);
        setRemaining(firstPhase.durationSec);
        beep(0.24, 760);
        haptic([100, 60, 100]);
        triggerFlash();
        return 0;
      }

      clearTimer();
      setIsRunning(false);
      setIsFinished(true);
      beep(0.32, 1100);
      haptic([200, 100, 200, 100, 400]);
      return currentPhaseIndex;
    });
  }

  function startTimer() {
    if (isRunning) return;
    if (isFinished) resetTimer();
    setIsRunning(true);
    beep(0.14, 640);
    haptic(80);
  }

  function pauseTimer() {
    clearTimer();
    setIsRunning(false);
  }

  function skipPhase() {
    if (!isRunning) startTimer();
    advancePhase();
  }

  function updatePhaseDuration(index: number, value: number) {
    setConfig((current) => {
      const next = {
        ...current,
        phases: current.phases.map((phase, phaseIndex) =>
          phaseIndex === index
            ? { ...phase, durationSec: clampNumber(value || 0, 1, 600) }
            : phase,
        ),
      };
      if (!isRunning) {
        setRemaining(next.phases[phaseIndex]?.durationSec ?? next.phases[0].durationSec);
      }
      return next;
    });
  }

  function updatePhaseLabel(index: number, value: string) {
    setConfig((current) => ({
      ...current,
      phases: current.phases.map((phase, phaseIndex) =>
        phaseIndex === index ? { ...phase, label: value || phase.label } : phase,
      ),
    }));
  }

  useEffect(() => {
    if (!storageKey || typeof window === "undefined") {
      setIsHydrated(true);
      return;
    }
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as TimerConfig;
        if (parsed?.phases?.length) {
          setConfig(parsed);
          setRemaining(parsed.phases[0]?.durationSec ?? defaultConfig.phases[0].durationSec);
        }
      }
    } catch {
      // keep defaults
    } finally {
      setIsHydrated(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!isHydrated || !storageKey || typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, JSON.stringify(config));
  }, [config, isHydrated, storageKey]);

  useEffect(() => {
    if (!isRunning) {
      clearTimer();
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((current) => {
        if (current <= 1) {
          advancePhase();
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return clearTimer;
  }, [isRunning, config, roundIndex]);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isFullscreen]);

  useEffect(() => () => {
    clearTimer();
    audioRef.current?.close().catch(() => undefined);
  }, []);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${minutes}:${String(seconds).padStart(2, "0")}`;

  // ── Fullscreen overlay ────────────────────────────────────────────────────────

  if (isFullscreen) {
    const bg = isFinished ? "#1C1C1E" : TONE_BG[activePhase.tone];
    const accent = TONE_ACCENT[activePhase.tone];
    const nextPhase = config.phases[phaseIndex + 1];

    return (
      <div
        className="fixed inset-0 z-[9999] flex flex-col items-center justify-center select-none"
        style={{
          backgroundColor: bg,
          transition: "background-color 0.4s ease",
        }}
      >
        {/* Flash overlay on phase change */}
        <div
          className="pointer-events-none absolute inset-0 transition-opacity duration-150"
          style={{ backgroundColor: "white", opacity: flash ? 0.15 : 0 }}
        />

        {/* Exit button */}
        <button
          type="button"
          onClick={() => setIsFullscreen(false)}
          className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-full"
          style={{ backgroundColor: accent }}
        >
          <X className="h-5 w-5 text-white" />
        </button>

        {/* Round badge */}
        <div
          className="absolute top-5 left-5 rounded-full px-4 py-1.5 text-xs font-semibold text-white/80"
          style={{ backgroundColor: accent }}
        >
          Round {Math.min(roundIndex + 1, config.rounds)} / {config.rounds}
        </div>

        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ backgroundColor: "rgba(255,255,255,0.12)" }}>
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${progressPercent}%`, backgroundColor: "rgba(255,255,255,0.55)" }}
          />
        </div>

        {/* Main content */}
        <div className="flex flex-col items-center gap-6 px-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">
            {isFinished ? "Done" : activePhase.label}
          </p>

          <p
            className="tabular-nums font-black text-white leading-none"
            style={{ fontSize: "clamp(5rem, 22vw, 13rem)" }}
          >
            {display}
          </p>

          {!isFinished && (
            <p className="text-sm text-white/45">
              {nextPhase ? `${nextPhase.label} next` : "Last phase this round"}
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="absolute bottom-12 flex items-center gap-5">
          <button
            type="button"
            onClick={() => resetTimer()}
            className="rounded-full px-5 py-3 text-sm font-semibold text-white/60"
            style={{ backgroundColor: accent }}
          >
            Reset
          </button>

          {isRunning ? (
            <button
              type="button"
              onClick={pauseTimer}
              className="rounded-full px-8 py-4 text-base font-bold text-white"
              style={{ backgroundColor: accent, fontSize: "1rem" }}
            >
              Pause
            </button>
          ) : (
            <button
              type="button"
              onClick={startTimer}
              className="rounded-full px-8 py-4 text-base font-bold text-white"
              style={{ backgroundColor: "rgba(255,255,255,0.28)" }}
            >
              {isFinished ? "Restart" : "Start"}
            </button>
          )}

          <button
            type="button"
            onClick={skipPhase}
            className="rounded-full px-5 py-3 text-sm font-semibold text-white/60"
            style={{ backgroundColor: accent }}
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  // ── Normal (card) view ────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 rounded-[22px] border border-ink/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="mt-1 text-sm leading-6 text-ink/62">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full border border-ink/10 bg-mist/40 px-3 py-1 text-xs font-semibold text-ink/55">
            Round {Math.min(roundIndex + 1, config.rounds)} / {config.rounds}
          </div>
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            title="Fullscreen timer"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/10 bg-mist/40 text-ink/55 transition hover:border-pine/40 hover:text-pine"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-ink/10 bg-[#fcfaf4]">
        <div className="h-2 bg-ink/6">
          <div className="h-full bg-pine transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className={`px-5 py-6 text-center ${toneClasses(activePhase.tone, true)}`}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em]">
            {isFinished ? "Finished" : activePhase.label}
          </p>
          <p className="mt-3 text-5xl font-black tabular-nums">{display}</p>
          <p className="mt-2 text-sm">
            {isFinished
              ? "Nice. Reset or tweak the sections for the next block."
              : `${config.phases[phaseIndex + 1]?.label ?? "Last phase in the round"} is up next.`}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {config.phases.map((phase, index) => (
          <div
            key={phase.id}
            className={`rounded-[18px] border border-ink/10 p-3 ${toneClasses(phase.tone, index === phaseIndex && !isFinished)}`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">Section {index + 1}</p>
            <input
              type="text"
              value={phase.label}
              onChange={(event) => updatePhaseLabel(index, event.target.value)}
              className="mt-2 w-full rounded-xl border border-ink/10 bg-white/75 px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-pine"
            />
            <label className="mt-3 block text-xs text-ink/55">
              Duration (sec)
              <input
                type="number"
                min={1}
                max={600}
                value={phase.durationSec}
                onChange={(event) => updatePhaseDuration(index, Number(event.target.value))}
                className="mt-1 w-full rounded-xl border border-ink/10 bg-white/75 px-3 py-2 text-sm text-ink outline-none focus:border-pine"
              />
            </label>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
        <label className="block rounded-[18px] border border-ink/10 bg-mist/30 p-3 text-xs text-ink/55">
          Total rounds
          <input
            type="number"
            min={1}
            max={20}
            value={config.rounds}
            onChange={(event) =>
              setConfig((current) => ({
                ...current,
                rounds: clampNumber(Number(event.target.value) || 1, 1, 20),
              }))
            }
            className="mt-1 w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-pine"
          />
        </label>

        <div className="rounded-[18px] border border-ink/10 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Session math</p>
          <div className="mt-2 grid gap-2 text-sm text-ink/68 sm:grid-cols-3">
            <p>
              <span className="font-semibold text-ink">Each round:</span>{" "}
              {Math.floor(totalCycleSeconds(config) / 60)}m {String(totalCycleSeconds(config) % 60).padStart(2, "0")}s
            </p>
            <p>
              <span className="font-semibold text-ink">Total time:</span>{" "}
              {Math.floor(totalSeconds / 60)}m {String(totalSeconds % 60).padStart(2, "0")}s
            </p>
            <p>
              <span className="font-semibold text-ink">Beep cues:</span> every section change
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {isRunning ? (
          <button
            type="button"
            onClick={pauseTimer}
            className="rounded-full bg-ink px-5 py-2.5 text-sm font-semibold text-chalk transition hover:bg-pine"
          >
            Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={startTimer}
            className="rounded-full bg-pine px-5 py-2.5 text-sm font-semibold text-chalk transition hover:bg-ink"
          >
            {isFinished ? "Restart" : "Start"}
          </button>
        )}
        <button
          type="button"
          onClick={() => resetTimer()}
          className="rounded-full border border-ink/12 px-5 py-2.5 text-sm font-semibold text-ink/68 transition hover:border-pine hover:text-ink"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={skipPhase}
          className="rounded-full border border-clay/18 bg-clay/8 px-5 py-2.5 text-sm font-semibold text-clay transition hover:border-clay/35"
        >
          Skip section
        </button>
        <button
          type="button"
          onClick={() => setIsFullscreen(true)}
          className="ml-auto rounded-full border border-ink/10 px-5 py-2.5 text-sm font-semibold text-ink/55 transition hover:border-pine hover:text-pine"
        >
          Fullscreen ↗
        </button>
      </div>
    </div>
  );
}
