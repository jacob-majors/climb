"use client";

import { useState } from "react";
import { Discipline } from "@prisma/client";
import { saveScheduleAction } from "@/app/actions";
import { CalendarEntry, CalendarEntryType, CalendarLoad } from "@/lib/calendar";
import { dayNames } from "@/lib/format";
import { TrainingAvailability } from "@/lib/training-availability";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field, inputClassName } from "@/components/forms";

// ── Types ─────────────────────────────────────────────────────────────────────

type CompetitionDraft = {
  id?: string;
  name: string;
  date: string;
  location: string;
  discipline: Discipline;
  notes: string;
};

export type SchedulePassthrough = {
  athleteId: string;
  calendarSourceUrl: string;
  schoolWorkSchedule: string;
  practiceSchedule: string;
  teamPractices: string;
  workNotes: string;
  travelDates: string;
  restDayPreferences: string;
  hardDaysRelativeToPractice: string;
  weeklyAvailabilityNotes: string;
  fatigueLevel: number | string;
  energyLevel: number | string;
  sorenessLevel: number | string;
  sleepScore: number | string;
  recoveryScore: number | string;
  skinQuality: number | string;
  dayStrain: number | string;
  recentClimbingDays: number | string;
  workAtGym: boolean;
  taperPreference: boolean;
  recoveryNeedsAfterComp: boolean;
};

type ScheduleEditorProps = {
  initialEvents: CalendarEntry[];
  initialCompetitions: CompetitionDraft[];
  initialAvailability: Record<string, number>;
  initialTrainingAvailability: TrainingAvailability;
  passthrough: SchedulePassthrough;
};

// ── Type / load styling ───────────────────────────────────────────────────────

type TypeConfig = { label: string; chipClass: string; dotClass: string; viewClass: string };

const TYPE_CONFIG: Record<CalendarEntryType, TypeConfig> = {
  practice:    { label: "Practice",    chipClass: "bg-moss/15 text-pine border-moss/30",            dotClass: "bg-pine",       viewClass: "bg-moss/20 text-pine"          },
  work:        { label: "Work",        chipClass: "bg-sandstone/25 text-clay border-sandstone/40",  dotClass: "bg-clay",       viewClass: "bg-sandstone/30 text-clay"     },
  school:      { label: "School",      chipClass: "bg-blue-50 text-blue-700 border-blue-200",       dotClass: "bg-blue-500",   viewClass: "bg-blue-50 text-blue-700"      },
  competition: { label: "Competition", chipClass: "bg-clay/15 text-clay border-clay/25",            dotClass: "bg-clay",       viewClass: "bg-clay/20 text-clay"          },
  travel:      { label: "Travel",      chipClass: "bg-amber-50 text-amber-700 border-amber-200",    dotClass: "bg-amber-500",  viewClass: "bg-amber-50 text-amber-700"    },
  climbing:    { label: "Climbing",    chipClass: "bg-purple-50 text-purple-700 border-purple-200", dotClass: "bg-purple-500", viewClass: "bg-purple-50 text-purple-700"  },
  recovery:    { label: "Recovery",    chipClass: "bg-teal-50 text-teal-700 border-teal-200",       dotClass: "bg-teal-500",   viewClass: "bg-teal-50 text-teal-700"      },
  life:        { label: "Life",        chipClass: "bg-ink/5 text-ink/60 border-ink/10",             dotClass: "bg-ink/40",     viewClass: "bg-ink/8 text-ink/60"          },
};

const LOAD_CONFIG: Record<CalendarLoad, { label: string; activeClass: string }> = {
  low:      { label: "Low",      activeClass: "bg-moss/15 text-pine border-moss/30"           },
  moderate: { label: "Moderate", activeClass: "bg-sandstone/30 text-clay border-sandstone/40" },
  high:     { label: "High",     activeClass: "bg-clay/15 text-clay border-clay/25"            },
};

const ALL_TYPES = Object.keys(TYPE_CONFIG) as CalendarEntryType[];
const ALL_LOADS = Object.keys(LOAD_CONFIG) as CalendarLoad[];

const TODAY_DAY = new Date().toLocaleDateString("en-US", { weekday: "long" });

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyEvent(day: string): CalendarEntry {
  return { day, title: "", type: "practice", load: "low", time: "", notes: "", source: "manual" };
}

function emptyCompetition(): CompetitionDraft {
  return { name: "", date: "", location: "", discipline: Discipline.MIXED, notes: "" };
}

// ── EventCard (edit mode only) ────────────────────────────────────────────────

type EventCardProps = {
  event: CalendarEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (field: keyof CalendarEntry, value: string) => void;
  onRemove: () => void;
};

function EventCard({ event, isExpanded, onToggle, onUpdate, onRemove }: EventCardProps) {
  const cfg = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.life;
  const isSynced = Boolean(event.source && event.source !== "manual");

  return (
    <div className="rounded-2xl border border-ink/10 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors ${isExpanded ? "bg-ink/5" : "hover:bg-ink/3"}`}
      >
        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.dotClass}`} />
        <span className="text-sm font-medium text-ink flex-1 truncate min-w-0">
          {event.title || <span className="text-ink/35">Untitled event</span>}
        </span>
        {event.time ? <span className="text-xs text-ink/45 flex-shrink-0 hidden sm:block">{event.time}</span> : null}
        <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${cfg.chipClass}`}>{cfg.label}</span>
        {isSynced && <span className="text-xs text-ink/35 flex-shrink-0">synced</span>}
        <span className="text-ink/25 text-xs flex-shrink-0 ml-1">{isExpanded ? "▲" : "▼"}</span>
      </button>

      {isExpanded && (
        <div className="border-t border-ink/8 bg-white px-3 pb-3 pt-3 space-y-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_160px]">
            <input
              value={event.title}
              onChange={(e) => onUpdate("title", e.target.value)}
              placeholder="Event name (e.g. AP Chemistry, Gym shift, Team practice)"
              autoFocus
              className="rounded-xl border border-ink/10 bg-mist/30 px-3 py-2 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/15"
            />
            <input
              value={event.time ?? ""}
              onChange={(e) => onUpdate("time", e.target.value)}
              placeholder="Time (e.g. 8:00am–3pm)"
              className="rounded-xl border border-ink/10 bg-mist/30 px-3 py-2 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/15"
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-ink/40 mb-1.5">What kind of event?</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TYPES.map((type) => {
                const tcfg = TYPE_CONFIG[type];
                const isActive = event.type === type;
                return (
                  <button key={type} type="button" onClick={() => onUpdate("type", type)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${isActive ? tcfg.chipClass : "border-ink/10 text-ink/50 hover:bg-ink/5"}`}>
                    {tcfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-ink/40 mb-1.5">How draining is this?</p>
            <div className="flex gap-1.5">
              {ALL_LOADS.map((load) => {
                const lcfg = LOAD_CONFIG[load];
                const isActive = event.load === load;
                return (
                  <button key={load} type="button" onClick={() => onUpdate("load", load)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${isActive ? lcfg.activeClass : "border-ink/10 text-ink/50 hover:bg-ink/5"}`}>
                    {lcfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          <textarea
            value={event.notes ?? ""}
            onChange={(e) => onUpdate("notes", e.target.value)}
            placeholder="Notes — e.g. coach shift, stressed about this exam, long commute after"
            rows={2}
            className="w-full rounded-xl border border-ink/10 bg-mist/30 px-3 py-2 text-sm outline-none resize-none focus:border-pine focus:ring-2 focus:ring-pine/15"
          />

          <div className="flex items-center justify-between gap-2">
            {isSynced && <p className="text-xs text-ink/35">Synced from calendar — your edits are saved locally.</p>}
            <button type="button" onClick={onRemove}
              className="ml-auto text-xs font-semibold text-clay hover:text-clay/70 transition-colors">
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Week date helpers ─────────────────────────────────────────────────────────

function getWeekDates() {
  const today = new Date();
  const dow = today.getDay(); // 0 = Sun
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMonday);
  return dayNames.map((name, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { name, dateNum: d.getDate(), monthLabel: d.toLocaleDateString("en-US", { month: "long", day: "numeric" }) };
  });
}

const WEEK_DATES = getWeekDates();

// ── Main component ────────────────────────────────────────────────────────────

export function ScheduleEditor({
  initialEvents,
  initialCompetitions,
  initialAvailability,
  initialTrainingAvailability,
  passthrough,
}: ScheduleEditorProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [selectedDay, setSelectedDay] = useState(TODAY_DAY);
  const [events, setEvents] = useState<CalendarEntry[]>(initialEvents);
  const [competitions, setCompetitions] = useState<CompetitionDraft[]>(
    initialCompetitions.length ? initialCompetitions : [],
  );
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const dayEvents = dayNames.map((day) => ({
    day,
    events: events.filter((e) => e.day === day),
  }));

  const savedEvents = events.filter((e) => e.title.trim());
  const savedCompetitions = competitions.filter((c) => c.name.trim() && c.date);

  const timeAvailableByDay = dayNames.reduce<Record<string, number>>((acc, day) => {
    acc[day] = initialAvailability[day] ?? 60;
    return acc;
  }, {});

  // ── Handlers ────────────────────────────────────────────────────────────────

  function updateEvent(index: number, field: keyof CalendarEntry, value: string) {
    setEvents((cur) => cur.map((e, i) => (i === index ? { ...e, [field]: value } : e)));
  }

  function addEvent(day: string) {
    setEvents((cur) => {
      const next = [...cur, emptyEvent(day)];
      setExpandedIndex(next.length - 1);
      return next;
    });
  }

  function removeEvent(index: number) {
    setEvents((cur) => cur.filter((_, i) => i !== index));
    setExpandedIndex((current) => {
      if (current === null) return null;
      if (current === index) return null;
      if (current > index) return current - 1;
      return current;
    });
  }

  function updateCompetition(index: number, field: keyof CompetitionDraft, value: string) {
    setCompetitions((cur) => cur.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  }

  // ── VIEW MODE ────────────────────────────────────────────────────────────────

  if (mode === "view") {
    const selectedEvents = events.filter((e) => e.day === selectedDay);
    const selectedMeta = WEEK_DATES.find((d) => d.name === selectedDay);
    const isSelectedToday = selectedDay === TODAY_DAY;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-ink">Your week</p>
          <button
            type="button"
            onClick={() => setMode("edit")}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/10 bg-white text-ink/60 hover:border-pine/40 hover:text-pine transition-colors text-lg font-light shadow-sm"
            title="Edit schedule"
          >
            +
          </button>
        </div>

        {savedEvents.length === 0 && competitions.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-ink/10 py-10 text-center">
            <p className="text-sm text-ink/40">No schedule saved yet.</p>
            <button type="button" onClick={() => setMode("edit")}
              className="mt-2 text-sm font-semibold text-pine hover:text-pine/70 transition-colors">
              Add your week →
            </button>
          </div>
        ) : (
          <div className="rounded-[24px] border border-ink/10 bg-white/80 overflow-hidden">
            {/* ── Week strip ── */}
            <div className="grid grid-cols-7 border-b border-ink/8">
              {WEEK_DATES.map(({ name, dateNum }) => {
                const isToday = name === TODAY_DAY;
                const isSelected = name === selectedDay;
                const dayEvts = events.filter((e) => e.day === name);

                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedDay(name)}
                    className={`flex flex-col items-center gap-1 py-3 transition-colors ${
                      isSelected && !isToday ? "bg-ink/4" : ""
                    } hover:bg-ink/4`}
                  >
                    <span className="text-[10px] font-semibold text-ink/45 uppercase tracking-wide">
                      {name.slice(0, 1)}
                    </span>
                    <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                      isToday
                        ? "bg-pine text-chalk"
                        : isSelected
                        ? "bg-ink/10 text-ink"
                        : "text-ink/70"
                    }`}>
                      {dateNum}
                    </span>
                    {/* Event dots */}
                    <div className="flex gap-0.5 h-2 items-center justify-center">
                      {dayEvts.slice(0, 3).map((ev, i) => {
                        const cfg = TYPE_CONFIG[ev.type] ?? TYPE_CONFIG.life;
                        return <span key={i} className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`} />;
                      })}
                      {dayEvts.length === 0 && <span className="h-1.5 w-1.5 rounded-full bg-ink/10" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* ── Selected day detail ── */}
            <div className="px-4 py-4">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-sm font-semibold text-ink">
                  {selectedMeta?.monthLabel ?? selectedDay}
                </p>
                {isSelectedToday && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-pine text-chalk font-semibold">Today</span>
                )}
              </div>

              {selectedEvents.length === 0 ? (
                <p className="text-sm text-ink/35 py-2">Nothing scheduled</p>
              ) : (
                <div className="space-y-2">
                  {selectedEvents.map((ev, i) => {
                    const cfg = TYPE_CONFIG[ev.type] ?? TYPE_CONFIG.life;
                    return (
                      <div key={i} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${cfg.viewClass}`}>
                        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${cfg.dotClass}`} />
                        <span className="text-sm font-medium flex-1">{ev.title || "Untitled"}</span>
                        {ev.time && (
                          <span className="text-xs opacity-60 flex-shrink-0">{ev.time}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Competitions */}
        {competitions.length > 0 && (
          <div className="rounded-[20px] border border-ink/10 bg-white/70 p-4 space-y-2">
            <p className="text-sm font-semibold text-ink">Competitions</p>
            <div className="space-y-1.5">
              {competitions.map((comp, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-clay/8 px-3 py-2">
                  <span className="text-sm font-medium text-ink flex-1">{comp.name}</span>
                  {comp.date && <span className="text-xs text-ink/50">{new Date(comp.date + "T00:00:00").toLocaleDateString()}</span>}
                  {comp.location && <span className="text-xs text-ink/40 hidden sm:block">{comp.location}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── EDIT MODE ────────────────────────────────────────────────────────────────

  return (
    <form action={saveScheduleAction} className="space-y-4">
      {/* Passthrough hidden fields */}
      <input type="hidden" name="userId" value={passthrough.athleteId} />
      <input type="hidden" name="calendarSourceUrl" value={passthrough.calendarSourceUrl} />
      <input type="hidden" name="schoolWorkSchedule" value={passthrough.schoolWorkSchedule} />
      <input type="hidden" name="practiceSchedule" value={passthrough.practiceSchedule} />
      <input type="hidden" name="teamPractices" value={passthrough.teamPractices} />
      <input type="hidden" name="workNotes" value={passthrough.workNotes} />
      <input type="hidden" name="travelDates" value={passthrough.travelDates} />
      <input type="hidden" name="restDayPreferences" value={passthrough.restDayPreferences} />
      <input type="hidden" name="hardDaysRelativeToPractice" value={passthrough.hardDaysRelativeToPractice} />
      <input type="hidden" name="weeklyAvailabilityNotes" value={passthrough.weeklyAvailabilityNotes} />

      {/* Serialized schedule data */}
      <input type="hidden" name="weeklyCalendarJson" value={JSON.stringify(savedEvents)} />
      <input type="hidden" name="competitionsJson" value={JSON.stringify(savedCompetitions)} />
      <input type="hidden" name="trainingAvailabilityJson" value={JSON.stringify(initialTrainingAvailability)} />
      {dayNames.map((day) => (
        <input key={day} type="hidden" name={day.toLowerCase()} value={timeAvailableByDay[day]} />
      ))}

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold text-ink">Edit your week</p>
        <button type="button" onClick={() => setMode("view")}
          className="text-xs font-semibold text-ink/50 hover:text-ink transition-colors px-3 py-1.5 rounded-full border border-ink/10 hover:border-ink/25">
          Cancel
        </button>
      </div>

      {/* Day grid */}
      <div className="space-y-3">
        <div className="grid gap-3 xl:grid-cols-2">
          {dayEvents.map(({ day, events: dayEvts }) => {
            const icsCount = dayEvts.filter((e) => e.source === "ics").length;
            return (
              <div key={day} className="rounded-[20px] border border-ink/10 bg-white/70 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-semibold text-ink">{day}</p>
                    {dayEvts.length > 0 && (
                      <p className="text-xs text-ink/45">
                        {dayEvts.length} event{dayEvts.length !== 1 ? "s" : ""}
                        {icsCount > 0 ? ` · ${icsCount} synced` : ""}
                      </p>
                    )}
                  </div>
                  <button type="button" onClick={() => addEvent(day)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-ink/10 bg-white text-ink/60 hover:border-pine/40 hover:text-pine transition-colors text-base font-light leading-none"
                    title={`Add event on ${day}`}>
                    +
                  </button>
                </div>

                <div className="space-y-1.5">
                  {dayEvts.length ? (
                    dayEvts.map((event) => {
                      const idx = events.indexOf(event);
                      return (
                        <EventCard
                          key={idx}
                          event={event}
                          isExpanded={expandedIndex === idx}
                          onToggle={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                          onUpdate={(field, value) => updateEvent(idx, field, value)}
                          onRemove={() => removeEvent(idx)}
                        />
                      );
                    })
                  ) : (
                    <button type="button" onClick={() => addEvent(day)}
                      className="w-full rounded-xl border border-dashed border-ink/10 py-3 text-xs text-ink/35 hover:border-ink/25 hover:text-ink/50 transition-colors">
                      + Add event
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Competitions */}
      <div className="space-y-3 rounded-[20px] border border-ink/10 bg-white/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink">Competitions</p>
          <button type="button" onClick={() => setCompetitions((c) => [...c, emptyCompetition()])}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-ink/10 bg-white text-ink/60 hover:border-pine/40 hover:text-pine transition-colors text-base font-light leading-none"
            title="Add competition">
            +
          </button>
        </div>

        {competitions.length === 0 && (
          <button type="button" onClick={() => setCompetitions([emptyCompetition()])}
            className="w-full rounded-xl border border-dashed border-ink/10 py-3 text-xs text-ink/35 hover:border-ink/25 hover:text-ink/50 transition-colors">
            + Add competition
          </button>
        )}

        <div className="space-y-3">
          {competitions.map((comp, index) => (
            <div key={`${comp.id ?? "new"}-${index}`} className="rounded-2xl border border-ink/10 bg-mist/30 p-3 space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={comp.name} onChange={(e) => updateCompetition(index, "name", e.target.value)}
                  placeholder="Competition name"
                  className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/15" />
                <input type="date" value={comp.date} onChange={(e) => updateCompetition(index, "date", e.target.value)}
                  className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/15" />
                <input value={comp.location} onChange={(e) => updateCompetition(index, "location", e.target.value)}
                  placeholder="Location"
                  className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/15" />
                <select value={comp.discipline} onChange={(e) => updateCompetition(index, "discipline", e.target.value)}
                  className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/15">
                  {Object.values(Discipline).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <textarea value={comp.notes} onChange={(e) => updateCompetition(index, "notes", e.target.value)}
                placeholder="Notes" rows={2}
                className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm outline-none resize-none focus:border-pine focus:ring-2 focus:ring-pine/15" />
              <div className="flex justify-end">
                <button type="button" onClick={() => setCompetitions((c) => c.filter((_, i) => i !== index))}
                  className="text-xs font-semibold text-clay hover:text-clay/70 transition-colors">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recovery snapshot */}
      <details className="group rounded-[24px] border border-ink/10 bg-white/80">
        <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-ink list-none">
          Recovery snapshot
          <span className="text-ink/40 text-xs group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <div className="border-t border-ink/8 px-4 pb-4 pt-3">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Fatigue (1–10)">
              <input name="fatigueLevel" type="number" min="1" max="10" defaultValue={passthrough.fatigueLevel} className={inputClassName()} />
            </Field>
            <Field label="Energy (1–10)">
              <input name="energyLevel" type="number" min="1" max="10" defaultValue={passthrough.energyLevel} className={inputClassName()} />
            </Field>
            <Field label="Soreness (1–10)">
              <input name="sorenessLevel" type="number" min="1" max="10" defaultValue={passthrough.sorenessLevel} className={inputClassName()} />
            </Field>
            <Field label="Sleep score %" hint="WHOOP-style">
              <input name="sleepScore" type="number" min="0" max="100" defaultValue={passthrough.sleepScore} className={inputClassName()} />
            </Field>
            <Field label="Recovery score %" hint="WHOOP-style">
              <input name="recoveryScore" type="number" min="0" max="100" defaultValue={passthrough.recoveryScore} className={inputClassName()} />
            </Field>
            <Field label="Skin quality (1–10)">
              <input name="skinQuality" type="number" min="1" max="10" defaultValue={passthrough.skinQuality} className={inputClassName()} />
            </Field>
            <Field label="Day strain (0–21)">
              <input name="dayStrain" type="number" min="0" max="21" step="0.1" defaultValue={passthrough.dayStrain} className={inputClassName()} />
            </Field>
            <Field label="Climbing days (last 7)">
              <input name="recentClimbingDays" type="number" min="0" max="7" defaultValue={passthrough.recentClimbingDays} className={inputClassName()} />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-3">
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input type="checkbox" name="workAtGym" defaultChecked={passthrough.workAtGym} />
              I work at the climbing gym
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input type="checkbox" name="taperPreference" defaultChecked={passthrough.taperPreference} />
              Taper before competitions
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-ink">
              <input type="checkbox" name="recoveryNeedsAfterComp" defaultChecked={passthrough.recoveryNeedsAfterComp} />
              Recovery days after competitions
            </label>
          </div>
        </div>
      </details>

      <div className="flex gap-3">
        <button type="button" onClick={() => setMode("view")}
          className="rounded-full border border-ink/10 px-5 py-2.5 text-sm font-semibold text-ink/60 hover:border-ink/25 hover:text-ink transition-colors">
          Cancel
        </button>
        <SubmitButton label="Save schedule" pendingLabel="Saving…" />
      </div>
    </form>
  );
}
