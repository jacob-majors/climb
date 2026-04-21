import { addDays, isBefore, startOfDay } from "date-fns";
import { TrainingPlan, TrainingSession } from "@prisma/client";
import { dayNames } from "@/lib/format";
import { findAvailabilityForDay, formatTrainingWindow } from "@/lib/training-availability";

type CompletionStatus = "PLANNED" | "COMPLETED" | "MODIFIED" | "SKIPPED";

export type SessionEntry = {
  session: TrainingSession;
  date: Date;
  windowLabel: string | null;
};

export type AdherenceSummary = {
  sessionPercent: number;
  minutesPercent: number;
  loadPercent: number;
  dueSessionCount: number;
  completedSessionCount: number;
  skippedSessionCount: number;
  plannedMinutes: number;
  actualMinutes: number;
  plannedLoad: number;
  actualLoad: number;
  headline: string;
  helper: string;
  sessionToLog: SessionEntry | null;
};

function parseClockMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function applyMinutes(date: Date, minutes: number | null) {
  if (minutes === null) return date;

  const copy = new Date(date);
  copy.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return copy;
}

export function getSessionDate(planStart: Date, dayIndex: number, trainingAvailabilityRaw?: string | null, dayLabel?: string) {
  const baseDate = addDays(startOfDay(planStart), dayIndex);
  if (!dayLabel) return applyMinutes(baseDate, 17 * 60);

  const likelyWindow = findAvailabilityForDay(trainingAvailabilityRaw, dayLabel).windows[0];
  const likelyStart = likelyWindow ? parseClockMinutes(likelyWindow.start) : 17 * 60;
  return applyMinutes(baseDate, likelyStart);
}

export function getSessionEntry(
  session: TrainingSession,
  planStart: Date,
  trainingAvailabilityRaw?: string | null,
): SessionEntry {
  const window = findAvailabilityForDay(trainingAvailabilityRaw, session.dayLabel).windows[0];
  const scheduledWindowLabel =
    session.scheduledStartTime && session.scheduledEndTime
      ? [session.scheduledWindowLabel, `${session.scheduledStartTime}-${session.scheduledEndTime}`].filter(Boolean).join(" • ")
      : null;

  return {
    session,
    date: applyMinutes(
      addDays(startOfDay(planStart), session.dayIndex),
      parseClockMinutes(session.scheduledStartTime ?? "") ?? (
        window ? parseClockMinutes(window.start) : 17 * 60
      ),
    ),
    windowLabel: scheduledWindowLabel || (window ? formatTrainingWindow(window) : null),
  };
}

export function getUpcomingSession(plan: (TrainingPlan & { sessions: TrainingSession[] }) | undefined, trainingAvailabilityRaw?: string | null) {
  if (!plan) return null;

  const now = new Date();
  const plannedSessions = plan.sessions
    .filter((session) => session.durationMinutes > 0 && session.completionStatus === "PLANNED")
    .map((session) => getSessionEntry(session, plan.startDate, trainingAvailabilityRaw));
  const upcoming = plannedSessions
    .filter(({ date }) => !isBefore(date, now))
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

  return upcoming ?? plannedSessions.sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null;
}

function completionCounts(status: CompletionStatus) {
  return status === "COMPLETED" || status === "MODIFIED";
}

function effectiveDuration(session: TrainingSession) {
  if (session.completionStatus === "SKIPPED") return 0;
  if (session.completionStatus === "PLANNED") return 0;
  return session.actualDurationMinutes ?? session.durationMinutes;
}

function effectiveLoad(session: TrainingSession) {
  if (session.completionStatus === "SKIPPED") return 0;
  if (session.completionStatus === "PLANNED") return 0;

  const duration = session.durationMinutes || 1;
  const actualDuration = session.actualDurationMinutes ?? duration;
  const scaledLoad = session.loadScore * (actualDuration / duration);

  return Math.max(0, Math.round(scaledLoad));
}

export function buildAdherenceSummary(
  plan: (TrainingPlan & { sessions: TrainingSession[] }) | undefined,
  trainingAvailabilityRaw?: string | null,
): AdherenceSummary | null {
  if (!plan) return null;

  const now = new Date();
  const eligibleSessions = plan.sessions.filter((session) => session.durationMinutes > 0);
  const datedSessions = eligibleSessions.map((session) => getSessionEntry(session, plan.startDate, trainingAvailabilityRaw));
  const dueSessions = datedSessions.filter(({ date }) => !isBefore(now, date));
  const completedDueSessions = dueSessions.filter(({ session }) => completionCounts(session.completionStatus));
  const skippedDueSessions = dueSessions.filter(({ session }) => session.completionStatus === "SKIPPED");
  const loggableDueSession =
    [...dueSessions]
      .reverse()
      .find(({ session }) => session.completionStatus === "PLANNED") ?? null;

  const plannedMinutes = dueSessions.reduce((sum, { session }) => sum + session.durationMinutes, 0);
  const actualMinutes = dueSessions.reduce((sum, { session }) => sum + effectiveDuration(session), 0);
  const plannedLoad = dueSessions.reduce((sum, { session }) => sum + session.loadScore, 0);
  const actualLoad = dueSessions.reduce((sum, { session }) => sum + effectiveLoad(session), 0);

  if (!dueSessions.length) {
    return {
      sessionPercent: 100,
      minutesPercent: 100,
      loadPercent: 100,
      dueSessionCount: 0,
      completedSessionCount: 0,
      skippedSessionCount: 0,
      plannedMinutes: 0,
      actualMinutes: 0,
      plannedLoad: 0,
      actualLoad: 0,
      headline: "On track so far",
      helper: "Nothing is due yet, so the week is still on pace. Log the next session once you finish it.",
      sessionToLog: getUpcomingSession(plan, trainingAvailabilityRaw),
    };
  }

  const sessionPercent = Math.round((completedDueSessions.length / dueSessions.length) * 100);
  const minutesPercent = plannedMinutes ? Math.min(100, Math.round((actualMinutes / plannedMinutes) * 100)) : 100;
  const loadPercent = plannedLoad ? Math.min(100, Math.round((actualLoad / plannedLoad) * 100)) : 100;

  return {
    sessionPercent,
    minutesPercent,
    loadPercent,
    dueSessionCount: dueSessions.length,
    completedSessionCount: completedDueSessions.length,
    skippedSessionCount: skippedDueSessions.length,
    plannedMinutes,
    actualMinutes,
    plannedLoad,
    actualLoad,
    headline: `${completedDueSessions.length}/${dueSessions.length} due sessions logged`,
    helper:
      skippedDueSessions.length > 0
        ? `${skippedDueSessions.length} skipped so far. If the week changed, log the session honestly so the plan can adapt.`
        : "These rings only judge the sessions that should have happened by now, not the whole week in advance.",
    sessionToLog: loggableDueSession,
  };
}

export function nextOccurrenceOfDay(day: string) {
  const targetIndex = dayNames.indexOf(day);
  if (targetIndex === -1) return startOfDay(new Date());

  const today = new Date();
  const todayIndex = (today.getDay() + 6) % 7;
  const offset = (targetIndex - todayIndex + 7) % 7;
  return addDays(startOfDay(today), offset);
}
