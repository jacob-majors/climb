import { addDays, format, isAfter, isBefore, startOfDay } from "date-fns";
import { CalendarEntry, CalendarEntryType, inferCalendarEntryType } from "@/lib/calendar";
import { dayNames } from "@/lib/format";

export type ImportedCalendarEvent = {
  title: string;
  start: Date;
  end?: Date;
  location?: string;
  description?: string;
};

function isUpcomingEvent(event: ImportedCalendarEvent) {
  return isAfter(event.start, addDays(startOfDay(new Date()), -1));
}

function unfoldIcsLines(text: string) {
  return text.replace(/\r?\n[ \t]/g, "");
}

function parseIcsDate(value: string) {
  const cleaned = value.trim();

  if (/^\d{8}$/.test(cleaned)) {
    const year = Number(cleaned.slice(0, 4));
    const month = Number(cleaned.slice(4, 6)) - 1;
    const day = Number(cleaned.slice(6, 8));
    return new Date(year, month, day);
  }

  if (/^\d{8}T\d{6}Z$/.test(cleaned)) {
    const year = Number(cleaned.slice(0, 4));
    const month = Number(cleaned.slice(4, 6)) - 1;
    const day = Number(cleaned.slice(6, 8));
    const hour = Number(cleaned.slice(9, 11));
    const minute = Number(cleaned.slice(11, 13));
    const second = Number(cleaned.slice(13, 15));
    return new Date(Date.UTC(year, month, day, hour, minute, second));
  }

  if (/^\d{8}T\d{6}$/.test(cleaned)) {
    const year = Number(cleaned.slice(0, 4));
    const month = Number(cleaned.slice(4, 6)) - 1;
    const day = Number(cleaned.slice(6, 8));
    const hour = Number(cleaned.slice(9, 11));
    const minute = Number(cleaned.slice(11, 13));
    const second = Number(cleaned.slice(13, 15));
    return new Date(year, month, day, hour, minute, second);
  }

  const parsed = new Date(cleaned);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function parseIcs(text: string) {
  const lines = unfoldIcsLines(text).split(/\r?\n/);
  const events: ImportedCalendarEvent[] = [];
  let current: Partial<ImportedCalendarEvent> | null = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      current = {};
      continue;
    }

    if (line === "END:VEVENT") {
      if (current?.title && current.start) {
        events.push({
          title: current.title,
          start: current.start,
          end: current.end,
          location: current.location,
          description: current.description,
        });
      }
      current = null;
      continue;
    }

    if (!current) continue;

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).split(";")[0];
    const value = line.slice(separatorIndex + 1);

    if (key === "SUMMARY") current.title = value;
    if (key === "LOCATION") current.location = value;
    if (key === "DESCRIPTION") current.description = value.replace(/\\n/g, "\n");
    if (key === "DTSTART") current.start = parseIcsDate(value) ?? undefined;
    if (key === "DTEND") current.end = parseIcsDate(value) ?? undefined;
  }

  return events;
}

function inferType(title: string, description?: string): CalendarEntryType {
  return inferCalendarEntryType(title, description ?? "");
}

function isHolidayEvent(event: ImportedCalendarEvent) {
  const source = `${event.title} ${event.description ?? ""}`.toLowerCase();
  return [
    "holiday",
    "no school",
    "school closed",
    "campus closed",
    "break",
    "vacation",
    "teacher workday",
    "staff development",
    "inservice",
    "minimum day",
    "early release",
  ].some((needle) => source.includes(needle));
}

function isCompetitionImport(event: ImportedCalendarEvent) {
  const source = `${event.title} ${event.description ?? ""}`.toLowerCase();
  const excludedTerms = [
    "practice",
    "team practice",
    "workshop",
    "yoga",
    "conditioning",
    "portrait",
    "portraits",
    "breathwork",
    "canceled",
    "cancelled",
    "training",
    "mock comp",
  ];

  if (excludedTerms.some((needle) => source.includes(needle))) {
    return false;
  }

  return [
    "divisional",
    "divisionals",
    "regional",
    "regionals",
    "qualifier",
    "qualifying",
    "final",
    "finals",
    "championship",
    "competition",
    "nationals",
  ].some((needle) => source.includes(needle));
}

function inferLoad(title: string, type: CalendarEntryType, durationHours: number) {
  const source = title.toLowerCase();
  if (type === "competition") return "high" as const;
  if (type === "travel") return "high" as const;
  if (source.includes("limit") || source.includes("power") || source.includes("interval")) return "high" as const;
  if (durationHours >= 3) return "high" as const;
  if (durationHours >= 1.5) return "moderate" as const;
  return "low" as const;
}

function toDayName(date: Date) {
  const jsDay = date.getDay();
  return dayNames[(jsDay + 6) % 7];
}

export function importableCalendarEntries(events: ImportedCalendarEvent[]) {
  const now = startOfDay(new Date());
  const windowEnd = addDays(now, 21);

  const filtered = events.filter((event) => isUpcomingEvent(event) && isBefore(event.start, windowEnd) && !isHolidayEvent(event));

  // Separate school events from everything else, group school by exact date
  const schoolByDate = new Map<string, ImportedCalendarEvent[]>();
  const nonSchool: ImportedCalendarEvent[] = [];

  for (const event of filtered) {
    if (inferType(event.title, event.description) === "school") {
      const dateKey = format(event.start, "yyyy-MM-dd");
      const bucket = schoolByDate.get(dateKey) ?? [];
      bucket.push(event);
      schoolByDate.set(dateKey, bucket);
    } else {
      nonSchool.push(event);
    }
  }

  // Merge each day's school events into one "School" block
  const schoolEntries: CalendarEntry[] = [];
  for (const [dateKey, schoolEvents] of schoolByDate) {
    schoolEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
    const first = schoolEvents[0];
    const last = schoolEvents[schoolEvents.length - 1];
    const end = last.end ?? new Date(last.start.getTime() + 60 * 60 * 1000);
    const durationHours = (end.getTime() - first.start.getTime()) / (1000 * 60 * 60);
    schoolEntries.push({
      day: toDayName(first.start),
      title: "School",
      type: "school",
      load: inferLoad("school", "school", durationHours),
      time: `${format(first.start, "h:mm a")} - ${format(end, "h:mm a")}`,
      date: dateKey,
      source: "ics",
    });
  }

  const otherEntries: CalendarEntry[] = nonSchool.map((event) => {
    const type = inferType(event.title, event.description);
    const durationHours = event.end
      ? Math.max(0.5, (event.end.getTime() - event.start.getTime()) / (1000 * 60 * 60))
      : 1;
    return {
      day: toDayName(event.start),
      title: event.title,
      type,
      load: inferLoad(event.title, type, durationHours),
      time: event.end ? `${format(event.start, "h:mm a")} - ${format(event.end, "h:mm a")}` : format(event.start, "h:mm a"),
      date: format(event.start, "yyyy-MM-dd"),
      notes: [event.location, event.description].filter(Boolean).join(" • ") || undefined,
      source: "ics",
    };
  });

  return [...schoolEntries, ...otherEntries];
}

export function importedCompetitionEvents(events: ImportedCalendarEvent[]) {
  return events
    .filter((event) => isUpcomingEvent(event))
    .filter((event) => isCompetitionImport(event))
    .map((event) => ({
      name: event.title,
      eventDate: event.start,
      location: event.location ?? null,
      notes: event.description ?? null,
    }));
}
