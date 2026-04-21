import { IntensityLevel, SessionType } from "@prisma/client";

export type SessionSummary = {
  dayIndex: number;
  dayLabel: string;
  sessionType: SessionType;
  intensity: IntensityLevel;
  loadScore: number;
  durationMinutes: number;
};

export type PlanAdvice = {
  status: "good" | "warning" | "concern";
  headline: string;
  insights: string[];
  tweaks: string[];
};

const INTENSITY_WEIGHT: Record<IntensityLevel, number> = {
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
  MAX: 4,
};

export function buildPlanAdvice(sessions: SessionSummary[]): PlanAdvice {
  const planned = sessions
    .filter((s) => s.durationMinutes > 0)
    .sort((a, b) => a.dayIndex - b.dayIndex);

  if (!planned.length) {
    return { status: "good", headline: "No sessions planned yet.", insights: [], tweaks: [] };
  }

  const insights: string[] = [];
  const tweaks: string[] = [];

  // Consecutive hard days
  let streak = 0;
  let maxStreak = 0;
  for (const s of planned) {
    if ((INTENSITY_WEIGHT[s.intensity] ?? 1) >= 3) {
      streak++;
      maxStreak = Math.max(maxStreak, streak);
    } else {
      streak = 0;
    }
  }
  if (maxStreak >= 3) {
    insights.push(`${maxStreak} hard days in a row — fatigue stacks fast.`);
    tweaks.push("Add a low or moderate day between your heaviest sessions.");
  }

  // Total load
  const totalLoad = planned.reduce((sum, s) => sum + s.loadScore, 0);
  if (totalLoad > 50) {
    insights.push(`Weekly load of ${totalLoad} is aggressive — watch skin and tendons.`);
    tweaks.push("Drop one session or scale a high-load day to moderate.");
  } else if (totalLoad < 18 && planned.length >= 3) {
    insights.push("Load is conservative — good for a deload or early build phase.");
  }

  // Too many max-intensity sessions
  const maxCount = planned.filter((s) => s.intensity === "MAX").length;
  if (maxCount >= 2) {
    insights.push(`${maxCount} max-effort sessions this week is heavy CNS demand.`);
    tweaks.push("Limit max efforts to once per week unless this is a true peak week.");
  }

  // Limit/power overload
  const limitCount = planned.filter(
    (s) => s.sessionType === "LIMIT_BOULDERING" || s.sessionType === "POWER",
  ).length;
  if (limitCount >= 3) {
    insights.push("Three or more limit/power sessions risks overuse of finger tendons.");
    tweaks.push("Swap one limit day for route volume or technique work.");
  }

  // No rest signal (all active days with no gap)
  const indices = planned.map((s) => s.dayIndex);
  const span = Math.max(...indices) - Math.min(...indices) + 1;
  if (span === planned.length && planned.length >= 5) {
    insights.push("No rest day in the active window — recovery has to happen somewhere.");
    tweaks.push("Leave at least one full day between your two hardest blocks.");
  }

  // All good
  if (insights.length === 0) {
    const hardCount = planned.filter((s) => (INTENSITY_WEIGHT[s.intensity] ?? 1) >= 3).length;
    if (hardCount <= 2) {
      insights.push("Load and intensity look well-balanced for this week.");
    } else {
      insights.push("Plan is structured — monitor skin and sleep closely.");
    }
  }

  const status: PlanAdvice["status"] =
    tweaks.length >= 2 ? "concern" : tweaks.length === 1 ? "warning" : "good";

  return { status, headline: insights[0], insights, tweaks };
}
