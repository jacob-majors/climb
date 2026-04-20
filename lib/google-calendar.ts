import { addDays, startOfDay } from "date-fns";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { parseLocalDateInput } from "@/lib/format";
import { ImportedCalendarEvent } from "@/lib/ics";

export const GOOGLE_CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

type GoogleCalendarListResponse = {
  items?: Array<{
    id: string;
    summary?: string;
    primary?: boolean;
    selected?: boolean;
    hidden?: boolean;
    accessRole?: string;
  }>;
};

type GoogleCalendarEventDate = {
  dateTime?: string;
  date?: string;
};

type GoogleCalendarEventsResponse = {
  items?: Array<{
    id: string;
    status?: string;
    summary?: string;
    description?: string;
    location?: string;
    start?: GoogleCalendarEventDate;
    end?: GoogleCalendarEventDate;
  }>;
};

function parseGoogleEventDate(value?: GoogleCalendarEventDate | null) {
  if (!value) return null;

  if (value.dateTime) {
    const parsed = new Date(value.dateTime);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (value.date) {
    return parseLocalDateInput(value.date);
  }

  return null;
}

function readableCalendars(payload: GoogleCalendarListResponse) {
  return (payload.items ?? []).filter((calendar) => {
    if (!calendar.id) return false;
    if (calendar.hidden) return false;
    if (calendar.selected === false) return false;
    return calendar.accessRole !== "none";
  });
}

async function googleFetch<T>(accessToken: string, url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`google-calendar-${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getCurrentGoogleAccessToken() {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    const client = await clerkClient();
    const response = await client.users.getUserOauthAccessToken(userId, "google");
    return response.data[0]?.token ?? null;
  } catch {
    return null;
  }
}

export async function fetchGoogleCalendarEvents(accessToken: string): Promise<ImportedCalendarEvent[]> {
  const syncStart = addDays(startOfDay(new Date()), -1).toISOString();
  const syncEnd = addDays(startOfDay(new Date()), 21).toISOString();

  const calendarList = await googleFetch<GoogleCalendarListResponse>(
    accessToken,
    "https://www.googleapis.com/calendar/v3/users/me/calendarList",
  );

  const calendars = readableCalendars(calendarList);
  const importedEvents: ImportedCalendarEvent[] = [];

  for (const calendar of calendars) {
    const url =
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events` +
      `?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(syncStart)}` +
      `&timeMax=${encodeURIComponent(syncEnd)}&maxResults=250`;

    const eventsResponse = await googleFetch<GoogleCalendarEventsResponse>(accessToken, url);

    for (const event of eventsResponse.items ?? []) {
      if (event.status === "cancelled") continue;

      const start = parseGoogleEventDate(event.start);
      if (!start) continue;

      const end = parseGoogleEventDate(event.end) ?? undefined;
      const calendarLabel = calendar.summary?.trim() || (calendar.primary ? "Primary" : "Google Calendar");
      const description = [`Calendar: ${calendarLabel}`, event.description?.trim()].filter(Boolean).join("\n\n") || undefined;

      importedEvents.push({
        title: event.summary?.trim() || "Untitled event",
        start,
        end,
        location: event.location?.trim() || undefined,
        description,
      });
    }
  }

  return importedEvents;
}
