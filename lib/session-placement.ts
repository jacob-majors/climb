import { TrainingSession } from "@prisma/client";
import { parseWeeklyCalendar } from "@/lib/calendar";
import {
  findAvailabilityForDay,
  formatTrainingWindow,
  parseTrainingAvailability,
  type TrainingWindow,
} from "@/lib/training-availability";
import { dayNames } from "@/lib/format";

export type PlacementWindow = {
  dayIndex: number;
  dayLabel: string;
  label: string;
  start: string;
  end: string;
  fitScore: number;
  reason: string;
};

type PlacementLike = Pick<
  TrainingSession,
  "dayIndex" | "dayLabel" | "durationMinutes" | "scheduledWindowLabel" | "scheduledStartTime" | "scheduledEndTime"
>;

function parseClockMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function windowMinutes(window: TrainingWindow) {
  const start = parseClockMinutes(window.start);
  const end = parseClockMinutes(window.end);
  if (start === null || end === null || end <= start) return 0;
  return end - start;
}

function placementReason(dayLabel: string, hasCalendarLoad: boolean, fits: boolean) {
  if (!fits) return `${dayLabel} is open, but the slot is tight so keep the session concise.`;
  if (hasCalendarLoad) return `${dayLabel} still has training space without ignoring the rest of your calendar.`;
  return `${dayLabel} has a clean window that fits the planned duration well.`;
}

export function getSuggestedPlacementWindows(
  session: PlacementLike,
  trainingAvailabilityRaw?: string | null,
  weeklyCalendarRaw?: string | null,
) {
  const availability = parseTrainingAvailability(trainingAvailabilityRaw);
  const calendarEntries = parseWeeklyCalendar(weeklyCalendarRaw);

  const suggestions = availability.flatMap((day, dayIndex) =>
    day.windows.map((window) => {
      const minutes = windowMinutes(window);
      const durationGap = Math.abs(minutes - session.durationMinutes);
      const sameDayBonus = dayIndex === session.dayIndex ? 24 : 0;
      const fitsBonus = minutes >= session.durationMinutes ? 18 : 0;
      const hasCalendarLoad = calendarEntries.some((entry) => entry.day === day.day);
      const calendarPenalty = hasCalendarLoad ? 8 : 0;
      const latePenalty = parseClockMinutes(window.start) !== null && (parseClockMinutes(window.start) as number) >= 20 * 60 ? 10 : 0;
      const fitScore = Math.max(1, 100 - durationGap / 3 + sameDayBonus + fitsBonus - calendarPenalty - latePenalty);

      return {
        dayIndex,
        dayLabel: day.day,
        label: window.label?.trim() || formatTrainingWindow(window),
        start: window.start,
        end: window.end,
        fitScore: Math.round(fitScore),
        reason: placementReason(day.day, hasCalendarLoad, minutes >= session.durationMinutes),
      } satisfies PlacementWindow;
    }),
  );

  if (suggestions.length) {
    return suggestions.sort((a, b) => b.fitScore - a.fitScore);
  }

  return dayNames.map((dayLabel, dayIndex) => {
    const fallback = findAvailabilityForDay(trainingAvailabilityRaw, dayLabel).windows[0];
    return {
      dayIndex,
      dayLabel,
      label: fallback?.label?.trim() || "Best open time",
      start: fallback?.start || "17:00",
      end: fallback?.end || "18:30",
      fitScore: dayIndex === session.dayIndex ? 72 : 50,
      reason: `${dayLabel} is available as a fallback until more calendar detail is added.`,
    } satisfies PlacementWindow;
  }).sort((a, b) => b.fitScore - a.fitScore);
}

export function getCurrentPlacement(session: PlacementLike, trainingAvailabilityRaw?: string | null) {
  if (session.scheduledStartTime && session.scheduledEndTime) {
    return {
      label: session.scheduledWindowLabel || "Scheduled",
      start: session.scheduledStartTime,
      end: session.scheduledEndTime,
    };
  }

  const fallback = findAvailabilityForDay(trainingAvailabilityRaw, session.dayLabel).windows[0];
  if (!fallback) return null;

  return {
    label: fallback.label?.trim() || "Suggested",
    start: fallback.start,
    end: fallback.end,
  };
}
