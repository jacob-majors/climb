import {
  ClimbingProfile,
  CompetitionEvent,
  Discipline,
  IntensityLevel,
  RouteEntry,
  ScheduleConstraint,
  SessionType,
  StressLevel,
  TrainingPlan,
  TrainingSession,
  User,
  RecoveryQuality,
} from "@prisma/client";
import { differenceInCalendarDays, endOfWeek, startOfWeek } from "date-fns";
import { CalendarEntry, parseWeeklyCalendar } from "@/lib/calendar";
import { dayNames } from "@/lib/format";
import { getRecoveryBand } from "@/lib/recovery";
import { PlanDraft, PlannedSessionDraft } from "@/lib/types";
import {
  scoreWeaknesses,
  getPrimaryWeaknessFromScores,
  getBlendedWeaknessSessions,
  buildWeaknessNarrative,
  RankedWeakness,
} from "@/lib/weakness-scorer";
import {
  getMesocycleContext,
  mesocycleSummaryLabel,
  applyMesocycleLoadModifier,
  applyMesocycleVolumeModifier,
  MesocycleContext,
} from "@/lib/periodization";
import { personalizeSession, PersonalizationContext } from "@/lib/session-personalizer";
import { findAvailabilityForDay } from "@/lib/training-availability";

type EngineInput = {
  user: User;
  profile: ClimbingProfile;
  schedule: ScheduleConstraint;
  routes: RouteEntry[];
  competitions: CompetitionEvent[];
  priorPlans?: (TrainingPlan & { sessions: TrainingSession[] })[];
};

// ──────────────────────────────────────────────────────────────────────────────
// Utility parsers
// ──────────────────────────────────────────────────────────────────────────────

function parseAvailability(raw: string): Record<string, number> {
  try {
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return dayNames.reduce<Record<string, number>>((acc, day) => {
      acc[day] = 60;
      return acc;
    }, {});
  }
}

function getCalendarByDay(raw: string | null | undefined): Record<string, CalendarEntry[]> {
  return parseWeeklyCalendar(raw).reduce<Record<string, CalendarEntry[]>>((acc, entry) => {
    acc[entry.day] ??= [];
    acc[entry.day].push(entry);
    return acc;
  }, {});
}

function calendarLoadValue(load: CalendarEntry["load"]): number {
  switch (load) {
    case "high": return 3;
    case "moderate": return 2;
    default: return 1;
  }
}

function describeCalendarEntries(entries: CalendarEntry[]): string {
  return entries.map((e) => `${e.title}${e.time ? ` (${e.time})` : ""}`).join(", ");
}

function clampDuration(minutes: number, min: number, max: number) {
  return Math.max(min, Math.min(max, minutes));
}

function targetDurationForSessionType(sessionType: SessionType, availableMinutes: number) {
  switch (sessionType) {
    case SessionType.FULL_REST:
      return 0;
    case SessionType.ACTIVE_RECOVERY:
      return clampDuration(availableMinutes, 20, 35);
    case SessionType.MOBILITY:
      return clampDuration(availableMinutes, 25, 40);
    case SessionType.CORE:
      return clampDuration(availableMinutes, 40, 60);
    case SessionType.ANTAGONIST_STRENGTH:
      return clampDuration(availableMinutes, 45, 70);
    case SessionType.FOOTWORK_DRILLS:
    case SessionType.TECHNIQUE_DRILLS:
      return clampDuration(availableMinutes, 50, 80);
    case SessionType.ARC:
      return clampDuration(availableMinutes, 45, 75);
    case SessionType.TEAM_PRACTICE:
      return 120;
    case SessionType.COMPETITION:
      return clampDuration(availableMinutes, 120, 240);
    case SessionType.LIMIT_BOULDERING:
    case SessionType.PROJECTING:
    case SessionType.LEAD_ENDURANCE:
    case SessionType.POWER_ENDURANCE:
    case SessionType.FINGER_STRENGTH:
    case SessionType.RECRUITMENT_POWER:
      return clampDuration(availableMinutes, 75, 110);
    default:
      return clampDuration(availableMinutes, 45, 90);
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Stress + recovery
// ──────────────────────────────────────────────────────────────────────────────

function getStressAdjustment(profile: ClimbingProfile, schedule: ScheduleConstraint): number {
  let adj = 0;
  if (profile.sleepAverage < 7) adj += 1;
  if (profile.recoveryQuality === RecoveryQuality.LOW) adj += 1;
  if (profile.stressLevel === StressLevel.HIGH) adj += 1;
  if (profile.stressLevel === StressLevel.VERY_HIGH) adj += 2;
  if (schedule.fatigueLevel >= 7) adj += 2;
  if (schedule.fatigueLevel >= 5) adj += 1;
  return adj;
}

// ──────────────────────────────────────────────────────────────────────────────
// Competition context
// ──────────────────────────────────────────────────────────────────────────────

type CompPhase = "build" | "comp-build" | "taper" | "peak";
type CompContext = {
  daysUntil: number | null;
  event: CompetitionEvent | null;
  phase: CompPhase;
};

function getCompetitionContext(competitions: CompetitionEvent[]): CompContext {
  const now = new Date();
  const upcoming = competitions
    .filter((e) => differenceInCalendarDays(e.eventDate, now) >= 0)
    .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime())[0];

  if (!upcoming) return { daysUntil: null, event: null, phase: "build" };
  const d = differenceInCalendarDays(upcoming.eventDate, now);
  if (d <= 2) return { daysUntil: d, event: upcoming, phase: "peak" };
  if (d <= 7) return { daysUntil: d, event: upcoming, phase: "taper" };
  if (d <= 21) return { daysUntil: d, event: upcoming, phase: "comp-build" };
  return { daysUntil: d, event: upcoming, phase: "build" };
}

function compContextLabel(ctx: CompContext): string {
  if (!ctx.event) return "No upcoming competition — development focus.";
  return `${ctx.event.name} in ${ctx.daysUntil} days (${ctx.phase} phase).`;
}

// ──────────────────────────────────────────────────────────────────────────────
// Calendar pressure
// ──────────────────────────────────────────────────────────────────────────────

function getCalendarPressure(entries: CalendarEntry[], workAtGym: boolean): number {
  let score = 0;
  for (const entry of entries) {
    score += calendarLoadValue(entry.load);
    if (entry.type === "practice" || entry.type === "competition" || entry.type === "climbing") score += 2;
    if (entry.type === "work" && workAtGym) score += 1;
    if (entry.type === "travel") score += 2;
  }
  return score;
}

function isLockedTeamPracticeDay(dayIndex: number, entries: CalendarEntry[]) {
  return (dayIndex === 1 || dayIndex === 4) && entries.some((entry) => entry.type === "practice");
}

function getCalendarAnchoredSession(dayIndex: number, entries: CalendarEntry[]): SessionType | null {
  if (entries.find((e) => e.type === "competition")) return SessionType.COMPETITION;
  if (isLockedTeamPracticeDay(dayIndex, entries)) return SessionType.TEAM_PRACTICE;
  const climbing = entries.find((e) => e.type === "climbing");
  if (climbing?.load === "high") return SessionType.PROJECTING;
  if (climbing?.load === "moderate") return SessionType.TECHNIQUE_DRILLS;
  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Youth safety guard
// ──────────────────────────────────────────────────────────────────────────────

function youthFingerGuard(
  age: number,
  sessionType: SessionType,
): { sessionType: SessionType; substituted: boolean } {
  if (age < 18 && sessionType === SessionType.FINGER_STRENGTH) {
    return { sessionType: SessionType.TECHNIQUE_DRILLS, substituted: true };
  }
  return { sessionType, substituted: false };
}

// ──────────────────────────────────────────────────────────────────────────────
// Training variety: detect sessions used in the last N weeks to avoid repetition
// ──────────────────────────────────────────────────────────────────────────────

function getRecentSessionTypes(
  priorPlans: (TrainingPlan & { sessions: TrainingSession[] })[],
  lookbackWeeks = 2,
): Set<SessionType> {
  const recent = new Set<SessionType>();
  for (const plan of priorPlans.slice(0, lookbackWeeks)) {
    for (const session of plan.sessions) {
      recent.add(session.sessionType as SessionType);
    }
  }
  return recent;
}

// Given a preferred session that was used recently, try to find a suitable alternative
const VARIETY_SUBSTITUTES: Partial<Record<SessionType, SessionType>> = {
  [SessionType.LIMIT_BOULDERING]: SessionType.RECRUITMENT_POWER,
  [SessionType.RECRUITMENT_POWER]: SessionType.LIMIT_BOULDERING,
  [SessionType.LEAD_ENDURANCE]: SessionType.POWER_ENDURANCE,
  [SessionType.POWER_ENDURANCE]: SessionType.LEAD_ENDURANCE,
  [SessionType.TECHNIQUE_DRILLS]: SessionType.FOOTWORK_DRILLS,
  [SessionType.FOOTWORK_DRILLS]: SessionType.TECHNIQUE_DRILLS,
  [SessionType.ARC]: SessionType.TECHNIQUE_DRILLS,
  [SessionType.PROJECTING]: SessionType.LIMIT_BOULDERING,
};

function applyVariety(
  sessionType: SessionType,
  recentTypes: Set<SessionType>,
  dayIndex: number,
): SessionType {
  // Only consider varying non-structural sessions on non-fixed days
  const structural = new Set<SessionType>([
    SessionType.TEAM_PRACTICE,
    SessionType.COMPETITION,
    SessionType.FULL_REST,
    SessionType.ACTIVE_RECOVERY,
    SessionType.MOBILITY,
  ]);
  if (structural.has(sessionType)) return sessionType;
  // Only substitute if the session appeared in the last 2 plans AND a substitute exists
  const substitute = VARIETY_SUBSTITUTES[sessionType];
  if (recentTypes.has(sessionType) && substitute && !recentTypes.has(substitute)) {
    return substitute;
  }
  return sessionType;
}

// ──────────────────────────────────────────────────────────────────────────────
// Injury risk detection
// ──────────────────────────────────────────────────────────────────────────────

type InjuryRiskLevel = "none" | "caution" | "high";

function assessInjuryRisk(
  profile: ClimbingProfile,
  schedule: ScheduleConstraint,
  sessionType: SessionType,
): { risk: InjuryRiskLevel; note: string } {
  const pain = (profile.currentPain || "").toLowerCase();
  const injury = (profile.injuryHistory || "").toLowerCase();
  const hasPain = pain.length > 0;
  const hasPulley = pain.includes("pulley") || pain.includes("a2") || injury.includes("pulley");
  const hasElbow = pain.includes("elbow") || pain.includes("lateral epicondyl") || pain.includes("medial epicondyl");
  const hasShoulder = pain.includes("shoulder") || pain.includes("rotator");

  const fingerHeavy = new Set<SessionType>([
    SessionType.FINGER_STRENGTH,
    SessionType.LIMIT_BOULDERING,
    SessionType.RECRUITMENT_POWER,
  ]);
  const elbowHeavy = new Set<SessionType>([
    SessionType.LEAD_ENDURANCE,
    SessionType.POWER_ENDURANCE,
    SessionType.FINGER_STRENGTH,
  ]);
  const shoulderHeavy = new Set<SessionType>([
    SessionType.ANTAGONIST_STRENGTH,
    SessionType.RECRUITMENT_POWER,
  ]);

  if (hasPulley && fingerHeavy.has(sessionType)) {
    return {
      risk: "high",
      note: `Pulley/finger issue reported (${profile.currentPain}). Keep all grip positions below symptom threshold. Convert hard finger work to technical mileage on large holds if pain is present.`,
    };
  }
  if (hasElbow && elbowHeavy.has(sessionType)) {
    return {
      risk: "caution",
      note: `Elbow issue reported. Warm up slowly, avoid full crimping, and stop the set if the elbow flares.`,
    };
  }
  if (hasShoulder && shoulderHeavy.has(sessionType)) {
    return {
      risk: "caution",
      note: `Shoulder issue reported. Avoid overhead lockout at full extension and include extra scapular activation in the warmup.`,
    };
  }
  if (hasPain) {
    return {
      risk: "caution",
      note: `Reported limitation (${profile.currentPain}). Monitor during warm-up and back off if symptoms appear.`,
    };
  }
  return { risk: "none", note: "" };
}

// ──────────────────────────────────────────────────────────────────────────────
// Intensity and load metadata for each session type
// ──────────────────────────────────────────────────────────────────────────────

type SessionMeta = {
  intensity: IntensityLevel;
  baseLoadScore: number;
  title: string;
};

const SESSION_META: Record<SessionType, SessionMeta> = {
  LIMIT_BOULDERING:    { intensity: IntensityLevel.HIGH,     baseLoadScore: 8, title: "Limit bouldering and attempt quality" },
  PROJECTING:          { intensity: IntensityLevel.HIGH,     baseLoadScore: 7, title: "Projecting with tactical pacing" },
  LEAD_ENDURANCE:      { intensity: IntensityLevel.HIGH,     baseLoadScore: 8, title: "Lead endurance intervals" },
  POWER_ENDURANCE:     { intensity: IntensityLevel.HIGH,     baseLoadScore: 7, title: "Power endurance circuits" },
  ARC:                 { intensity: IntensityLevel.MODERATE, baseLoadScore: 4, title: "Aerobic capacity / ARC" },
  FINGER_STRENGTH:     { intensity: IntensityLevel.HIGH,     baseLoadScore: 7, title: "Finger strength" },
  RECRUITMENT_POWER:   { intensity: IntensityLevel.HIGH,     baseLoadScore: 6, title: "Recruitment and power" },
  TECHNIQUE_DRILLS:    { intensity: IntensityLevel.MODERATE, baseLoadScore: 4, title: "Technique and movement economy" },
  FOOTWORK_DRILLS:     { intensity: IntensityLevel.LOW,      baseLoadScore: 3, title: "Footwork precision" },
  MOBILITY:            { intensity: IntensityLevel.LOW,      baseLoadScore: 2, title: "Mobility and tissue care" },
  ANTAGONIST_STRENGTH: { intensity: IntensityLevel.MODERATE, baseLoadScore: 4, title: "Strength and durability" },
  CORE:                { intensity: IntensityLevel.MODERATE, baseLoadScore: 3, title: "Core tension maintenance" },
  ACTIVE_RECOVERY:     { intensity: IntensityLevel.LOW,      baseLoadScore: 1, title: "Active recovery and reset" },
  FULL_REST:           { intensity: IntensityLevel.LOW,      baseLoadScore: 0, title: "Full rest" },
  COMPETITION:         { intensity: IntensityLevel.PEAK,     baseLoadScore: 9, title: "Competition day" },
  TEAM_PRACTICE:       { intensity: IntensityLevel.MODERATE, baseLoadScore: 5, title: "Team practice" },
};

function chooseStrengthSupportSession(
  profile: ClimbingProfile,
  rankedWeaknesses: RankedWeakness[],
  compCtx: CompContext,
): SessionType {
  if (compCtx.phase === "taper" || compCtx.phase === "peak") {
    return SessionType.MOBILITY;
  }

  const topCategories = rankedWeaknesses.slice(0, 3).map((weakness) => weakness.category);
  if (topCategories.includes("max_strength") || topCategories.includes("recruitment_power")) return SessionType.CORE;
  if (topCategories.includes("mobility")) return SessionType.MOBILITY;
  if (profile.primaryDiscipline === Discipline.BOULDERING) return SessionType.CORE;
  return SessionType.ANTAGONIST_STRENGTH;
}

function ensureSupportSessions(
  structure: SessionType[],
  profile: ClimbingProfile,
  rankedWeaknesses: RankedWeakness[],
  compCtx: CompContext,
) {
  const hasStrengthSession = structure.some(
    (type) => type === SessionType.ANTAGONIST_STRENGTH || type === SessionType.CORE,
  );
  const hasActiveRecovery = structure.includes(SessionType.ACTIVE_RECOVERY);

  if (!hasStrengthSession) {
    const replacement = chooseStrengthSupportSession(profile, rankedWeaknesses, compCtx);
    const targetIndex = structure.findIndex((type, index) =>
      index !== 5 &&
      type !== SessionType.TEAM_PRACTICE &&
      type !== SessionType.COMPETITION &&
      type !== SessionType.FULL_REST,
    );
    if (targetIndex !== -1) {
      structure[targetIndex] = replacement;
    }
  }

  if (!hasActiveRecovery) {
    const targetIndex = [2, 6, 0, 4].find((index) => {
      const type = structure[index];
      return type !== SessionType.TEAM_PRACTICE && type !== SessionType.COMPETITION && type !== SessionType.FULL_REST;
    });
    if (targetIndex !== undefined) {
      structure[targetIndex] = SessionType.ACTIVE_RECOVERY;
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Session builder
// ──────────────────────────────────────────────────────────────────────────────

function buildSession(
  dayIndex: number,
  sessionType: SessionType,
  durationMinutes: number,
  whyChosen: string,
  personCtx: PersonalizationContext,
  mesocycleCtx: MesocycleContext,
  injuryRisk: { risk: InjuryRiskLevel; note: string },
  age: number,
  scheduledWindow?: { label?: string | null; start: string; end: string } | null,
): PlannedSessionDraft {
  const dayLabel = dayNames[dayIndex];
  const guarded = youthFingerGuard(age, sessionType);
  const actualType = guarded.sessionType;
  const meta = SESSION_META[actualType] ?? SESSION_META[SessionType.ACTIVE_RECOVERY];

  const content = personalizeSession(actualType, personCtx, guarded.substituted);

  let loadScore = applyMesocycleLoadModifier(meta.baseLoadScore, mesocycleCtx);
  let intensity = meta.intensity;

  let recoveryNotes = content.recoveryNotes;
  if (injuryRisk.note) {
    recoveryNotes = `${recoveryNotes} ${injuryRisk.note}`;
  }
  if (injuryRisk.risk === "high") {
    intensity = IntensityLevel.LOW;
    loadScore = Math.max(1, loadScore - 3);
  }

  // Technique drills title gets the weakness focus appended
  const titleSuffix =
    actualType === SessionType.TECHNIQUE_DRILLS
      ? ` around ${personCtx.primaryWeakness.focusAreas[0]?.toLowerCase() ?? "movement quality"}`
      : "";

  return {
    dayIndex,
    dayLabel,
    scheduledWindowLabel: scheduledWindow?.label ?? null,
    scheduledStartTime: scheduledWindow?.start ?? null,
    scheduledEndTime: scheduledWindow?.end ?? null,
    sessionType: actualType,
    title: `${meta.title}${titleSuffix}`,
    durationMinutes,
    warmup: content.warmup,
    mainWork: content.mainWork,
    cooldown: content.cooldown,
    recoveryNotes,
    intensity,
    whyChosen,
    loadScore,
  };
}

function buildPracticePrimer(
  dayIndex: number,
  entries: CalendarEntry[],
): PlannedSessionDraft | null {
  const practiceText = entries
    .filter((entry) => entry.type === "practice")
    .map((entry) => [entry.title, entry.notes].filter(Boolean).join(" "))
    .join(" ")
    .toLowerCase();

  if (!practiceText || !(dayIndex === 1 || dayIndex === 4)) {
    return null;
  }

  const basePrimer = {
    dayIndex,
    dayLabel: dayNames[dayIndex],
    scheduledWindowLabel: "Pre-practice",
    scheduledStartTime: "16:00",
    scheduledEndTime: "17:45",
    sessionType: SessionType.TECHNIQUE_DRILLS,
    durationMinutes: 105,
    intensity: IntensityLevel.MODERATE,
    loadScore: 4,
  } satisfies Omit<PlannedSessionDraft, "title" | "warmup" | "mainWork" | "cooldown" | "recoveryNotes" | "whyChosen">;

  if (practiceText.includes("power endurance")) {
    return {
      ...basePrimer,
      title: "Lead power-endurance primer",
      warmup:
        "4:00-4:20 PM: easy movement, shoulder activation, forearm prep, and 2 easy lead routes. Finish with one round of clip-and-shake drills on the wall.",
      mainWork:
        "4:20-5:20 PM: do 2-3 controlled power-endurance primers before practice. Option A: 2 linked routes around onsight/flash level with 8-10 minutes rest. Option B: 3 x 4-minute continuous climbing intervals on lead terrain with 4 minutes easy rest. Stay smooth and stop before you get wrecked. 5:20-5:35 PM: one short tactical set of clipping under pump, then sit down, drink, and reset before practice.",
      cooldown:
        "5:35-5:45 PM: walk, breathe, eat a quick carb snack, and show up to practice feeling switched on rather than tired.",
      recoveryNotes:
        "This is a primer, not a second full practice. If forearms start feeling heavy early, cut a set and save it for team practice.",
      whyChosen:
        "Team practice today centers on power endurance, so this primer wakes up pacing, clipping, and pump-management without burning the match before practice starts.",
    };
  }

  if (practiceText.includes("endurance") || practiceText.includes("technique")) {
    return {
      ...basePrimer,
      title: "Movement and endurance primer",
      warmup:
        "4:00-4:20 PM: easy movement, mobility, and two relaxed lead laps with quiet feet and calm clipping.",
      mainWork:
        "4:20-5:15 PM: 2 rounds of moderate continuous climbing or linked route sections focused on smooth pacing, precise feet, and relaxed breathing. 5:15-5:35 PM: one tactical drill set on clipping positions or shake-outs depending on what practice is emphasizing.",
      cooldown:
        "5:35-5:45 PM: easy walk, water, and a quick snack so practice still feels like the main event.",
      recoveryNotes:
        "Keep this controlled and technical. The goal is rhythm and feel, not arriving at practice already pumped.",
      whyChosen:
        "The practice theme later today is endurance and technique, so this earlier block gets the movement patterns online while keeping the real quality for team practice.",
    };
  }

  return null;
}

// ──────────────────────────────────────────────────────────────────────────────
// Main plan generator
// ──────────────────────────────────────────────────────────────────────────────

export function generateTrainingPlan(input: EngineInput): PlanDraft {
  const { user, profile, schedule, routes, competitions, priorPlans = [] } = input;

  const startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
  const endDate = endOfWeek(startDate, { weekStartsOn: 1 });
  const availability = parseAvailability(schedule.timeAvailableByDay);
  const calendarByDay = getCalendarByDay(schedule.weeklyCalendar);

  // ── Core analysis ──────────────────────────────────────────────────────────
  const rankedWeaknesses = scoreWeaknesses(routes, profile.primaryDiscipline);
  const primaryWeakness = getPrimaryWeaknessFromScores(rankedWeaknesses);
  const blendedSessions = getBlendedWeaknessSessions(rankedWeaknesses);
  const weaknessNarrative = buildWeaknessNarrative(rankedWeaknesses);

  const stressAdjustment = getStressAdjustment(profile, schedule);
  const compCtx = getCompetitionContext(competitions);
  const recovery = getRecoveryBand(schedule);
  const mesocycleCtx = getMesocycleContext(priorPlans);
  const recentSessionTypes = getRecentSessionTypes(priorPlans, 2);

  const preferredRestDay = (schedule.restDayPreferences || "").toLowerCase().includes("friday") ? 4 : 6;

  // ── Personalization context (shared across all sessions) ───────────────────
  const personCtx: PersonalizationContext = {
    profile,
    age: user.age,
    primaryWeakness,
    rankedWeaknesses,
    mesocyclePhase: mesocycleCtx.phase,
    sessionDurationMinutes: 90, // placeholder; overridden per session
  };

  // ── Base structure ─────────────────────────────────────────────────────────
  // Blended sessions are chosen based on the top 2-3 detected weaknesses
  const baseStructure: SessionType[] = [
    blendedSessions[0] ?? SessionType.TECHNIQUE_DRILLS,       // Mon: primary weakness
    SessionType.TEAM_PRACTICE,                                  // Tue: practice
    stressAdjustment >= 3
      ? SessionType.ACTIVE_RECOVERY
      : chooseStrengthSupportSession(profile, rankedWeaknesses, compCtx), // Wed: support strength or recovery
    blendedSessions[1] ?? SessionType.TECHNIQUE_DRILLS,         // Thu: secondary weakness
    SessionType.TEAM_PRACTICE,                                  // Fri: practice
    profile.primaryDiscipline === Discipline.LEAD
      ? SessionType.LEAD_ENDURANCE
      : SessionType.LIMIT_BOULDERING,                          // Sat: discipline-specific
    stressAdjustment >= 2
      ? SessionType.ACTIVE_RECOVERY
      : blendedSessions[2] ?? SessionType.MOBILITY,            // Sun: tertiary support or recovery
  ];

  baseStructure[preferredRestDay] = SessionType.FULL_REST;

  // ── Apply variety to non-structural training days ──────────────────────────
  for (let i = 0; i < 7; i++) {
    baseStructure[i] = applyVariety(baseStructure[i], recentSessionTypes, i);
  }

  // ── Calendar anchoring ─────────────────────────────────────────────────────
  dayNames.forEach((dayLabel, dayIndex) => {
    const entries = calendarByDay[dayLabel] ?? [];
    const anchored = getCalendarAnchoredSession(dayIndex, entries);
    if (anchored) baseStructure[dayIndex] = anchored;

    const pressure = getCalendarPressure(entries, schedule.workAtGym);
    if (pressure >= 6 && baseStructure[dayIndex] !== SessionType.COMPETITION) {
      baseStructure[dayIndex] = isLockedTeamPracticeDay(dayIndex, entries)
        ? SessionType.TEAM_PRACTICE
        : SessionType.ACTIVE_RECOVERY;
    }
  });

  // ── Mesocycle deload override ──────────────────────────────────────────────
  if (mesocycleCtx.shouldDeload) {
    // Replace high-intensity sessions with lower-intensity alternatives
    for (let i = 0; i < 7; i++) {
      const structural = new Set<SessionType>([
        SessionType.TEAM_PRACTICE,
        SessionType.COMPETITION,
        SessionType.FULL_REST,
      ]);
      if (structural.has(baseStructure[i])) continue;
      if (baseStructure[i] === SessionType.ACTIVE_RECOVERY || baseStructure[i] === SessionType.MOBILITY) continue;

      const meta = SESSION_META[baseStructure[i]];
      if (meta.intensity === IntensityLevel.HIGH || meta.intensity === IntensityLevel.PEAK) {
        // Downgrade: replace high sessions with technique or ARC
        baseStructure[i] = i === 0 ? SessionType.TECHNIQUE_DRILLS : SessionType.ARC;
      }
    }
  }

  // ── Competition phase overrides ────────────────────────────────────────────
  if (compCtx.phase === "taper") {
    baseStructure[0] = SessionType.TECHNIQUE_DRILLS;
    baseStructure[2] = SessionType.MOBILITY;
    baseStructure[5] = SessionType.ACTIVE_RECOVERY;
  }
  if (compCtx.phase === "peak" && compCtx.daysUntil !== null) {
    const compDay = Math.min(Math.max(compCtx.daysUntil, 0), 6);
    baseStructure.fill(SessionType.ACTIVE_RECOVERY);
    baseStructure[compDay] = SessionType.COMPETITION;
    if (compDay > 0) baseStructure[compDay - 1] = SessionType.MOBILITY;
    if (compDay < 6) baseStructure[compDay + 1] = SessionType.FULL_REST;
  }

  // ── High-stress override ───────────────────────────────────────────────────
  if (stressAdjustment >= 4) {
    baseStructure[2] = SessionType.ACTIVE_RECOVERY;
    baseStructure[6] = SessionType.FULL_REST;
  }

  // ── Recovery-band override ─────────────────────────────────────────────────
  if (recovery.band === "red") {
    baseStructure[0] = SessionType.ACTIVE_RECOVERY;
    baseStructure[2] = SessionType.MOBILITY;
    baseStructure[6] = SessionType.FULL_REST;
  }
  if (recovery.band === "yellow" && baseStructure[6] !== SessionType.FULL_REST) {
    baseStructure[6] = SessionType.MOBILITY;
  }

  ensureSupportSessions(baseStructure, profile, rankedWeaknesses, compCtx);

  // ── Build sessions ─────────────────────────────────────────────────────────
  const sessions = baseStructure.map((sessionType, dayIndex) => {
    const dayLabel = dayNames[dayIndex];
    const entries = calendarByDay[dayLabel] ?? [];
    const calendarPressure = getCalendarPressure(entries, schedule.workAtGym);
    const injuryRisk = assessInjuryRisk(profile, schedule, sessionType);

    // Why-chosen explanation
    const why = (() => {
      if (sessionType === SessionType.TEAM_PRACTICE) {
        return entries.length
          ? `${describeCalendarEntries(entries)} already supplies real climbing load, so the rest of the week builds around it.`
          : "Team practice already supplies real climbing load, so the rest of the week builds around it.";
      }
      if (sessionType === SessionType.FULL_REST) {
        return "A protected rest day prevents stacking fatigue and keeps quality high for the next hard session.";
      }
      if (sessionType === SessionType.ACTIVE_RECOVERY) {
        return `Readiness signals (stress: ${stressAdjustment}, recovery: ${recovery.band}) suggest a true reset day with easy movement, circulation, and mobility instead of more climbing strain.`;
      }
      if (sessionType === SessionType.ANTAGONIST_STRENGTH || sessionType === SessionType.CORE) {
        return "A dedicated strength support session builds durability, posture, and body tension without stealing quality from your main climbing days.";
      }
      if (sessionType === SessionType.MOBILITY) {
        return "This slot keeps recovery moving while still addressing range of motion and tissue quality that support the harder sessions.";
      }
      if (sessionType === SessionType.COMPETITION) {
        return `Peak day preserved for ${compCtx.event?.name ?? "the upcoming competition"}.`;
      }
      if (mesocycleCtx.shouldDeload) {
        return `Deload week — intensity reduced to allow adaptation from ${mesocycleCtx.consecutiveHardWeeks} consecutive hard weeks.`;
      }
      if (entries.length) {
        return `Selected around ${describeCalendarEntries(entries)} to respect the actual calendar load, not just open hours.`;
      }
      const evidenceSuffix =
        primaryWeakness.evidence.length > 0
          ? ` Evidence from: ${primaryWeakness.evidence.slice(0, 2).join(", ")}.`
          : "";
      return `Targets ${primaryWeakness.focusAreas[0]?.toLowerCase()} because ${primaryWeakness.explanation.toLowerCase()}${evidenceSuffix}`;
    })();

    // Duration calculation
    let duration = targetDurationForSessionType(sessionType, availability[dayLabel] ?? 60);

    // Calendar pressure trims duration
    if (
      calendarPressure >= 5 &&
      sessionType !== SessionType.TEAM_PRACTICE &&
      sessionType !== SessionType.COMPETITION &&
      sessionType !== SessionType.FULL_REST
    ) {
      duration = Math.max(20, Math.floor(duration * 0.65));
    }
    // Competition taper trims duration
    if (
      compCtx.phase === "taper" &&
      sessionType !== SessionType.TEAM_PRACTICE &&
      sessionType !== SessionType.COMPETITION
    ) {
      duration = Math.max(25, Math.floor(duration * 0.75));
    }
    // Mesocycle volume modifier
    if (
      sessionType !== SessionType.FULL_REST &&
      sessionType !== SessionType.ACTIVE_RECOVERY &&
      sessionType !== SessionType.TEAM_PRACTICE &&
      sessionType !== SessionType.COMPETITION
    ) {
      duration = applyMesocycleVolumeModifier(duration, mesocycleCtx);
    }
    duration = targetDurationForSessionType(sessionType, duration);

    const sessionPersonCtx: PersonalizationContext = {
      ...personCtx,
      sessionDurationMinutes: duration,
    };

    const scheduledWindow =
      sessionType === SessionType.TEAM_PRACTICE && (dayIndex === 1 || dayIndex === 4)
        ? { label: "Team practice", start: "18:00", end: "20:00" }
        : findAvailabilityForDay(schedule.trainingAvailability, dayLabel).windows[0] ?? null;

    const drafted = buildSession(
      dayIndex,
      sessionType,
      duration,
      why,
      sessionPersonCtx,
      mesocycleCtx,
      injuryRisk,
      user.age,
      scheduledWindow,
    );

    // Additional recovery note appends
    if (entries.some((e) => e.type === "work") && schedule.workAtGym) {
      drafted.recoveryNotes += " Gym shifts add background fatigue — cap the session once quality drops.";
    }
    if (entries.some((e) => e.type === "practice")) {
      drafted.recoveryNotes += " Count the practice itself as part of the day's total load.";
    }

    // Intensity adjustments for calendar pressure or recovery
    const meta = SESSION_META[drafted.sessionType];
    if (calendarPressure >= 6 && meta.intensity === IntensityLevel.HIGH) {
      drafted.intensity = IntensityLevel.MODERATE;
      drafted.loadScore = Math.max(3, drafted.loadScore - 2);
    }
    if (recovery.band === "red" && drafted.intensity !== IntensityLevel.LOW && drafted.sessionType !== SessionType.COMPETITION) {
      drafted.intensity = IntensityLevel.LOW;
      drafted.loadScore = Math.max(1, drafted.loadScore - 3);
      drafted.recoveryNotes += " Recovery metrics are red — this session was intentionally softened.";
    }
    if (recovery.band === "yellow" && drafted.intensity === IntensityLevel.HIGH) {
      drafted.intensity = IntensityLevel.MODERATE;
      drafted.loadScore = Math.max(2, drafted.loadScore - 1);
    }

    return drafted;
  });

  const primerSessions = sessions
    .map((session) => (session.sessionType === SessionType.TEAM_PRACTICE ? buildPracticePrimer(session.dayIndex, calendarByDay[session.dayLabel] ?? []) : null))
    .filter((session): session is PlannedSessionDraft => Boolean(session));

  const allSessions = [...sessions, ...primerSessions].sort((a, b) => {
    if (a.dayIndex !== b.dayIndex) return a.dayIndex - b.dayIndex;
    const aStart = a.scheduledStartTime ?? "23:59";
    const bStart = b.scheduledStartTime ?? "23:59";
    return aStart.localeCompare(bStart);
  });

  // ── Load score ─────────────────────────────────────────────────────────────
  const loadPenalty = stressAdjustment * 2 + (compCtx.phase === "taper" ? 4 : 0);
  const totalLoadScore = Math.max(
    8,
    allSessions.reduce((sum, s) => sum + s.loadScore, 0) - loadPenalty,
  );

  // ── Text assembly ──────────────────────────────────────────────────────────
  const calendarSummary = parseWeeklyCalendar(schedule.weeklyCalendar)
    .slice(0, 5)
    .map((e) => `${e.day}: ${e.title}`)
    .join("; ");

  const lastPlan = priorPlans[0];
  const adaptabilityNote = lastPlan
    ? `The recommendation keeps the prior week's rhythm in mind (${mesocycleSummaryLabel(mesocycleCtx)}) so the athlete doesn't swing between overload and underload.`
    : "This first-week plan starts conservatively so future weeks can adjust based on what the athlete actually completes.";

  const secondaryWeaknessNote =
    rankedWeaknesses.length >= 2
      ? ` Secondary weakness detected: ${rankedWeaknesses[1].label.toLowerCase()} — addressed through ${rankedWeaknesses[1].preferredSessions[0].toLowerCase().replace(/_/g, " ")}.`
      : "";

  const focusAreas = [
    ...new Set(
      primaryWeakness.focusAreas.concat(
        profile.preferredTrainingFocus
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
      ),
    ),
  ];

  const recoveryNotesText = profile.currentPain
    ? `Current pain/limitations: ${profile.currentPain}. Keep any painful grip positions below symptom threshold, and convert hard finger work into technical mileage if needed.`
    : "Prioritize sleep, post-session fueling, skin care, and at least one full rest day. If soreness lingers longer than 48 hours, downshift the next hard session.";

  const pushBackoffText = [
    "Push on designated high-quality sessions only if warmup movement feels crisp, fingers feel healthy, and school/work stress is manageable.",
    "Back off if: confidence drops early, skin is poor, pump or power fades faster than expected, or gym work has left you more cooked than anticipated.",
    recovery.band === "red"
      ? "Recovery is currently red — follow the softened plan exactly and do not add volume."
      : recovery.band === "yellow"
      ? "Recovery is yellow — honor rest days fully and avoid extending sessions."
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    title: `${user.name.split(" ")[0]}'s week of ${startDate.toLocaleDateString()}`,
    startDate,
    endDate,
    summary: `A ${compCtx.phase === "build" ? "development" : compCtx.phase} week in ${mesocycleSummaryLabel(mesocycleCtx).toLowerCase()} built around ${primaryWeakness.label.toLowerCase()}, existing practice load, and realistic recovery limits.`,
    explanation: `${weaknessNarrative}${secondaryWeaknessNote} The plan respects ${profile.trainingDaysPerWeek} available training days, counts team practices as real load, and trims intensity when stress, sleep, or fatigue indicate the athlete gains more from quality than volume. ${schedule.workAtGym ? "Gym shifts are treated as background fatigue rather than neutral time. " : ""}Recovery is currently ${recovery.band} (${recovery.score}/100). ${calendarSummary ? `Calendar anchors this week: ${calendarSummary}.` : ""} ${adaptabilityNote}`,
    keyFocusAreas: focusAreas.join(", "),
    mainWeakness: primaryWeakness.label,
    recoveryNotes: recoveryNotesText,
    compPrepNotes: compCtx.event
      ? `${compCtx.event.name} is ${compCtx.daysUntil} days away. The week reduces volume enough to stay sharp while keeping discipline-specific feel. ${mesocycleCtx.description}`
      : `No immediate competition — this week leans toward development. ${mesocycleCtx.description}`,
    pushBackoffNotes: pushBackoffText,
    totalLoadScore,
    sessions: allSessions,
  };
}
