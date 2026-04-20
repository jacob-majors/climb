import { dayNames } from "@/lib/format";

export type CalendarEntryType = "practice" | "work" | "school" | "competition" | "travel" | "recovery" | "life" | "climbing";
export type CalendarLoad = "low" | "moderate" | "high";
export type CalendarEntrySource = "ics" | "google" | "manual";

export type CalendarEntry = {
  day: string;
  title: string;
  type: CalendarEntryType;
  load: CalendarLoad;
  time?: string;
  notes?: string;
  source?: CalendarEntrySource;
  date?: string; // ISO "YYYY-MM-DD" — set for ICS/Google events to anchor to a specific week
};

const normalizedDayMap = dayNames.reduce<Record<string, string>>((acc, day) => {
  acc[day.toLowerCase()] = day;
  acc[day.slice(0, 3).toLowerCase()] = day;
  return acc;
}, {});

function normalizeDay(value: string) {
  return normalizedDayMap[value.trim().toLowerCase()] ?? null;
}

function includesAny(source: string, needles: string[]) {
  return needles.some((needle) => source.includes(needle));
}

export function inferCalendarEntryType(title: string, hint = ""): CalendarEntryType {
  const source = `${title} ${hint}`.trim().toLowerCase();

  if (includesAny(source, ["practice", "training", "team session"])) return "practice";
  if (includesAny(source, ["work", "shift", "coach", "setting"])) return "work";
  if (includesAny(source, ["class", "lecture", "school", "period", "exam", "seminar", "study hall"])) return "school";
  if (includesAny(source, ["travel", "flight", "drive", "trip"])) return "travel";
  if (includesAny(source, ["recover", "recovery", "rest", "mobility"])) return "recovery";
  if (includesAny(source, ["competition", "qualifier", "qualifying", "divisional", "divisionals", "final", "finals", "championship", "scramble", "comp "])) {
    return "competition";
  }
  if (includesAny(source, ["climb", "climbing", "boulder", "lead", "board session"])) return "climbing";
  return "practice";
}

function normalizeType(value: string, title = ""): CalendarEntryType {
  return inferCalendarEntryType(title, value);
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
        type: normalizeType(typeRaw, title),
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
