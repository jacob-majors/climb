import { TrainingPlan, TrainingSession } from "@prisma/client";

export type MesocyclePhase = "accumulation" | "intensification" | "realization" | "deload";

export type MesocycleContext = {
  phase: MesocyclePhase;
  weekInPhase: number;
  consecutiveHardWeeks: number;
  loadTrend: "rising" | "stable" | "dropping";
  shouldDeload: boolean;
  // Applied as multipliers to session duration: 0 = no change, +0.1 = +10%, -0.2 = -20%
  volumeModifier: number;
  // Applied as a load score adjustment per session: negative = soften, positive = push
  intensityModifier: number;
  description: string;
};

const HARD_WEEK_LOAD = 24;
const VERY_HARD_WEEK_LOAD = 32;
const DELOAD_TRIGGER_WEEKS = 3;
const LOW_LOAD_THRESHOLD = 16; // used to detect last week was a deload

function computeLoadTrend(scores: number[]): "rising" | "stable" | "dropping" {
  if (scores.length < 2) return "stable";
  const diff = scores[0] - scores[1]; // most recent minus one-week-prior
  if (diff > 5) return "rising";
  if (diff < -5) return "dropping";
  return "stable";
}

function countConsecutiveHardWeeks(scores: number[]): number {
  let count = 0;
  for (const score of scores) {
    if (score >= HARD_WEEK_LOAD) count++;
    else break;
  }
  return count;
}

function detectLastWasDeload(scores: number[]): boolean {
  return scores.length > 0 && scores[0] < LOW_LOAD_THRESHOLD;
}

function detectLastWasVeryHard(scores: number[]): boolean {
  return scores.length > 0 && scores[0] >= VERY_HARD_WEEK_LOAD;
}

export function getMesocycleContext(
  priorPlans: (TrainingPlan & { sessions: TrainingSession[] })[],
): MesocycleContext {
  if (priorPlans.length === 0) {
    return {
      phase: "accumulation",
      weekInPhase: 1,
      consecutiveHardWeeks: 0,
      loadTrend: "stable",
      shouldDeload: false,
      volumeModifier: 0.05,
      intensityModifier: 0,
      description: "First week — conservative start to establish baseline.",
    };
  }

  // Loads ordered most-recent first
  const recentLoads = priorPlans.slice(0, 6).map((p) => p.totalLoadScore);
  const loadTrend = computeLoadTrend(recentLoads);
  const consecutiveHardWeeks = countConsecutiveHardWeeks(recentLoads);
  const shouldDeload = consecutiveHardWeeks >= DELOAD_TRIGGER_WEEKS;
  const lastWasDeload = detectLastWasDeload(recentLoads);
  const lastWasVeryHard = detectLastWasVeryHard(recentLoads);

  if (shouldDeload) {
    return {
      phase: "deload",
      weekInPhase: 1,
      consecutiveHardWeeks,
      loadTrend,
      shouldDeload: true,
      volumeModifier: -0.30,
      intensityModifier: -2,
      description: `Deload — ${consecutiveHardWeeks} consecutive hard weeks accumulated. Volume cut ~30%, intensity softened. Adaptation happens during recovery.`,
    };
  }

  if (lastWasDeload) {
    return {
      phase: "accumulation",
      weekInPhase: 1,
      consecutiveHardWeeks: 0,
      loadTrend,
      shouldDeload: false,
      volumeModifier: 0.05,
      intensityModifier: -1,
      description: "Post-deload accumulation — starting a fresh block with slightly elevated volume and conservative intensity.",
    };
  }

  if (consecutiveHardWeeks === 0) {
    const weekInPhase = Math.min(priorPlans.length, 3) + 1;
    return {
      phase: "accumulation",
      weekInPhase,
      consecutiveHardWeeks: 0,
      loadTrend,
      shouldDeload: false,
      volumeModifier: loadTrend === "dropping" ? 0.10 : 0.05,
      intensityModifier: 0,
      description: `Accumulation week ${weekInPhase} — building base volume with moderate intensity. ${loadTrend === "dropping" ? "Load has been dropping; nudging volume up." : ""}`,
    };
  }

  if (consecutiveHardWeeks === 1) {
    return {
      phase: "intensification",
      weekInPhase: 1,
      consecutiveHardWeeks,
      loadTrend,
      shouldDeload: false,
      volumeModifier: lastWasVeryHard ? -0.05 : 0,
      intensityModifier: 1,
      description: "Intensification week 1 — volume holds steady, intensity increases. Quality of effort over quantity.",
    };
  }

  if (consecutiveHardWeeks === 2) {
    return {
      phase: "realization",
      weekInPhase: 1,
      consecutiveHardWeeks,
      loadTrend,
      shouldDeload: false,
      volumeModifier: -0.10,
      intensityModifier: 2,
      description: "Realization week 1 — volume trims slightly, intensity peaks. The goal is applying fitness built in prior weeks.",
    };
  }

  // consecutiveHardWeeks >= 3 but shouldDeload was false (load below HARD threshold on week 3+)
  return {
    phase: "realization",
    weekInPhase: 2,
    consecutiveHardWeeks,
    loadTrend,
    shouldDeload: false,
    volumeModifier: -0.15,
    intensityModifier: 2,
    description: "Realization week 2 — maintaining peak application. Watch for fatigue accumulation; deload may follow next week.",
  };
}

export function mesocycleSummaryLabel(ctx: MesocycleContext): string {
  const phaseNames: Record<MesocyclePhase, string> = {
    accumulation: "Accumulation",
    intensification: "Intensification",
    realization: "Realization",
    deload: "Deload",
  };
  return `${phaseNames[ctx.phase]} — week ${ctx.weekInPhase}`;
}

// Returns the load score modifier for a given session based on mesocycle phase
export function applyMesocycleLoadModifier(baseLoadScore: number, ctx: MesocycleContext): number {
  const adjusted = baseLoadScore + ctx.intensityModifier;
  return Math.max(0, Math.min(9, adjusted));
}

// Returns adjusted duration in minutes for a given session based on mesocycle phase
export function applyMesocycleVolumeModifier(baseDuration: number, ctx: MesocycleContext): number {
  const adjusted = Math.round(baseDuration * (1 + ctx.volumeModifier));
  return Math.max(15, adjusted);
}
