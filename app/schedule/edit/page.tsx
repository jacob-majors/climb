import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { refreshCalendarAction, syncGoogleCalendarAction } from "@/app/actions";
import { parseWeeklyCalendar } from "@/lib/calendar";
import { CalendarLinkManager } from "@/components/calendar-link-manager";
import { ScheduleEditor } from "@/components/schedule-editor";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { getActiveAthlete } from "@/lib/data";
import { getCurrentGoogleAccessToken } from "@/lib/google-calendar";
import { getOrCreateDbUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toDateInputValue } from "@/lib/format";
import { parseTrainingAvailability } from "@/lib/training-availability";
import { differenceInCalendarDays, format, startOfDay } from "date-fns";

function availabilityValue(raw: string | null | undefined, day: string, fallback: number) {
  if (!raw) return fallback;
  try { return JSON.parse(raw)[day] ?? fallback; }
  catch { return fallback; }
}

function getUpcomingCompetitions<T extends { eventDate: Date }>(competitions: T[]) {
  const today = startOfDay(new Date());
  return competitions.filter((c) => differenceInCalendarDays(startOfDay(c.eventDate), today) >= 0);
}

export default async function ScheduleEditPage() {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");
  const athlete = await getActiveAthlete(userId);
  const schedule = athlete?.scheduleConstraint;
  const googleCalendarConnected = Boolean(await getCurrentGoogleAccessToken());

  if (!athlete) {
    return (
      <Card>
        <p className="text-sm text-ink/70">Create an athlete profile first.</p>
      </Card>
    );
  }

  const now = new Date();
  const dayName = format(now, "EEEE");
  const dateStr = format(now, "MMMM d, yyyy");
  const timeStr = format(now, "h:mm a");

  const dayFields = [
    { label: "Monday", fallback: 60 },
    { label: "Tuesday", fallback: 120 },
    { label: "Wednesday", fallback: 60 },
    { label: "Thursday", fallback: 120 },
    { label: "Friday", fallback: 30 },
    { label: "Saturday", fallback: 120 },
    { label: "Sunday", fallback: 60 },
  ];

  const initialAvailability = dayFields.reduce<Record<string, number>>((acc, d) => {
    acc[d.label] = availabilityValue(schedule?.timeAvailableByDay, d.label, d.fallback);
    return acc;
  }, {});

  const competitions = getUpcomingCompetitions(athlete.competitionEvents).map((c) => ({
    id: c.id,
    name: c.name,
    date: toDateInputValue(c.eventDate),
    location: c.location ?? "",
    discipline: c.discipline,
    notes: c.notes ?? "",
  }));

  const hasCalendar = Boolean(schedule?.calendarSourceUrl);
  const linkCount = schedule?.calendarSourceUrl?.split("\n").filter(Boolean).length ?? 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/schedule"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/10 bg-white text-ink/60 transition hover:border-pine/40 hover:text-pine"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <p className="text-base font-semibold text-ink">Edit schedule</p>
          <p className="text-xs text-ink/45">
            {dayName} · {dateStr} · {timeStr}
          </p>
        </div>
      </div>

      {/* Calendar sources */}
      <div className="rounded-[24px] border border-ink/10 bg-white/80 p-4 space-y-3">
        <p className="text-sm font-semibold text-ink">Calendar sources</p>
        <p className="text-xs text-ink/55">Pull in events from Google Calendar or an ICS link so the plan knows what you already have going on.</p>

        {/* Google Calendar */}
        <div className="flex flex-col gap-2 rounded-2xl border border-ink/8 bg-mist/30 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">Google Calendar</p>
            <p className="text-xs text-ink/55">
              {googleCalendarConnected
                ? "Connected — pull your latest events in."
                : "Connect once, grant read-only access, then sync."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/profile?intent=google-calendar"
              className="inline-flex items-center rounded-full border border-ink/10 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-pine"
            >
              {googleCalendarConnected ? "Manage access" : "Connect Google"}
            </Link>
            {googleCalendarConnected && (
              <form action={syncGoogleCalendarAction}>
                <SubmitButton label="Sync now" pendingLabel="Syncing…" />
              </form>
            )}
          </div>
        </div>

        {/* ICS links */}
        <div className="rounded-2xl border border-ink/8 bg-mist/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">ICS / Calendar link</p>
              <p className="text-xs text-ink/55">
                {hasCalendar
                  ? `${linkCount} link${linkCount !== 1 ? "s" : ""} · last synced ${schedule?.importedCalendarAt ? new Date(schedule.importedCalendarAt).toLocaleString() : "never"}`
                  : "Paste an .ics URL from Apple Calendar, Outlook, etc."}
              </p>
            </div>
            {hasCalendar && (
              <form action={refreshCalendarAction}>
                <input type="hidden" name="userId" value={athlete.id} />
                <SubmitButton label="Sync" pendingLabel="Syncing…" />
              </form>
            )}
          </div>
          <CalendarLinkManager
            userId={athlete.id}
            initialUrls={schedule?.calendarSourceUrl?.split("\n").filter(Boolean) ?? []}
            hasCalendar={hasCalendar}
          />
        </div>
      </div>

      {/* Schedule editor in edit mode */}
      <ScheduleEditor
        initialMode="edit"
        doneHref="/schedule"
        initialEvents={parseWeeklyCalendar(schedule?.weeklyCalendar)}
        initialCompetitions={competitions}
        initialAvailability={initialAvailability}
        initialTrainingAvailability={parseTrainingAvailability(schedule?.trainingAvailability)}
        passthrough={{
          athleteId: athlete.id,
          calendarSourceUrl: schedule?.calendarSourceUrl ?? "",
          schoolWorkSchedule: schedule?.schoolWorkSchedule ?? "",
          practiceSchedule: schedule?.practiceSchedule ?? "",
          teamPractices: schedule?.teamPractices ?? "",
          workNotes: schedule?.workNotes ?? "",
          travelDates: schedule?.travelDates ?? "",
          restDayPreferences: schedule?.restDayPreferences ?? "",
          hardDaysRelativeToPractice: schedule?.hardDaysRelativeToPractice ?? "",
          weeklyAvailabilityNotes: schedule?.weeklyAvailabilityNotes ?? "",
          fatigueLevel: schedule?.fatigueLevel ?? 4,
          energyLevel: schedule?.energyLevel ?? "",
          sorenessLevel: schedule?.sorenessLevel ?? "",
          sleepScore: schedule?.sleepScore ?? "",
          recoveryScore: schedule?.recoveryScore ?? "",
          skinQuality: schedule?.skinQuality ?? "",
          dayStrain: schedule?.dayStrain ?? "",
          recentClimbingDays: schedule?.recentClimbingDays ?? "",
          workAtGym: schedule?.workAtGym ?? false,
          taperPreference: schedule?.taperPreference ?? true,
          recoveryNeedsAfterComp: schedule?.recoveryNeedsAfterComp ?? true,
        }}
      />
    </div>
  );
}
