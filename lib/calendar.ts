import { dayNames } from "@/lib/format";

export type CalendarEntryType = "practice" | "work" | "school" | "competition" | "travel" | "recovery" | "life" | "climbing";
export type CalendarLoad = "low" | "moderate" | "high";

export type CalendarEntry = {
  day: string;
  title: string;
  type: CalendarEntryType;
  load: CalendarLoad;
  time?: string;
  notes?: string;
  source?: "ics" | "manual"; // "ics" = synced from calendar, "manual" = added by hand
};

const normalizedDayMap = dayNames.reduce<Record<string, string>>((acc, day) => {
  acc[day.toLowerCase()] = day;
  acc[day.slice(0, 3).toLowerCase()] = day;
  return acc;
}, {});

function normalizeDay(value: string) {
  return normalizedDayMap[value.trim().toLowerCase()] ?? null;
}

function normalizeType(value: string): CalendarEntryType {
  const raw = value.trim().toLowerCase();
  if (raw.includes("practice")) return "practice";
  if (raw.includes("work")) return "work";
  if (raw.includes("comp")) return "competition";
  if (raw.includes("travel")) return "travel";
  if (raw.includes("recover")) return "recovery";
  if (raw.includes("climb")) return "climbing";
  return "life";
}

function normalizeLoad(value: string): CalendarLoad {
  const raw = value.trim().toLowerCase();
  if (raw.includes("high") || raw.includes("hard")) return "high";
  if (raw.includes("mod")) return "moderate";
  return "low";
}

export function parseWeeklyCalendar(raw: string | null | undefined): CalendarEntry[] {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((entry): entry is CalendarEntry => Boolean(entry?.day && entry?.title && entry?.type && entry?.load));
    }
  } catch {
    // Fall through to line-based parsing.
  }

  const entries = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("|").map((part) => part.trim());
      const [dayRaw, title = "", typeRaw = "life", loadRaw = "low", time = "", notes = ""] = parts;
      const day = normalizeDay(dayRaw || "");

      if (!day || !title) return null;

      return {
        day,
        title,
        type: normalizeType(typeRaw),
        load: normalizeLoad(loadRaw),
        time: time || undefined,
        notes: notes || undefined,
      } satisfies CalendarEntry;
    });

  return entries.reduce<CalendarEntry[]>((acc, entry) => {
    if (entry) acc.push(entry);
    return acc;
  }, []);
}

export function stringifyWeeklyCalendar(entries: CalendarEntry[]) {
  return entries
    .map((entry) => [entry.day, entry.title, entry.type, entry.load, entry.time ?? "", entry.notes ?? ""].join(" | "))
    .join("\n");
}

export function formatWeeklyCalendarText(raw: string | null | undefined) {
  const entries = parseWeeklyCalendar(raw);
  if (!entries.length) return "";
  return stringifyWeeklyCalendar(entries);
}
