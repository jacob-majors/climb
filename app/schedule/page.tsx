import Link from "next/link";
import { parseWeeklyCalendar } from "@/lib/calendar";
import { ScheduleEditor } from "@/components/schedule-editor";
import { Card } from "@/components/ui/card";
import { getActiveAthlete } from "@/lib/data";
import { getCurrentGoogleAccessToken } from "@/lib/google-calendar";
import { getOrCreateDbUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toDateInputValue } from "@/lib/format";
import { parseTrainingAvailability } from "@/lib/training-availability";
import { differenceInCalendarDays, startOfDay } from "date-fns";

type SchedulePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function scheduleStatusMessage(error?: string, success?: string) {
  if (success === "google-calendar-synced") {
    return {
      tone: "green",
      title: "Google Calendar synced",
      description: "Your Google events were pulled into the weekly schedule and will now shape availability and training load.",
    };
  }

  switch (error) {
    case "calendar-import":
      return {
        tone: "clay",
        title: "ICS import failed",
        description: "One of the calendar links could not be read. Check the link and try again.",
      };
    case "no-calendar-url":
      return {
        tone: "amber",
        title: "No ICS link saved",
        description: "Add a calendar link first, then use sync.",
      };
    case "google-calendar-sync":
      return {
        tone: "clay",
        title: "Google Calendar sync failed",
        description: "Google responded unexpectedly. Try again in a minute, then reconnect Google if it keeps failing.",
      };
    default:
      return null;
  }
}

function availabilityValue(raw: string | null | undefined, day: string, fallback: number) {
  if (!raw) return fallback;
  try { return JSON.parse(raw)[day] ?? fallback; }
  catch { return fallback; }
}

function getUpcomingCompetitions<T extends { eventDate: Date }>(competitions: T[]) {
  const today = startOfDay(new Date());
  return competitions.filter((competition) => differenceInCalendarDays(startOfDay(competition.eventDate), today) >= 0);
}

export default async function SchedulePage({ searchParams }: SchedulePageProps) {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");
  const athlete = await getActiveAthlete(userId);
  const schedule = athlete?.scheduleConstraint;
  const googleCalendarConnected = Boolean(await getCurrentGoogleAccessToken());
  const params = (await searchParams) ?? {};
  const statusMessage = scheduleStatusMessage(firstParam(params.error), firstParam(params.success));

  if (!athlete) {
    return (
      <Card>
        <p className="text-sm text-ink/70">Create an athlete profile first.</p>
      </Card>
    );
  }

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

  const competitions = getUpcomingCompetitions(athlete.competitionEvents).map((competition) => ({
    id: competition.id,
    name: competition.name,
    date: toDateInputValue(competition.eventDate),
    location: competition.location ?? "",
    discipline: competition.discipline,
    notes: competition.notes ?? "",
  }));

  const hasCalendar = Boolean(schedule?.calendarSourceUrl);
  const linkCount = schedule?.calendarSourceUrl?.split("\n").filter(Boolean).length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-ink">Schedule</p>
          <p className="text-sm text-ink/55">Your week, your competition, and your calendar sync all in one place.</p>
        </div>
        <div className="flex items-center gap-2">
          {statusMessage && (
            <span className={`hidden sm:block text-xs font-semibold px-3 py-1.5 rounded-full border ${
              statusMessage.tone === "green" ? "border-moss/25 bg-moss/10 text-pine" :
              statusMessage.tone === "clay" ? "border-clay/20 bg-clay/5 text-clay" :
              "border-amber-200 bg-amber-50/70 text-amber-700"
            }`}>
              {statusMessage.title}
            </span>
          )}
          <Link
            href="/schedule/edit"
            className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-pine hover:text-pine shadow-sm"
          >
            Edit
          </Link>
        </div>
      </div>

      {/* ── Main schedule editor (handles its own form in edit mode) ── */}
      <ScheduleEditor
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
