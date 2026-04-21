import Link from "next/link";
import {
  ArrowRight,
  BriefcaseBusiness,
  CalendarDays,
  Clock3,
  GraduationCap,
  HeartPulse,
  MapPin,
  Mountain,
  Play,
  Sparkles,
  Trophy,
} from "lucide-react";
import { addDays, differenceInCalendarDays, format, formatDistanceToNowStrict, isBefore, startOfDay } from "date-fns";
import { LoadChart } from "@/components/load-chart";
import { ProgressRing } from "@/components/progress-ring";
import { SectionHeading } from "@/components/section-heading";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { updateQuickCheckInAction, updateSessionCompletionAction } from "@/app/actions";
import { parseWeeklyCalendar, type CalendarEntryType } from "@/lib/calendar";
import { getActiveAthlete } from "@/lib/data";
import { getOrCreateDbUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { dayNames, formatDate, formatSessionType, intensityClass, intensityLabel } from "@/lib/format";
import { buildAdherenceSummary, getSessionDate, getSessionEntry, getUpcomingSession, nextOccurrenceOfDay } from "@/lib/plan-progress";
import { getRecoveryBand, recoveryClass, recoveryLabel } from "@/lib/recovery";
import { buildPeakForecast } from "@/lib/peak-forecast";
import { buildSessionCoachSummary } from "@/lib/session-coach";
import { findAvailabilityForDay, formatTrainingWindow } from "@/lib/training-availability";
import {
  calculateSessionStrain,
  calculateSessionTryHard,
  strainLabel,
  tryHardLabel,
} from "@/lib/session-metrics";
import { ensureFreshTrainingPlan } from "@/lib/plan-sync";

type AthleteRecord = Awaited<ReturnType<typeof getActiveAthlete>>;
type Athlete = NonNullable<AthleteRecord>;
type TrainingPlan = Athlete["trainingPlans"][number];
const completionStatus = {
  planned: "PLANNED",
  completed: "COMPLETED",
  modified: "MODIFIED",
  skipped: "SKIPPED",
} as const;

type UpcomingItem = {
  key: string;
  title: string;
  type: "session" | "competition" | CalendarEntryType;
  date: Date;
  href: string;
  meta: string;
  notes?: string;
};

type TodayItem = {
  title: string;
  type: CalendarEntryType;
  time?: string;
  notes?: string;
};

function daysToCompetition(date: Date) {
  return differenceInCalendarDays(startOfDay(date), startOfDay(new Date()));
}

function countdownLabel(days: number) {
  if (days < 0) return "Competition date has passed";
  if (days === 0) return "Competition starts today";
  if (days === 1) return "1 day to go";
  return `${days} days to go`;
}

function getNextCompetition(competitions: Athlete["competitionEvents"]) {
  const today = startOfDay(new Date());

  return competitions.find((competition) => differenceInCalendarDays(startOfDay(competition.eventDate), today) >= 0) ?? null;
}

function getLocalTodayInfo(timeZone = "America/Los_Angeles") {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "long",
  }).formatToParts(new Date());

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    isoDate: `${byType.year}-${byType.month}-${byType.day}`,
    weekday: byType.weekday,
  };
}

function buildTodayItems(schedule: NonNullable<Athlete["scheduleConstraint"]>) {
  const today = getLocalTodayInfo();

  return parseWeeklyCalendar(schedule.weeklyCalendar)
    .filter((entry) => {
      if (entry.type === "competition") return false;
      if (entry.date) return entry.date === today.isoDate;
      return entry.day === today.weekday;
    })
    .sort((a, b) => (inferEventStartMinutes(a.time) ?? 24 * 60) - (inferEventStartMinutes(b.time) ?? 24 * 60))
    .map((entry) => ({
      title: entry.title,
      type: entry.type,
      time: entry.time,
      notes: entry.notes,
    }));
}

function humanizeTimeRange(time?: string | null) {
  if (!time) return null;
  return time.replace(/\s*[–-]\s*/g, " to ");
}

function todayHeadline(items: TodayItem[], sessionEntry: ReturnType<typeof getUpcomingSession>) {
  const first = items[0];
  if (first) {
    const timeLabel = humanizeTimeRange(first.time);
    return `${first.title}${timeLabel ? ` from ${timeLabel}` : ""}`;
  }

  if (sessionEntry) {
    return `${sessionEntry.session.title}${sessionEntry.windowLabel ? ` at ${sessionEntry.windowLabel}` : ""}`;
  }

  return "Nothing scheduled today";
}

function competitionDateLabel(competition: Athlete["competitionEvents"][number]) {
  const notes = competition.notes ?? "";
  const rangeMatch = /(May\s+\d{1,2}\s*-\s*\d{1,2},?\s*\d{4})/i.exec(notes);
  if (rangeMatch) return rangeMatch[1].replace(/\s+/g, " ");
  return format(competition.eventDate, "MMM d, yyyy");
}

function metricPercent(value: number | null | undefined, max: number) {
  if (value === null || value === undefined) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function parseFocusAreas(value?: string | null) {
  if (!value) return [];

  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function readinessCue(band: ReturnType<typeof getRecoveryBand>["band"]) {
  if (band === "green") return "You have room to push if the session quality feels good.";
  if (band === "yellow") return "Keep quality high, but do not force extra volume.";
  return "Back off, keep it light, and protect skin and fingers.";
}

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

function inferEventStartMinutes(raw?: string | null) {
  if (!raw) return null;

  const compact = raw.trim().toLowerCase().replace(/\s+/g, "");
  const firstToken = compact.split("-")[0] ?? compact;
  const match = /^(\d{1,2})(?::(\d{2}))?(am|pm)?$/.exec(firstToken);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  let meridiem = match[3];

  if (!meridiem) {
    if (compact.includes("pm")) meridiem = "pm";
    if (compact.includes("am") && !compact.includes("pm")) meridiem = "am";
  }

  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function buildUpcomingItems({
  latestPlan,
  schedule,
  competitions,
}: {
  latestPlan?: TrainingPlan;
  schedule: NonNullable<Athlete["scheduleConstraint"]>;
  competitions: Athlete["competitionEvents"];
}) {
  const now = new Date();
  const calendarEntries = parseWeeklyCalendar(schedule.weeklyCalendar);
  const items: UpcomingItem[] = [];

  if (latestPlan) {
    for (const session of latestPlan.sessions.filter((entry) => entry.durationMinutes > 0 && entry.completionStatus === completionStatus.planned)) {
      const date = getSessionDate(latestPlan.startDate, session.dayIndex, schedule.trainingAvailability, session.dayLabel);
      if (isBefore(date, now)) continue;

      const window = findAvailabilityForDay(schedule.trainingAvailability, session.dayLabel).windows[0];
      items.push({
        key: `session-${session.id}`,
        title: session.title,
        type: "session",
        date,
        href: `/plans/${latestPlan.id}`,
        meta: [session.dayLabel, window ? formatTrainingWindow(window) : `${session.durationMinutes} min`].filter(Boolean).join(" • "),
        notes: session.whyChosen,
      });
    }
  }

  for (const [index, event] of calendarEntries.entries()) {
    const baseDate = latestPlan ? addDays(startOfDay(latestPlan.startDate), dayNames.indexOf(event.day)) : nextOccurrenceOfDay(event.day);
    const date = applyMinutes(baseDate, inferEventStartMinutes(event.time) ?? 12 * 60);
    if (isBefore(date, now)) continue;

    items.push({
      key: `calendar-${index}-${event.day}-${event.title}`,
      title: event.title,
      type: event.type,
      date,
      href: "/schedule",
      meta: [event.day, event.time].filter(Boolean).join(" • "),
      notes: event.notes,
    });
  }

  for (const competition of competitions) {
    if (isBefore(competition.eventDate, startOfDay(now))) continue;

    items.push({
      key: `competition-${competition.id}`,
      title: competition.name,
      type: "competition",
      date: competition.eventDate,
      href: "/schedule",
      meta: [formatDate(competition.eventDate), competition.location].filter(Boolean).join(" • "),
      notes: competition.notes ?? undefined,
    });
  }

  return items.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 6);
}

function selectClassName() {
  return "w-full rounded-2xl border border-ink/10 bg-white px-4 py-3.5 text-sm text-ink outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/15";
}

function MobileQuestion({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue?: number | null;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium text-ink">{label}</span>
      <select name={name} defaultValue={defaultValue?.toString() ?? ""} className={selectClassName()}>
        <option value="">Skip for now</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MobileQuestionGroup({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <details open={defaultOpen} className="group rounded-[24px] border border-ink/10 bg-mist/70 p-4 open:bg-mist">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="mt-1 text-xs leading-5 text-ink/60">{description}</p>
        </div>
        <span className="rounded-full border border-ink/10 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55 transition group-open:text-pine">
          {defaultOpen ? "Start here" : "Tap to add"}
        </span>
      </summary>
      <div className="mt-4 grid gap-3">{children}</div>
    </details>
  );
}

function upcomingAppearance(type: UpcomingItem["type"]) {
  switch (type) {
    case "session":
      return {
        label: "Session",
        Icon: Mountain,
        iconClass: "bg-pine/10 text-pine",
        badgeClass: "border-pine/15 bg-pine/5 text-pine",
      };
    case "competition":
      return {
        label: "Comp",
        Icon: Trophy,
        iconClass: "bg-clay/10 text-clay",
        badgeClass: "border-clay/15 bg-clay/5 text-clay",
      };
    case "work":
      return {
        label: "Work",
        Icon: BriefcaseBusiness,
        iconClass: "bg-sandstone/35 text-clay",
        badgeClass: "border-sandstone/45 bg-sandstone/25 text-clay",
      };
    case "school":
      return {
        label: "School",
        Icon: GraduationCap,
        iconClass: "bg-blue-50 text-blue-700",
        badgeClass: "border-blue-200 bg-blue-50 text-blue-700",
      };
    case "practice":
      return {
        label: "Practice",
        Icon: Sparkles,
        iconClass: "bg-moss/15 text-pine",
        badgeClass: "border-moss/20 bg-moss/10 text-pine",
      };
    default:
      return {
        label: "Event",
        Icon: CalendarDays,
        iconClass: "bg-ink/5 text-ink/70",
        badgeClass: "border-ink/10 bg-ink/5 text-ink/65",
      };
  }
}

function selectCurrentWeekPlan(plans: Athlete["trainingPlans"]) {
  if (!plans.length) return undefined;

  const today = startOfDay(new Date()).getTime();
  const activePlan = plans.find((plan) => {
    const start = startOfDay(plan.startDate).getTime();
    const end = startOfDay(plan.endDate).getTime();
    return today >= start && today <= end;
  });

  if (activePlan) return activePlan;

  const upcomingPlan = [...plans]
    .filter((plan) => startOfDay(plan.startDate).getTime() >= today)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0];

  return upcomingPlan ?? plans[0];
}

function completionBadge(status: Athlete["trainingPlans"][number]["sessions"][number]["completionStatus"]) {
  switch (status) {
    case "COMPLETED":
      return {
        label: "Done",
        className: "border-moss/30 bg-moss/10 text-pine",
      };
    case "MODIFIED":
      return {
        label: "Adjusted",
        className: "border-sandstone/45 bg-sandstone/25 text-clay",
      };
    case "SKIPPED":
      return {
        label: "Skipped",
        className: "border-clay/20 bg-clay/10 text-clay",
      };
    default:
      return {
        label: "Planned",
        className: "border-ink/10 bg-ink/5 text-ink/60",
      };
  }
}

export default async function DashboardPage() {
  let userId: string | null = null;
  try {
    userId = await getOrCreateDbUser();
  } catch (err) {
    return <Card><p className="text-sm text-red-600 font-mono">Auth error: {String(err)}</p></Card>;
  }
  if (!userId) redirect("/sign-in");

  let athlete;
  try {
    athlete = await getActiveAthlete(userId);
  } catch (err) {
    return <Card><p className="text-sm text-red-600 font-mono">DB error: {String(err)}</p></Card>;
  }

  if (!athlete || !athlete.profile || !athlete.scheduleConstraint) {
    redirect("/profile");
  }

  if (!selectCurrentWeekPlan(athlete.trainingPlans)) {
    await ensureFreshTrainingPlan(userId);
    athlete = await getActiveAthlete(userId);
  }

  if (!athlete || !athlete.profile || !athlete.scheduleConstraint) {
    redirect("/profile");
  }

  const schedule = athlete.scheduleConstraint;
  const recovery = getRecoveryBand(schedule);
  let currentPlan = selectCurrentWeekPlan(athlete.trainingPlans);
  let sessionEntry = getUpcomingSession(currentPlan, schedule.trainingAvailability);
  let todayItems: TodayItem[] = [];
  let nextComp = getNextCompetition(athlete.competitionEvents);
  let daysUntilComp = nextComp ? daysToCompetition(nextComp.eventDate) : null;
  let focusAreas = parseFocusAreas(currentPlan?.keyFocusAreas);
  let adherenceSummary = buildAdherenceSummary(currentPlan, schedule.trainingAvailability);
  let compPrepSummary =
    currentPlan?.compPrepNotes ||
    currentPlan?.pushBackoffNotes ||
    currentPlan?.recoveryNotes ||
    currentPlan?.explanation ||
    null;
  let upcomingItems: UpcomingItem[] = [];
  let weekSessions:
    Array<ReturnType<typeof getSessionEntry> & { strain: number; tryHard: number }> = [];

  try {
    todayItems = buildTodayItems(schedule);
    upcomingItems = buildUpcomingItems({
      latestPlan: currentPlan,
      schedule,
      competitions: athlete.competitionEvents,
    });
    if (currentPlan) {
      const plan = currentPlan;
      weekSessions = plan.sessions.map((session) => {
        const entry = getSessionEntry(session, plan.startDate, schedule.trainingAvailability);
        return {
          ...entry,
          strain: calculateSessionStrain(session),
          tryHard: calculateSessionTryHard(session),
        };
      });
    }
  } catch (error) {
    console.error("Dashboard derived-data fallback:", error);
    currentPlan = currentPlan ?? undefined;
    sessionEntry = getUpcomingSession(currentPlan, schedule.trainingAvailability);
    nextComp = getNextCompetition(athlete.competitionEvents);
    daysUntilComp = nextComp ? daysToCompetition(nextComp.eventDate) : null;
    focusAreas = parseFocusAreas(currentPlan?.keyFocusAreas);
    adherenceSummary = buildAdherenceSummary(currentPlan, schedule.trainingAvailability);
    compPrepSummary =
      currentPlan?.compPrepNotes ||
      currentPlan?.pushBackoffNotes ||
      currentPlan?.recoveryNotes ||
      currentPlan?.explanation ||
      null;
    todayItems = [];
    upcomingItems = [];
    weekSessions = [];
  }
  const hasDueSessions = Boolean(adherenceSummary?.dueSessionCount);
  const progressHeadline =
    adherenceSummary && !hasDueSessions && sessionEntry ? `First checkmark: ${sessionEntry.session.title}` : adherenceSummary?.headline;
  const progressHelper =
    adherenceSummary && !hasDueSessions && sessionEntry
      ? `${sessionEntry.session.dayLabel}${sessionEntry.windowLabel ? ` • ${sessionEntry.windowLabel}` : ""} is the first session that will count toward this week's rings.`
      : adherenceSummary?.helper;
  const ringSessionValue = hasDueSessions
    ? `${adherenceSummary?.completedSessionCount ?? 0}/${adherenceSummary?.dueSessionCount ?? 0}`
    : sessionEntry
      ? "Next"
      : "--";
  const ringMinutesValue = hasDueSessions
    ? `${adherenceSummary?.actualMinutes ?? 0}/${adherenceSummary?.plannedMinutes ?? 0}`
    : sessionEntry
      ? `${sessionEntry.session.durationMinutes}m`
      : "--";
  const ringLoadValue = hasDueSessions
    ? `${adherenceSummary?.actualLoad ?? 0}/${adherenceSummary?.plannedLoad ?? 0}`
    : sessionEntry
      ? `${sessionEntry.session.loadScore}`
      : "--";
  let peakForecast: ReturnType<typeof buildPeakForecast> = {
    predictedPeakDate: currentPlan?.startDate ?? new Date(),
    predictedPeakLabel: currentPlan?.startDate ? format(currentPlan.startDate, "MMM d, yyyy") : format(new Date(), "MMM d, yyyy"),
    confidence: 0,
    peakScore: 0,
    rationale: "Peak forecast is temporarily unavailable.",
    series: [],
  };

  try {
    peakForecast = buildPeakForecast({
      schedule,
      competitions: athlete.competitionEvents,
      sessions: currentPlan?.sessions ?? [],
      planStartDate: currentPlan?.startDate,
    });
  } catch (error) {
    console.error("Dashboard peak forecast fallback:", error);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
      <Card className="space-y-4 lg:hidden">
        <SectionHeading
          eyebrow="Quick Check-In"
          title="Log only what you have time for"
          description="Answer one question or a few. The dashboard should still work when you are in a rush."
        />

        <form action={updateQuickCheckInAction} className="space-y-4">
          <input type="hidden" name="userId" value={athlete.id} />
          <div className="grid gap-3">
            <MobileQuestionGroup title="10-second check-in" description="The fastest version. Just log the big things." defaultOpen>
              <MobileQuestion
                name="recentClimbingDays"
                label="How many climbing days in the last week?"
                defaultValue={schedule.recentClimbingDays}
                options={[0, 1, 2, 3, 4, 5, 6, 7].map((value) => ({ value: value.toString(), label: value.toString() }))}
              />
              <MobileQuestion
                name="skinQuality"
                label="How is your skin?"
                defaultValue={schedule.skinQuality}
                options={[
                  { value: "3", label: "Rough" },
                  { value: "5", label: "Okay" },
                  { value: "7", label: "Good" },
                  { value: "9", label: "Fresh" },
                ]}
              />
              <MobileQuestion
                name="sorenessLevel"
                label="How sore are you?"
                defaultValue={schedule.sorenessLevel}
                options={[
                  { value: "2", label: "Light" },
                  { value: "4", label: "Manageable" },
                  { value: "6", label: "Pretty sore" },
                  { value: "8", label: "Very sore" },
                ]}
              />
            </MobileQuestionGroup>

            <MobileQuestionGroup title="30-second check-in" description="Add this when you have a little more time before training.">
              <MobileQuestion
                name="fatigueLevel"
                label="How tired do you feel?"
                defaultValue={schedule.fatigueLevel}
                options={[
                  { value: "2", label: "Fresh" },
                  { value: "4", label: "Fine" },
                  { value: "6", label: "A bit cooked" },
                  { value: "8", label: "Heavy fatigue" },
                ]}
              />
              <MobileQuestion
                name="energyLevel"
                label="How is your energy?"
                defaultValue={schedule.energyLevel}
                options={[
                  { value: "3", label: "Low" },
                  { value: "5", label: "Normal" },
                  { value: "7", label: "Good" },
                  { value: "9", label: "Ready to go" },
                ]}
              />
              <MobileQuestion
                name="sleepScore"
                label="How was sleep?"
                defaultValue={schedule.sleepScore}
                options={[
                  { value: "55", label: "Bad sleep" },
                  { value: "70", label: "Okay sleep" },
                  { value: "82", label: "Pretty solid" },
                  { value: "92", label: "Great sleep" },
                ]}
              />
            </MobileQuestionGroup>

            <MobileQuestionGroup title="Full recovery check" description="Use this when you want readiness and load to be more precise.">
              <MobileQuestion
                name="recoveryScore"
                label="Overall recovery"
                defaultValue={schedule.recoveryScore}
                options={[
                  { value: "45", label: "Low" },
                  { value: "60", label: "Mixed" },
                  { value: "75", label: "Good" },
                  { value: "88", label: "High" },
                ]}
              />
              <MobileQuestion
                name="dayStrain"
                label="How loaded did the last day feel?"
                defaultValue={schedule.dayStrain ? Math.round(schedule.dayStrain) : null}
                options={[
                  { value: "8", label: "Light day" },
                  { value: "11", label: "Normal day" },
                  { value: "14", label: "Hard day" },
                  { value: "17", label: "Big day" },
                ]}
              />
            </MobileQuestionGroup>
          </div>
          <SubmitButton label="Update today" pendingLabel="Updating..." className="w-full justify-center" />
        </form>
      </Card>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="space-y-4">
          <SectionHeading
            eyebrow="Today"
            title={todayHeadline(todayItems, sessionEntry)}
            description={todayItems.length ? "What is on the calendar today." : sessionEntry ? "No calendar event is saved for today, so the next planned session is shown." : "Nothing is on the calendar today."}
          />

          {todayItems.length ? (
            <div className="space-y-3">
              {todayItems.map((item, index) => {
                const appearance = upcomingAppearance(item.type);

                return (
                  <div key={`${item.title}-${index}`} className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-mist/40 p-4">
                    <span className={`rounded-2xl p-2.5 ${appearance.iconClass}`}>
                      <appearance.Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{item.title}</p>
                      {item.time ? <p className="mt-1 text-sm text-ink/65">{humanizeTimeRange(item.time)}</p> : null}
                      {item.notes ? <p className="mt-2 text-xs leading-5 text-ink/55">{item.notes}</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : sessionEntry ? (
            <div className="rounded-2xl border border-pine/10 bg-pine/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Next session</p>
              <p className="mt-2 text-sm font-semibold text-ink">{sessionEntry.session.title}</p>
              <p className="mt-1 text-sm text-ink/65">
                {sessionEntry.session.dayLabel}
                {sessionEntry.windowLabel ? ` • ${sessionEntry.windowLabel}` : ""}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-ink/10 p-4 text-sm text-ink/55">Nothing is scheduled for today.</div>
          )}
        </Card>

        <Card className="overflow-hidden p-0">
          {nextComp ? (
            <div className="rounded-[28px] bg-ink px-6 pt-8 pb-6 text-chalk">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-chalk/55">Countdown</p>
              <p className="mt-2 text-2xl font-black text-chalk">{nextComp.name}</p>
              <p className="mt-1 text-sm text-chalk/60">{competitionDateLabel(nextComp)}</p>
              {nextComp.location ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-chalk/45">
                  <MapPin className="h-3 w-3" />
                  {nextComp.location}
                </p>
              ) : null}
              <div className="mt-6 flex items-end gap-4">
                <div>
                  <p className="text-[4.5rem] font-black leading-none tabular-nums text-chalk">{daysUntilComp ?? "–"}</p>
                  <p className="mt-1 text-sm font-medium text-chalk/60">{daysUntilComp !== null ? countdownLabel(daysUntilComp) : "No comp date"}</p>
                </div>
                <div className="mb-1 text-chalk/35 text-sm font-medium">days</div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-2xl bg-white/8 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-chalk/50">Recovery</p>
                  <p className={`mt-1.5 text-base font-bold ${recovery.band === "green" ? "text-emerald-400" : recovery.band === "yellow" ? "text-amber-400" : "text-red-400"}`}>
                    {recovery.band === "green" ? "Green" : recovery.band === "yellow" ? "Yellow" : "Red"}
                  </p>
                  <p className="text-xs text-chalk/40">{recovery.score}/100</p>
                </div>
                <div className="rounded-2xl bg-white/8 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-chalk/50">Peak</p>
                  <p className="mt-1.5 text-base font-bold text-chalk">{format(peakForecast.predictedPeakDate, "MMM d")}</p>
                  <p className="text-xs text-chalk/40">{peakForecast.confidence}% conf.</p>
                </div>
                <div className="rounded-2xl bg-white/8 px-3 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-chalk/50">Form</p>
                  <p className="mt-1.5 text-base font-bold text-chalk">{peakForecast.peakScore}/100</p>
                  <p className="text-xs text-chalk/40">peak form</p>
                </div>
              </div>

              <p className="mt-4 text-xs leading-5 text-chalk/50">{peakForecast.rationale}</p>
            </div>
          ) : (
            <div className="px-6 py-8">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-pine/60">No competition saved</p>
              <p className="mt-2 text-2xl font-black text-ink">Add your next comp</p>
              <p className="mt-1 text-sm text-ink/55">Set a competition date to unlock the countdown, taper forecast, and peak alignment.</p>
            </div>
          )}

          <div className="flex items-center gap-3 px-6 py-4">
            <span className={`h-2.5 w-2.5 rounded-full ${recovery.band === "green" ? "bg-emerald-500" : recovery.band === "yellow" ? "bg-amber-400" : "bg-red-500"}`} />
            <div>
              <p className="text-sm font-semibold text-ink">{recoveryLabel(recovery.band)}</p>
              <p className="text-xs text-ink/50">{readinessCue(recovery.band)}</p>
            </div>
          </div>
        </Card>
      </section>

      {adherenceSummary ? (
        <Card className="space-y-5">
          <SectionHeading
            eyebrow="Plan Follow-Through"
            title="Training rings"
            description="These rings only score the sessions that should have happened by now, so future sessions do not count against you yet."
          />

          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="grid gap-4 sm:grid-cols-3">
              <ProgressRing
                label="Sessions"
                valueLabel={ringSessionValue}
                helper={hasDueSessions ? "Due sessions logged so far." : sessionEntry ? "First scored session is coming up next." : "Nothing planned yet."}
                percent={adherenceSummary.sessionPercent}
                tone="pine"
              />
              <ProgressRing
                label="Minutes"
                valueLabel={ringMinutesValue}
                helper={hasDueSessions ? "Planned minutes vs. actual minutes." : sessionEntry ? "Next planned duration." : "No minutes planned yet."}
                percent={adherenceSummary.minutesPercent}
                tone="clay"
              />
              <ProgressRing
                label="Load"
                valueLabel={ringLoadValue}
                helper={hasDueSessions ? "Load hit so far this week." : sessionEntry ? "Next session load target." : "No load planned yet."}
                percent={adherenceSummary.loadPercent}
                tone="ink"
              />
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl bg-mist p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">Progress read</p>
                <p className="mt-2 text-lg font-semibold text-ink">{progressHeadline}</p>
                <p className="mt-2 text-sm leading-6 text-ink/70">{progressHelper}</p>
                {adherenceSummary.skippedSessionCount ? (
                  <p className="mt-3 text-sm font-medium text-clay">
                    {adherenceSummary.skippedSessionCount} skipped session{adherenceSummary.skippedSessionCount === 1 ? "" : "s"} logged.
                  </p>
                ) : null}
              </div>

              {adherenceSummary.sessionToLog && hasDueSessions ? (
                <div className="rounded-2xl border border-pine/10 bg-pine/5 p-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">Quick log</p>
                    <p className="text-sm font-semibold text-ink">{adherenceSummary.sessionToLog.session.title}</p>
                    <p className="text-xs leading-5 text-ink/60">
                      {adherenceSummary.sessionToLog.session.dayLabel}
                      {adherenceSummary.sessionToLog.windowLabel ? ` • ${adherenceSummary.sessionToLog.windowLabel}` : ""}
                    </p>
                  </div>

                  <form action={updateSessionCompletionAction} className="mt-4 space-y-3">
                    <input type="hidden" name="sessionId" value={adherenceSummary.sessionToLog.session.id} />
                    <input type="hidden" name="returnTo" value="/dashboard" />

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="text-sm font-medium text-ink">Actual minutes</span>
                        <input
                          name="actualDurationMinutes"
                          type="number"
                          min="0"
                          defaultValue={adherenceSummary.sessionToLog.session.actualDurationMinutes ?? adherenceSummary.sessionToLog.session.durationMinutes}
                          className={selectClassName()}
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-medium text-ink">Notes</span>
                        <input
                          name="completionNotes"
                          defaultValue={adherenceSummary.sessionToLog.session.completionNotes ?? ""}
                          placeholder="Felt good, shortened, low skin..."
                          className={selectClassName()}
                        />
                      </label>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="submit"
                        name="completionStatus"
                        value={completionStatus.completed}
                        className="rounded-full bg-pine px-3 py-2.5 text-sm font-semibold text-chalk transition hover:bg-ink"
                      >
                        Done
                      </button>
                      <button
                        type="submit"
                        name="completionStatus"
                        value={completionStatus.modified}
                        className="rounded-full border border-pine/15 bg-white px-3 py-2.5 text-sm font-semibold text-pine transition hover:border-pine"
                      >
                        Adjusted
                      </button>
                      <button
                        type="submit"
                        name="completionStatus"
                        value={completionStatus.skipped}
                        className="rounded-full border border-clay/15 bg-white px-3 py-2.5 text-sm font-semibold text-clay transition hover:border-clay"
                      >
                        Skip
                      </button>
                    </div>
                  </form>
                </div>
              ) : sessionEntry ? (
                <div className="rounded-2xl border border-pine/10 bg-pine/5 p-4">
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">Next target</p>
                    <p className="text-sm font-semibold text-ink">{sessionEntry.session.title}</p>
                    <p className="text-xs leading-5 text-ink/60">
                      {sessionEntry.session.dayLabel}
                      {sessionEntry.windowLabel ? ` • ${sessionEntry.windowLabel}` : ""}
                    </p>
                    <p className="text-sm leading-6 text-ink/70">
                      Once you finish this session, come back here and log how closely you matched the plan.
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        {sessionEntry ? (
          <Card className="space-y-4">
            {(() => {
              const coach = buildSessionCoachSummary({
                sessionType: sessionEntry.session.sessionType,
                intensity: sessionEntry.session.intensity,
                durationMinutes: sessionEntry.session.durationMinutes,
                loadScore: sessionEntry.session.loadScore,
              });

              return (
                <>
            <SectionHeading
              eyebrow="Next Session"
              title={sessionEntry.session.title}
              description={`${sessionEntry.session.dayLabel} • ${formatDistanceToNowStrict(sessionEntry.date, { addSuffix: true })}${sessionEntry.windowLabel ? ` • ${sessionEntry.windowLabel}` : ""}`}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-ink/60">
                {formatSessionType(sessionEntry.session.sessionType)} • {sessionEntry.session.durationMinutes} min
              </p>
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${intensityClass(sessionEntry.session.intensity)}`}>
                {intensityLabel(sessionEntry.session.intensity)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-mist p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Duration</p>
                <p className="mt-2 text-lg font-semibold text-ink">{sessionEntry.session.durationMinutes}m</p>
              </div>
              <div className="rounded-2xl bg-mist p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Load</p>
                <p className="mt-2 text-lg font-semibold text-ink">{sessionEntry.session.loadScore}</p>
              </div>
              <div className="col-span-2 rounded-2xl bg-mist p-4 sm:col-span-1">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Focus</p>
                <p className="mt-2 text-lg font-semibold text-ink">{formatSessionType(sessionEntry.session.sessionType).split(" ")[0]}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-pine/10 bg-pine/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Goal</p>
                <p className="mt-2 text-sm leading-6 text-ink">{coach.goal}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-white p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">How hard</p>
                <p className="mt-2 text-sm leading-6 text-ink">{coach.effort}</p>
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Win if</p>
                <p className="mt-2 text-sm leading-6 text-emerald-950/80">{coach.win}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-pine/10 bg-pine/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">Why this session</p>
              <p className="mt-2 text-sm leading-6 text-ink">{sessionEntry.session.whyChosen}</p>
            </div>

            <div className="rounded-2xl border border-ink/10 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">Pacing cue</p>
              <p className="mt-2 text-sm leading-6 text-ink">{coach.pacing}</p>
            </div>

            <div className="grid gap-3">
              <div className="rounded-2xl bg-mist p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">Warm-up</p>
                <p className="mt-2 text-sm leading-6 text-ink">{sessionEntry.session.warmup}</p>
              </div>
              <div className="rounded-2xl bg-mist p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">What to do</p>
                <p className="mt-2 text-sm leading-6 text-ink">{sessionEntry.session.mainWork}</p>
              </div>
              <div className="rounded-2xl bg-mist p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">Cool-down</p>
                <p className="mt-2 text-sm leading-6 text-ink">{sessionEntry.session.cooldown}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/sessions/${sessionEntry.session.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-pine px-4 py-2.5 text-sm font-semibold text-chalk transition hover:bg-ink"
              >
                <Play className="h-4 w-4" />
                Start session
              </Link>
              {currentPlan ? (
                <Link
                  href={`/plans/${currentPlan.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-ink/10 px-4 py-2.5 text-sm font-semibold text-ink transition hover:border-pine"
                >
                  Full plan
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : null}
            </div>
                </>
              );
            })()}
          </Card>
        ) : (
          <Card>
            <p className="text-sm text-ink/70">Generate a plan to see your next session here.</p>
          </Card>
        )}

        <div className="grid gap-4">
          <Card className="space-y-4">
            <SectionHeading
              eyebrow="Coming Up"
              title="Upcoming events"
              description="Tap into the week so you can jump straight to the schedule or the plan."
            />

            <div className="space-y-3">
              {upcomingItems.length ? (
                upcomingItems.map((item) => {
                  const appearance = upcomingAppearance(item.type);

                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className="group block rounded-2xl border border-ink/10 bg-mist/45 p-4 transition hover:border-pine/30 hover:bg-white"
                    >
                      <div className="flex items-start gap-3">
                        <span className={`rounded-2xl p-2.5 ${appearance.iconClass}`}>
                          <appearance.Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-ink">{item.title}</p>
                              <p className="mt-1 text-xs leading-5 text-ink/60">{item.meta}</p>
                            </div>
                            <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${appearance.badgeClass}`}>
                              {appearance.label}
                            </span>
                          </div>

                          {item.notes ? <p className="mt-3 text-sm leading-5 text-ink/70">{item.notes}</p> : null}

                          <div className="mt-3 flex items-center justify-between text-xs font-medium text-ink/55">
                            <span>{formatDate(item.date)}</span>
                            <span className="inline-flex items-center gap-1 text-pine">
                              Open
                              <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-ink/10 p-4 text-sm text-ink/55">No upcoming items yet.</div>
              )}
            </div>
          </Card>

          <Card className="space-y-4">
            <SectionHeading
              eyebrow="Your Week"
              title={currentPlan ? `Week of ${formatDate(currentPlan.startDate)}` : "No current week yet"}
              description={currentPlan?.summary ?? "Generate a weekly plan to see your session-by-session week here."}
            />

            {focusAreas.length ? (
              <div className="flex flex-wrap gap-2">
                {focusAreas.slice(0, 6).map((focus) => (
                  <span key={focus} className="rounded-full border border-pine/15 bg-pine/5 px-3 py-1.5 text-xs font-semibold text-pine">
                    {focus}
                  </span>
                ))}
              </div>
            ) : null}

            {currentPlan?.mainWeakness ? (
              <div className="rounded-2xl bg-mist p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">Main weakness</p>
                <p className="mt-2 text-sm leading-6 text-ink">{currentPlan.mainWeakness}</p>
              </div>
            ) : null}

            {weekSessions.length ? (
              <div className="space-y-3">
                {weekSessions.map((item) => {
                  const status = completionBadge(item.session.completionStatus);
                  const isPrimarySession = sessionEntry?.session.id === item.session.id;
                  const windowOrDuration = item.windowLabel || (item.session.durationMinutes > 0 ? `${item.session.durationMinutes} min` : "Recovery day");

                  return (
                    <details
                      key={item.session.id}
                      open={isPrimarySession}
                      className="group overflow-hidden rounded-2xl border border-ink/10 bg-mist/45 open:border-pine/20 open:bg-white"
                    >
                      <summary className="list-none cursor-pointer p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">
                              {item.session.dayLabel} • {formatDate(item.date)}
                            </p>
                            <p className="mt-2 text-sm font-semibold text-ink">{item.session.title}</p>
                            <p className="mt-1 text-xs leading-5 text-ink/60">
                              {formatSessionType(item.session.sessionType)} • {windowOrDuration}
                            </p>
                          </div>
                          <div className="flex shrink-0 flex-wrap justify-end gap-2">
                            {isPrimarySession ? (
                              <span className="rounded-full border border-pine/20 bg-pine/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-pine">
                                Next
                              </span>
                            ) : null}
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${status.className}`}>
                              {status.label}
                            </span>
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${intensityClass(item.session.intensity)}`}>
                              {intensityLabel(item.session.intensity)}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                          <div className="rounded-2xl bg-white/80 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pine">Duration</p>
                            <p className="mt-1.5 text-base font-semibold text-ink">{item.session.durationMinutes}m</p>
                          </div>
                          <div className="rounded-2xl bg-white/80 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pine">Load</p>
                            <p className="mt-1.5 text-base font-semibold text-ink">{item.session.loadScore}</p>
                          </div>
                          <div className="rounded-2xl bg-white/80 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pine">Strain</p>
                            <p className="mt-1.5 text-base font-semibold text-ink">{item.strain}</p>
                            <p className="text-[11px] text-ink/55">{strainLabel(item.strain)}</p>
                          </div>
                          <div className="rounded-2xl bg-white/80 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-pine">Try-Hard</p>
                            <p className="mt-1.5 text-base font-semibold text-ink">{item.tryHard}/10</p>
                            <p className="text-[11px] text-ink/55">{tryHardLabel(item.tryHard)}</p>
                          </div>
                        </div>
                      </summary>

                      <div className="grid gap-3 border-t border-ink/8 p-4">
                        <Link
                          href={`/sessions/${item.session.id}`}
                          className="inline-flex items-center gap-2 rounded-full bg-pine px-4 py-2.5 text-sm font-semibold text-chalk transition hover:bg-ink w-fit"
                        >
                          <Play className="h-4 w-4" />
                          Start session
                        </Link>
                        <div className="rounded-2xl bg-mist p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Why this day</p>
                          <p className="mt-2 text-sm leading-6 text-ink">{item.session.whyChosen}</p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-2xl bg-mist p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Warm-up</p>
                            <p className="mt-2 text-sm leading-6 text-ink">{item.session.warmup}</p>
                          </div>
                          <div className="rounded-2xl bg-mist p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Cool-down</p>
                            <p className="mt-2 text-sm leading-6 text-ink">{item.session.cooldown}</p>
                          </div>
                        </div>
                        <div className="rounded-2xl bg-mist p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Main work</p>
                          <p className="mt-2 text-sm leading-6 text-ink">{item.session.mainWork}</p>
                        </div>
                        <div className="rounded-2xl bg-mist p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Recovery note</p>
                          <p className="mt-2 text-sm leading-6 text-ink">{item.session.recoveryNotes}</p>
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-ink/10 p-4 text-sm text-ink/55">
                No sessions are in the current week yet.
              </div>
            )}

            <div className="rounded-2xl bg-mist p-4">
              <div className="flex items-start gap-3">
                <span className="rounded-2xl bg-pine/10 p-2.5 text-pine">
                  <HeartPulse className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">What to watch</p>
                  <p className="mt-2 text-sm leading-6 text-ink">{readinessCue(recovery.band)}</p>
                </div>
              </div>
            </div>

            {compPrepSummary ? (
              <div className="rounded-2xl bg-mist p-4">
                <div className="flex items-start gap-3">
                  <span className="rounded-2xl bg-clay/10 p-2.5 text-clay">
                    <Clock3 className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pine">Comp and recovery notes</p>
                    <p className="mt-2 text-sm leading-6 text-ink">{compPrepSummary}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </Card>
        </div>
      </section>

      {currentPlan ? (
        <LoadChart sessions={currentPlan.sessions.map((session) => ({ dayLabel: session.dayLabel, loadScore: session.loadScore }))} />
      ) : null}
    </div>
  );
}
