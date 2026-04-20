import { CompetitionEvent, ScheduleConstraint, TrainingSession } from "@prisma/client";
import { addDays, differenceInCalendarDays, format, isWithinInterval, startOfDay } from "date-fns";
import { getRecoveryBand } from "@/lib/recovery";

export type PeakForecastPoint = {
  date: Date;
  label: string;
  load: number;
  readiness: number;
  form: number;
};

export type PeakForecast = {
  predictedPeakDate: Date;
  predictedPeakLabel: string;
  peakScore: number;
  confidence: number;
  rationale: string;
  series: PeakForecastPoint[];
};

type PeakInput = {
  schedule: ScheduleConstraint;
  competitions: CompetitionEvent[];
  sessions?: TrainingSession[];
  planStartDate?: Date;
};

function upcomingCompetition(competitions: CompetitionEvent[]) {
  const today = startOfDay(new Date());
  return competitions
    .filter((competition) => differenceInCalendarDays(competition.eventDate, today) >= 0)
    .sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime())[0];
}

function normalizedLoadScore(load: number) {
  return Math.min(100, Math.round(load * 10));
}

function getSessionLoadForDate(date: Date, planStartDate: Date | undefined, sessions: TrainingSession[] | undefined) {
  if (!planStartDate || !sessions?.length) return 0;
  const dayOffset = differenceInCalendarDays(date, startOfDay(planStartDate));
  const session = sessions.find((candidate) => candidate.dayIndex === dayOffset);
  return session ? normalizedLoadScore(session.loadScore) : 0;
}

export function buildPeakForecast({ schedule, competitions, sessions = [], planStartDate }: PeakInput): PeakForecast {
  const today = startOfDay(new Date());
  const nextCompetition = upcomingCompetition(competitions);
  const horizon = nextCompetition ? Math.min(21, Math.max(7, differenceInCalendarDays(nextCompetition.eventDate, today) + 3)) : 14;
  const recovery = getRecoveryBand(schedule);
  const baseReadiness = recovery.score;
  const sleep = schedule.sleepScore ?? 72;
  const soreness = schedule.sorenessLevel ?? 3;
  const strain = schedule.dayStrain ?? 11;
  const energy = schedule.energyLevel ?? 6;
  const fatigue = schedule.fatigueLevel ?? 4;
  const series: PeakForecastPoint[] = [];
  let rollingFatigue = fatigue * 8 + Math.max(0, strain - 10) * 3 + soreness * 2;

  for (let day = 0; day < horizon; day += 1) {
    const date = addDays(today, day);
    const sessionLoad = getSessionLoadForDate(date, planStartDate, sessions);
    const compDistance = nextCompetition ? Math.abs(differenceInCalendarDays(nextCompetition.eventDate, date)) : null;
    const taperBonus = compDistance !== null && compDistance <= 3 ? 10 - compDistance * 2 : compDistance !== null && compDistance <= 7 ? 4 : 0;
    const compPenalty = nextCompetition && isWithinInterval(date, { start: nextCompetition.eventDate, end: nextCompetition.eventDate }) ? 4 : 0;

    rollingFatigue = Math.max(8, rollingFatigue * 0.72 + sessionLoad * 0.45);

    const readiness = Math.max(
      20,
      Math.min(
        100,
        Math.round(baseReadiness * 0.55 + sleep * 0.15 + energy * 3 - soreness * 2 - rollingFatigue * 0.18),
      ),
    );

    const form = Math.max(
      10,
      Math.min(
        100,
        Math.round(readiness * 0.72 + taperBonus - compPenalty + (sessionLoad < 30 ? 6 : 0) - Math.max(0, day - 10)),
      ),
    );

    series.push({
      date,
      label: format(date, "MMM d"),
      load: Math.round(sessionLoad),
      readiness,
      form,
    });
  }

  const bestPoint = [...series].sort((a, b) => b.form - a.form)[0];
  const peakDistanceToComp = nextCompetition ? Math.abs(differenceInCalendarDays(nextCompetition.eventDate, bestPoint.date)) : 4;
  const confidence = Math.max(
    35,
    Math.min(
      95,
      Math.round(
        55 +
          (nextCompetition ? Math.max(0, 12 - peakDistanceToComp * 3) : 0) +
          (recovery.band === "green" ? 12 : recovery.band === "yellow" ? 6 : -6) +
          Math.max(0, 8 - soreness),
      ),
    ),
  );

  const rationale = nextCompetition
    ? `Forecast favors ${format(bestPoint.date, "MMM d")} because readiness climbs while load falls into ${nextCompetition.name} on ${format(nextCompetition.eventDate, "MMM d")}.`
    : `Forecast favors ${format(bestPoint.date, "MMM d")} because recovery and lower fatigue are lining up better than the surrounding days.`;

  return {
    predictedPeakDate: bestPoint.date,
    predictedPeakLabel: format(bestPoint.date, "MMM d, yyyy"),
    peakScore: bestPoint.form,
    confidence,
    rationale,
    series,
  };
}
