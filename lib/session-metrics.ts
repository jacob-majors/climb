import { IntensityLevel, SessionType, type TrainingSession } from "@prisma/client";

type SessionMetricInput = Pick<
  TrainingSession,
  "sessionType" | "intensity" | "loadScore" | "durationMinutes" | "actualDurationMinutes" | "completionStatus"
>;

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function effectiveDuration(session: SessionMetricInput) {
  if (session.completionStatus === "SKIPPED") return 0;
  if (session.completionStatus === "COMPLETED" || session.completionStatus === "MODIFIED") {
    return session.actualDurationMinutes ?? session.durationMinutes;
  }
  return session.durationMinutes;
}

function intensityAdjustment(intensity: IntensityLevel) {
  switch (intensity) {
    case IntensityLevel.LOW:
      return 0;
    case IntensityLevel.MODERATE:
      return 1;
    case IntensityLevel.HIGH:
      return 2;
    case IntensityLevel.PEAK:
      return 4;
    default:
      return 0;
  }
}

function sessionStrainBias(sessionType: SessionType) {
  switch (sessionType) {
    case SessionType.LIMIT_BOULDERING:
    case SessionType.RECRUITMENT_POWER:
      return 1.4;
    case SessionType.PROJECTING:
    case SessionType.POWER_ENDURANCE:
    case SessionType.LEAD_ENDURANCE:
      return 1.2;
    case SessionType.COMPETITION:
      return 2;
    case SessionType.TEAM_PRACTICE:
      return 1.1;
    case SessionType.ARC:
      return 0.6;
    case SessionType.ANTAGONIST_STRENGTH:
      return 0.4;
    case SessionType.CORE:
      return 0.2;
    case SessionType.TECHNIQUE_DRILLS:
      return 0.1;
    case SessionType.MOBILITY:
      return -0.3;
    case SessionType.ACTIVE_RECOVERY:
      return -1;
    case SessionType.FULL_REST:
      return -3;
    default:
      return 0;
  }
}

function sessionTryHardBias(sessionType: SessionType) {
  switch (sessionType) {
    case SessionType.LIMIT_BOULDERING:
    case SessionType.RECRUITMENT_POWER:
    case SessionType.PROJECTING:
      return 1.2;
    case SessionType.LEAD_ENDURANCE:
    case SessionType.POWER_ENDURANCE:
      return 0.8;
    case SessionType.COMPETITION:
      return 1.5;
    case SessionType.TEAM_PRACTICE:
      return 0.4;
    case SessionType.ARC:
      return -0.5;
    case SessionType.MOBILITY:
      return -1.5;
    case SessionType.ACTIVE_RECOVERY:
      return -1.8;
    case SessionType.FULL_REST:
      return -3;
    default:
      return 0;
  }
}

export function calculateSessionStrain(session: SessionMetricInput) {
  const duration = effectiveDuration(session);
  const raw =
    session.loadScore * 0.9 +
    duration / 24 +
    intensityAdjustment(session.intensity) +
    sessionStrainBias(session.sessionType);

  return roundToTenth(clamp(raw, 0, 21));
}

export function strainLabel(score: number) {
  if (score >= 16) return "Peak";
  if (score >= 12) return "Hard";
  if (score >= 8) return "Solid";
  if (score >= 4) return "Building";
  if (score > 0) return "Easy";
  return "Off";
}

export function calculateSessionTryHard(session: SessionMetricInput) {
  const duration = effectiveDuration(session);
  const base =
    (session.intensity === IntensityLevel.LOW
      ? 2.5
      : session.intensity === IntensityLevel.MODERATE
        ? 4.5
        : session.intensity === IntensityLevel.HIGH
          ? 7
          : 8.5) +
    sessionTryHardBias(session.sessionType) +
    session.loadScore / 5 +
    (duration >= 90 ? 0.5 : duration >= 60 ? 0.2 : 0);

  return roundToTenth(clamp(base, 0, 10));
}

export function tryHardLabel(score: number) {
  if (score >= 8.5) return "Full send";
  if (score >= 7) return "On it";
  if (score >= 5) return "Locked in";
  if (score >= 3) return "Controlled";
  if (score > 0) return "Cruise";
  return "Off";
}
