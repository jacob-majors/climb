"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

function totalCycleSeconds(config: TimerConfig) {
  return config.phases.reduce((sum, phase) => sum + phase.durationSec, 0);
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
    gain.gain.exponentialRampToValueAtTime(0.14, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.start(now);
    oscillator.stop(now + duration);
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
        beep(0.18, nextPhase.tone === "clay" ? 920 : nextPhase.tone === "pine" ? 700 : 560);
        return nextPhaseIndex;
      }

      if (roundIndex + 1 < config.rounds) {
        const firstPhase = config.phases[0];
        setRoundIndex((value) => value + 1);
        setRemaining(firstPhase.durationSec);
        beep(0.2, 760);
        return 0;
      }

      clearTimer();
      setIsRunning(false);
      setIsFinished(true);
      beep(0.28, 1080);
      return currentPhaseIndex;
    });
  }

  function startTimer() {
    if (isRunning) return;
    if (isFinished) {
      resetTimer();
    }
    setIsRunning(true);
    beep(0.12, 640);
  }

  function pauseTimer() {
    clearTimer();
    setIsRunning(false);
  }

  function skipPhase() {
    if (!isRunning) {
      startTimer();
    }
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
      // Ignore invalid local settings and keep defaults.
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

  useEffect(() => () => {
    clearTimer();
    audioRef.current?.close().catch(() => undefined);
  }, []);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${minutes}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="space-y-4 rounded-[22px] border border-ink/10 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="mt-1 text-sm leading-6 text-ink/62">{description}</p>
        </div>
        <div className="rounded-full border border-ink/10 bg-mist/40 px-3 py-1 text-xs font-semibold text-ink/55">
          Round {Math.min(roundIndex + 1, config.rounds)} / {config.rounds}
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
      </div>
    </div>
  );
}
