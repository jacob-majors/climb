"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { IntensityLevel, SessionType } from "@prisma/client";
import { updateSessionPlacementAction } from "@/app/actions";
import { dayNames, formatSessionType, intensityClass, intensityLabel } from "@/lib/format";
import { parseTrainingAvailability, formatTrainingWindow } from "@/lib/training-availability";
import { getCurrentPlacement, getSuggestedPlacementWindows } from "@/lib/session-placement";

type SessionCard = {
  id: string;
  dayIndex: number;
  dayLabel: string;
  scheduledWindowLabel: string | null;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  title: string;
  durationMinutes: number;
  sessionType: SessionType;
  intensity: IntensityLevel;
  completionStatus: string;
  whyChosen: string;
};

type PlanSchedulerProps = {
  sessions: SessionCard[];
  trainingAvailabilityRaw?: string | null;
  weeklyCalendarRaw?: string | null;
};

type DropWindow = {
  dayIndex: number;
  dayLabel: string;
  label: string;
  start: string;
  end: string;
};

function formatClock(value: string | null | undefined) {
  if (!value) return null;
  const [hoursRaw, minutesRaw] = value.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  const suffix = hours >= 12 ? "PM" : "AM";
  const twelve = hours % 12 || 12;
  return `${twelve}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function formatPlacement(window: { label: string; start: string; end: string } | null) {
  if (!window) return "Place this session into an open window";
  return `${window.label} • ${formatClock(window.start)}-${formatClock(window.end)}`;
}

export function PlanScheduler({
  sessions,
  trainingAvailabilityRaw,
  weeklyCalendarRaw,
}: PlanSchedulerProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const availability = useMemo(
    () => parseTrainingAvailability(trainingAvailabilityRaw),
    [trainingAvailabilityRaw],
  );

  const sessionsByDay = useMemo(() => {
    return dayNames.reduce<Record<string, SessionCard[]>>((acc, day) => {
      acc[day] = sessions
        .filter((session) => session.dayLabel === day)
        .sort((a, b) => a.dayIndex - b.dayIndex || a.title.localeCompare(b.title));
      return acc;
    }, {} as Record<string, SessionCard[]>);
  }, [sessions]);

  function placeSession(sessionId: string, window: DropWindow) {
    setPendingId(sessionId);
    startTransition(async () => {
      await updateSessionPlacementAction({
        sessionId,
        dayIndex: window.dayIndex,
        dayLabel: window.dayLabel,
        windowLabel: window.label,
        startTime: window.start,
        endTime: window.end,
      });
      setDraggedId(null);
      setPendingId(null);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-pine/10 bg-pine/5 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine">Suggested placements</p>
            <h3 className="mt-2 text-xl font-semibold text-ink">Drag sessions into the time windows that fit</h3>
            <p className="mt-2 text-sm leading-6 text-ink/65">
              These suggestions use your saved availability, school/work calendar, and the session length so the plan stays realistic.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3">
          {sessions.map((session) => {
            const topSuggestions = getSuggestedPlacementWindows(session, trainingAvailabilityRaw, weeklyCalendarRaw).slice(0, 3);
            const currentPlacement = getCurrentPlacement(session, trainingAvailabilityRaw);
            return (
              <div
                key={session.id}
                draggable
                onDragStart={() => setDraggedId(session.id)}
                onDragEnd={() => setDraggedId(null)}
                className="rounded-[22px] border border-ink/10 bg-white/90 p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-clay">{session.dayLabel}</p>
                    <p className="mt-1 text-base font-semibold text-ink">{session.title}</p>
                    <p className="mt-1 text-sm text-ink/55">
                      {formatSessionType(session.sessionType)} • {session.durationMinutes} min
                    </p>
                    <p className="mt-2 text-sm text-ink/70">{formatPlacement(currentPlacement)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${intensityClass(session.intensity)}`}>
                      {intensityLabel(session.intensity)}
                    </span>
                    <Link
                      href={`/sessions/${session.id}`}
                      className="inline-flex rounded-full border border-ink/10 px-3 py-1 text-xs font-semibold text-ink/70"
                    >
                      Open session
                    </Link>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {topSuggestions.map((suggestion) => (
                    <button
                      key={`${session.id}-${suggestion.dayLabel}-${suggestion.start}`}
                      type="button"
                      onClick={() =>
                        placeSession(session.id, {
                          dayIndex: suggestion.dayIndex,
                          dayLabel: suggestion.dayLabel,
                          label: suggestion.label,
                          start: suggestion.start,
                          end: suggestion.end,
                        })
                      }
                      className="rounded-full border border-pine/15 bg-pine/10 px-3 py-1.5 text-xs font-semibold text-pine"
                    >
                      {suggestion.dayLabel} • {formatClock(suggestion.start)}-{formatClock(suggestion.end)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine">Weekly calendar</p>
          <h3 className="mt-2 text-xl font-semibold text-ink">Place each session where you actually have time</h3>
        </div>
        <div className="grid gap-4 lg:grid-cols-7">
          {availability.map((day, dayIndex) => (
            <div key={day.day} className="rounded-[24px] border border-ink/10 bg-white/80 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{day.day}</p>
                <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink/35">
                  {sessionsByDay[day.day]?.length ?? 0} planned
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {day.windows.length ? (
                  day.windows.map((window, windowIndex) => {
                    const dropWindow = {
                      dayIndex,
                      dayLabel: day.day,
                      label: window.label?.trim() || formatTrainingWindow(window),
                      start: window.start,
                      end: window.end,
                    };

                    return (
                      <div
                        key={`${day.day}-${window.start}`}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={(event) => {
                          event.preventDefault();
                          const sessionId = draggedId || event.dataTransfer.getData("text/plain");
                          if (sessionId) placeSession(sessionId, dropWindow);
                        }}
                        className={`rounded-[18px] border border-dashed p-3 transition ${
                          draggedId ? "border-pine/35 bg-pine/5" : "border-ink/10 bg-mist/30"
                        }`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">{dropWindow.label}</p>
                        <p className="mt-1 text-xs text-ink/55">
                          {formatClock(dropWindow.start)}-{formatClock(dropWindow.end)}
                        </p>
                        <div className="mt-2 space-y-2">
                          {sessionsByDay[day.day]
                            ?.filter((session) => {
                              if (session.scheduledStartTime) return session.scheduledStartTime === dropWindow.start;
                              return windowIndex === 0 && session.dayLabel === day.day;
                            })
                            .map((session) => (
                              <Link
                                key={session.id}
                                href={`/sessions/${session.id}`}
                                draggable
                                onDragStart={(event) => {
                                  event.dataTransfer.setData("text/plain", session.id);
                                  setDraggedId(session.id);
                                }}
                                onDragEnd={() => setDraggedId(null)}
                                className="w-full rounded-[16px] border border-ink/10 bg-white px-3 py-2 text-left shadow-sm"
                              >
                                <p className="text-sm font-semibold text-ink">{session.title}</p>
                                <p className="mt-1 text-xs text-ink/50">{session.durationMinutes} min</p>
                              </Link>
                            ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const sessionId = draggedId || event.dataTransfer.getData("text/plain");
                      if (sessionId) {
                        placeSession(sessionId, {
                          dayIndex,
                          dayLabel: day.day,
                          label: "Fallback slot",
                          start: "17:00",
                          end: "18:30",
                        });
                      }
                    }}
                    className="rounded-[18px] border border-dashed border-ink/10 bg-mist/30 p-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/40">No saved windows yet</p>
                    <p className="mt-1 text-xs text-ink/50">You can still drop a session here and refine the calendar later.</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {(isPending || pendingId) && (
        <p className="text-sm text-ink/55">Saving your updated session placement…</p>
      )}
    </div>
  );
}
