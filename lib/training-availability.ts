import { differenceInMinutes, format } from "date-fns";
import { dayNames } from "@/lib/format";
import { ImportedCalendarEvent } from "@/lib/ics";

const CALENDAR_TIME_ZONE = "America/Los_Angeles";

export type TrainingWindow = {
  start: string;
  end: string;
  label?: string;
};

export type DayAvailability = {
  day: string;
  windows: TrainingWindow[];
};

export type TrainingAvailability = DayAvailability[];

type Interval = {
  start: number;
  end: number;
};

const DAY_START = 6 * 60;
const DAY_END = 22 * 60;

function timeStringToMinutes(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function minutesToTimeString(value: number) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, value));
  const hours = Math.floor(clamped / 60);
  const minutes = clamped % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function defaultLabel(start: number, end: number) {
  if (start < 9 * 60) return "Before school";
  if (start < 15 * 60) return "Midday";
  if (start < 18 * 60) return "After classes";
  return "Evening";
}

function normalizeWindows(windows: TrainingWindow[]) {
  return windows
    .map((window) => {
      const start = timeStringToMinutes(window.start);
      const end = timeStringToMinutes(window.end);
      if (start === null || end === null || end <= start) return null;
      return {
        start: minutesToTimeString(start),
        end: minutesToTimeString(end),
        label: window.label?.trim() || defaultLabel(start, end),
      };
    })
    .filter((window): window is NonNullable<typeof window> => Boolean(window))
    .sort((a, b) => (timeStringToMinutes(a.start) ?? 0) - (timeStringToMinutes(b.start) ?? 0));
}

export function emptyTrainingAvailability(): TrainingAvailability {
  return dayNames.map((day) => ({ day, windows: [] }));
}

export function parseTrainingAvailability(raw: string | null | undefined): TrainingAvailability {
  if (!raw) return emptyTrainingAvailability();

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const byDay = new Map(parsed.filter((entry) => entry?.day).map((entry) => [entry.day, normalizeWindows(entry.windows ?? [])]));
      return dayNames.map((day) => ({ day, windows: byDay.get(day) ?? [] }));
    }
  } catch {
    // ignore malformed saved value
  }

  return emptyTrainingAvailability();
}

export function stringifyTrainingAvailability(availability: TrainingAvailability) {
  return JSON.stringify(
    dayNames.map((day) => {
      const match = availability.find((entry) => entry.day === day);
      return {
        day,
        windows: normalizeWindows(match?.windows ?? []),
      };
    }),
  );
}

export function longestWindowMinutes(windows: TrainingWindow[]) {
  return windows.reduce((best, window) => {
    const start = timeStringToMinutes(window.start);
    const end = timeStringToMinutes(window.end);
    if (start === null || end === null) return best;
    return Math.max(best, end - start);
  }, 0);
}

export function availabilityMinutesByDay(availability: TrainingAvailability) {
  return dayNames.reduce<Record<string, number>>((acc, day) => {
    const entry = availability.find((item) => item.day === day);
    acc[day] = longestWindowMinutes(entry?.windows ?? []);
    return acc;
  }, {});
}

function mergeIntervals(intervals: Interval[]) {
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  return sorted.reduce<Interval[]>((acc, current) => {
    const last = acc[acc.length - 1];
    if (!last || current.start > last.end) {
      acc.push({ ...current });
      return acc;
    }

    last.end = Math.max(last.end, current.end);
    return acc;
  }, []);
}

function getEventInterval(event: ImportedCalendarEvent): Interval | null {
  if (!event.end) return null;
  const startParts = new Intl.DateTimeFormat("en-US", {
    timeZone: CALENDAR_TIME_ZONE,
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(event.start);
  const endParts = new Intl.DateTimeFormat("en-US", {
    timeZone: CALENDAR_TIME_ZONE,
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(event.end);
  const startByType = Object.fromEntries(startParts.map((part) => [part.type, part.value]));
  const endByType = Object.fromEntries(endParts.map((part) => [part.type, part.value]));
  const startMinutes = Number(startByType.hour) * 60 + Number(startByType.minute);
  const endMinutes = Number(endByType.hour) * 60 + Number(endByType.minute);
  if (endMinutes <= startMinutes) return null;
  return {
    start: Math.max(DAY_START, startMinutes),
    end: Math.min(DAY_END, endMinutes),
  };
}

function getEventDayName(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CALENDAR_TIME_ZONE,
    weekday: "long",
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  return dayNames.find((day) => day === weekday) ?? null;
}

function freeIntervalsFromBusy(intervals: Interval[]) {
  const merged = mergeIntervals(intervals.filter((interval) => interval.end - interval.start >= 15));
  const free: Interval[] = [];
  let cursor = DAY_START;

  for (const interval of merged) {
    if (interval.start > cursor) {
      free.push({ start: cursor, end: interval.start });
    }
    cursor = Math.max(cursor, interval.end);
  }

  if (cursor < DAY_END) {
    free.push({ start: cursor, end: DAY_END });
  }

  return free.filter((interval) => interval.end - interval.start >= 45);
}

export function deriveAvailabilityFromCalendar(events: ImportedCalendarEvent[]) {
  const grouped = new Map<string, Interval[]>();

  for (const day of dayNames) {
    grouped.set(day, []);
  }

  for (const event of events) {
    const interval = getEventInterval(event);
    if (!interval) continue;
    const day = getEventDayName(event.start);
    if (!day) continue;
    grouped.get(day)?.push(interval);
  }

  return dayNames.map((day) => {
    const freeWindows = freeIntervalsFromBusy(grouped.get(day) ?? [])
      .map((interval) => ({
        start: minutesToTimeString(interval.start),
        end: minutesToTimeString(interval.end),
        label: defaultLabel(interval.start, interval.end),
      }))
      .slice(0, 3);

    return { day, windows: freeWindows };
  });
}

export function formatTrainingWindow(window: TrainingWindow) {
  const start = timeStringToMinutes(window.start);
  const end = timeStringToMinutes(window.end);
  if (start === null || end === null) {
    return [window.label, `${window.start}-${window.end}`].filter(Boolean).join(" • ");
  }

  const startDate = new Date(2026, 0, 1, Math.floor(start / 60), start % 60);
  const endDate = new Date(2026, 0, 1, Math.floor(end / 60), end % 60);
  const duration = Math.max(0, differenceInMinutes(endDate, startDate));
  return [window.label, `${format(startDate, "h:mma")}-${format(endDate, "h:mma")}`, `${duration} min`].filter(Boolean).join(" • ");
}

export function findAvailabilityForDay(raw: string | null | undefined, day: string) {
  return parseTrainingAvailability(raw).find((entry) => entry.day === day) ?? { day, windows: [] };
}
