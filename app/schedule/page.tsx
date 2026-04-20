import { refreshCalendarAction, saveScheduleAction } from "@/app/actions";
import { parseWeeklyCalendar } from "@/lib/calendar";
import { CalendarLinkManager } from "@/components/calendar-link-manager";
import { ScheduleEditor } from "@/components/schedule-editor";
import { Field, inputClassName } from "@/components/forms";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { getActiveAthlete } from "@/lib/data";
import { getOrCreateDbUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { toDateInputValue } from "@/lib/format";
import { parseTrainingAvailability } from "@/lib/training-availability";

function availabilityValue(raw: string | null | undefined, day: string, fallback: number) {
  if (!raw) return fallback;
  try { return JSON.parse(raw)[day] ?? fallback; }
  catch { return fallback; }
}

export default async function SchedulePage() {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");
  const athlete = await getActiveAthlete(userId);
  const schedule = athlete?.scheduleConstraint;

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

  const competitions = athlete.competitionEvents.map((c) => ({
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
    <div className="space-y-4">

      {/* ── Calendar sync bar ──────────────────────────────── */}
      <div className="flex flex-col gap-3 rounded-[24px] border border-ink/10 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        {hasCalendar ? (
          <>
            <div>
              <p className="text-sm font-semibold text-ink">Calendar connected</p>
              <p className="text-xs text-ink/55">
                {schedule?.importedCalendarAt
                  ? `Last synced ${new Date(schedule.importedCalendarAt).toLocaleString()}`
                  : "Not yet synced"}
                {" · "}{linkCount} link{linkCount !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="flex gap-2">
              <form action={refreshCalendarAction}>
                <input type="hidden" name="userId" value={athlete.id} />
                <SubmitButton label="Sync now" pendingLabel="Syncing…" />
              </form>
            </div>
          </>
        ) : (
          <p className="text-sm text-ink/60">No calendar connected yet — add an ICS link below to auto-import your schedule.</p>
        )}
      </div>

      {/* ── ICS connect / update ───────────────────────────── */}
      <details className="group rounded-[24px] border border-ink/10 bg-white/80">
        <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink list-none">
          {hasCalendar ? "Update calendar links" : "Connect a calendar"}
          <span className="text-ink/40 text-xs group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="border-t border-ink/8 px-4 pb-4 pt-3">
          <CalendarLinkManager
            userId={athlete.id}
            initialUrls={schedule?.calendarSourceUrl?.split("\n").filter(Boolean) ?? []}
            hasCalendar={hasCalendar}
          />
        </div>
      </details>

      {/* ── Main schedule form ─────────────────────────────── */}
      <form action={saveScheduleAction} className="space-y-4">
        <input type="hidden" name="userId" value={athlete.id} />
        {/* Pass calendar URL through so it isn't wiped on save */}
        <input type="hidden" name="calendarSourceUrl" value={schedule?.calendarSourceUrl ?? ""} />
        {/* Pass fields the engine needs that aren't in ScheduleEditor */}
        <input type="hidden" name="schoolWorkSchedule" value={schedule?.schoolWorkSchedule ?? ""} />
        <input type="hidden" name="practiceSchedule" value={schedule?.practiceSchedule ?? ""} />
        <input type="hidden" name="teamPractices" value={schedule?.teamPractices ?? ""} />
        <input type="hidden" name="workNotes" value={schedule?.workNotes ?? ""} />
        <input type="hidden" name="travelDates" value={schedule?.travelDates ?? ""} />
        <input type="hidden" name="restDayPreferences" value={schedule?.restDayPreferences ?? ""} />
        <input type="hidden" name="hardDaysRelativeToPractice" value={schedule?.hardDaysRelativeToPractice ?? ""} />
        <input type="hidden" name="weeklyAvailabilityNotes" value={schedule?.weeklyAvailabilityNotes ?? ""} />

        {/* Weekly calendar + competitions (the main UI) */}
        <ScheduleEditor
          initialEvents={parseWeeklyCalendar(schedule?.weeklyCalendar)}
          initialCompetitions={competitions}
          initialAvailability={initialAvailability}
          initialTrainingAvailability={parseTrainingAvailability(schedule?.trainingAvailability)}
        />

        {/* ── Recovery snapshot ─────────────────────────────── */}
        <details className="group rounded-[24px] border border-ink/10 bg-white/80">
          <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink list-none">
            Recovery snapshot
            <span className="text-ink/40 text-xs group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="border-t border-ink/8 px-4 pb-4 pt-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Fatigue (1–10)">
                <input name="fatigueLevel" type="number" min="1" max="10" defaultValue={schedule?.fatigueLevel ?? 4} className={inputClassName()} />
              </Field>
              <Field label="Energy (1–10)">
                <input name="energyLevel" type="number" min="1" max="10" defaultValue={schedule?.energyLevel ?? ""} className={inputClassName()} />
              </Field>
              <Field label="Soreness (1–10)">
                <input name="sorenessLevel" type="number" min="1" max="10" defaultValue={schedule?.sorenessLevel ?? ""} className={inputClassName()} />
              </Field>
              <Field label="Sleep score %" hint="WHOOP-style">
                <input name="sleepScore" type="number" min="0" max="100" defaultValue={schedule?.sleepScore ?? ""} className={inputClassName()} />
              </Field>
              <Field label="Recovery score %" hint="WHOOP-style">
                <input name="recoveryScore" type="number" min="0" max="100" defaultValue={schedule?.recoveryScore ?? ""} className={inputClassName()} />
              </Field>
              <Field label="Skin quality (1–10)">
                <input name="skinQuality" type="number" min="1" max="10" defaultValue={schedule?.skinQuality ?? ""} className={inputClassName()} />
              </Field>
              <Field label="Day strain (0–21)">
                <input name="dayStrain" type="number" min="0" max="21" step="0.1" defaultValue={schedule?.dayStrain ?? ""} className={inputClassName()} />
              </Field>
              <Field label="Climbing days (last 7)">
                <input name="recentClimbingDays" type="number" min="0" max="7" defaultValue={schedule?.recentClimbingDays ?? ""} className={inputClassName()} />
              </Field>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input type="checkbox" name="workAtGym" defaultChecked={schedule?.workAtGym ?? false} />
                I work at the climbing gym
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input type="checkbox" name="taperPreference" defaultChecked={schedule?.taperPreference ?? true} />
                Taper before competitions
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input type="checkbox" name="recoveryNeedsAfterComp" defaultChecked={schedule?.recoveryNeedsAfterComp ?? true} />
                Recovery days after competitions
              </label>
            </div>
          </div>
        </details>

        <SubmitButton label="Save schedule" pendingLabel="Saving…" />
      </form>
    </div>
  );
}
