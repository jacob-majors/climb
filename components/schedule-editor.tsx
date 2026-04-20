"use client";

import { useState } from "react";
import { Discipline } from "@prisma/client";
import { CalendarEntry, CalendarEntryType, CalendarLoad } from "@/lib/calendar";
import { dayNames } from "@/lib/format";
import { TrainingAvailability } from "@/lib/training-availability";

type CompetitionDraft = {
  id?: string;
  name: string;
  date: string;
  location: string;
  discipline: Discipline;
  notes: string;
};

type ScheduleEditorProps = {
  initialEvents: CalendarEntry[];
  initialCompetitions: CompetitionDraft[];
  initialAvailability: Record<string, number>;
  initialTrainingAvailability: TrainingAvailability;
};

// ── Type / load styling ───────────────────────────────────────────────────────

type TypeConfig = { label: string; chipClass: string; dotClass: string };

const TYPE_CONFIG: Record<CalendarEntryType, TypeConfig> = {
  practice:    { label: "Practice",    chipClass: "bg-moss/15 text-pine border-moss/30",            dotClass: "bg-pine"       },
  work:        { label: "Work",        chipClass: "bg-sandstone/25 text-clay border-sandstone/40",  dotClass: "bg-clay"       },
  school:      { label: "School",      chipClass: "bg-blue-50 text-blue-700 border-blue-200",       dotClass: "bg-blue-500"   },
  competition: { label: "Competition", chipClass: "bg-clay/15 text-clay border-clay/25",            dotClass: "bg-clay"       },
  travel:      { label: "Travel",      chipClass: "bg-amber-50 text-amber-700 border-amber-200",    dotClass: "bg-amber-500"  },
  climbing:    { label: "Climbing",    chipClass: "bg-purple-50 text-purple-700 border-purple-200", dotClass: "bg-purple-500" },
  recovery:    { label: "Recovery",    chipClass: "bg-teal-50 text-teal-700 border-teal-200",       dotClass: "bg-teal-500"   },
  life:        { label: "Life",        chipClass: "bg-ink/5 text-ink/60 border-ink/10",             dotClass: "bg-ink/40"     },
};

const LOAD_CONFIG: Record<CalendarLoad, { label: string; activeClass: string }> = {
  low:      { label: "Low",      activeClass: "bg-moss/15 text-pine border-moss/30"          },
  moderate: { label: "Moderate", activeClass: "bg-sandstone/30 text-clay border-sandstone/40" },
  high:     { label: "High",     activeClass: "bg-clay/15 text-clay border-clay/25"           },
};

const ALL_TYPES = Object.keys(TYPE_CONFIG) as CalendarEntryType[];
const ALL_LOADS = Object.keys(LOAD_CONFIG) as CalendarLoad[];

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyEvent(day: string): CalendarEntry {
  return { day, title: "", type: "life", load: "low", time: "", notes: "", source: "manual" };
}

function emptyCompetition(): CompetitionDraft {
  return { name: "", date: "", location: "", discipline: Discipline.MIXED, notes: "" };
}

// ── EventCard ─────────────────────────────────────────────────────────────────

type EventCardProps = {
  event: CalendarEntry;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (field: keyof CalendarEntry, value: string) => void;
  onRemove: () => void;
};

function EventCard({ event, isExpanded, onToggle, onUpdate, onRemove }: EventCardProps) {
  const cfg = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.life;

  return (
    <div className="rounded-2xl border border-ink/10 overflow-hidden">
      {/* Collapsed row */}
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
        {event.source === "ics" && <span className="text-xs text-ink/35 flex-shrink-0">synced</span>}
        <span className="text-ink/25 text-xs flex-shrink-0 ml-1">{isExpanded ? "▲" : "▼"}</span>
      </button>

      {/* Expanded edit panel */}
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

          {/* Type buttons */}
          <div>
            <p className="text-xs font-semibold text-ink/40 mb-1.5">What kind of event?</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TYPES.map((type) => {
                const tcfg = TYPE_CONFIG[type];
                const isActive = event.type === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onUpdate("type", type)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      isActive ? tcfg.chipClass : "border-ink/10 text-ink/50 hover:bg-ink/5"
                    }`}
                  >
                    {tcfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Load buttons */}
          <div>
            <p className="text-xs font-semibold text-ink/40 mb-1.5">How draining is this?</p>
            <div className="flex gap-1.5">
              {ALL_LOADS.map((load) => {
                const lcfg = LOAD_CONFIG[load];
                const isActive = event.load === load;
                return (
                  <button
                    key={load}
                    type="button"
                    onClick={() => onUpdate("load", load)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                      isActive ? lcfg.activeClass : "border-ink/10 text-ink/50 hover:bg-ink/5"
                    }`}
                  >
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
            {event.source === "ics" && (
              <p className="text-xs text-ink/35">Synced from calendar — your edits are saved locally.</p>
            )}
            <button
              type="button"
              onClick={onRemove}
              className="ml-auto text-xs font-semibold text-clay hover:text-clay/70 transition-colors"
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ScheduleEditor({
  initialEvents,
  initialCompetitions,
  initialAvailability,
  initialTrainingAvailability,
}: ScheduleEditorProps) {
  const [events, setEvents] = useState<CalendarEntry[]>(initialEvents);
  const [competitions, setCompetitions] = useState<CompetitionDraft[]>(
    initialCompetitions.length ? initialCompetitions : [],
  );
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const dayEvents = dayNames.map((day) => ({
    day,
    events: events.filter((e) => e.day === day),
  }));

  // ── Event handlers ──────────────────────────────────────────────────────────

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

  // ── Serialized hidden fields ────────────────────────────────────────────────

  const savedEvents = events.filter((e) => e.title.trim());
  const savedCompetitions = competitions.filter((c) => c.name.trim() && c.date);

  // Also derive timeAvailableByDay from initialAvailability (pass-through)
  const timeAvailableByDay = dayNames.reduce<Record<string, number>>((acc, day) => {
    acc[day] = initialAvailability[day] ?? 60;
    return acc;
  }, {});

  return (
    <>
      {/* Hidden fields for server action */}
      <input type="hidden" name="weeklyCalendarJson" value={JSON.stringify(savedEvents)} />
      <input type="hidden" name="competitionsJson" value={JSON.stringify(savedCompetitions)} />
      <input type="hidden" name="trainingAvailabilityJson" value={JSON.stringify(initialTrainingAvailability)} />
      {dayNames.map((day) => (
        <input key={day} type="hidden" name={day.toLowerCase()} value={timeAvailableByDay[day]} />
      ))}

      {/* ── Weekly calendar ────────────────────────────────── */}
      <div className="space-y-3">
        {/* Header + legend */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-ink">Your week</p>
            {savedEvents.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1.5">
                {ALL_TYPES.map((type) => {
                  const count = savedEvents.filter((e) => e.type === type).length;
                  if (!count) return null;
                  const cfg = TYPE_CONFIG[type];
                  return (
                    <span key={type} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${cfg.chipClass}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotClass}`} />
                      {cfg.label} {count}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Day grid */}
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
                  <button
                    type="button"
                    onClick={() => addEvent(day)}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-ink/10 bg-white text-ink/60 hover:border-pine/40 hover:text-pine transition-colors text-base font-light leading-none"
                    title={`Add event on ${day}`}
                  >
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
                    <button
                      type="button"
                      onClick={() => addEvent(day)}
                      className="w-full rounded-xl border border-dashed border-ink/10 py-3 text-xs text-ink/35 hover:border-ink/25 hover:text-ink/50 transition-colors"
                    >
                      + Add event
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Competitions ───────────────────────────────────── */}
      <div className="space-y-3 rounded-[20px] border border-ink/10 bg-white/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-ink">Competitions</p>
          <button
            type="button"
            onClick={() => setCompetitions((c) => [...c, emptyCompetition()])}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-ink/10 bg-white text-ink/60 hover:border-pine/40 hover:text-pine transition-colors text-base font-light leading-none"
            title="Add competition"
          >
            +
          </button>
        </div>

        {competitions.length === 0 && (
          <button
            type="button"
            onClick={() => setCompetitions([emptyCompetition()])}
            className="w-full rounded-xl border border-dashed border-ink/10 py-3 text-xs text-ink/35 hover:border-ink/25 hover:text-ink/50 transition-colors"
          >
            + Add competition
          </button>
        )}

        <div className="space-y-3">
          {competitions.map((comp, index) => (
            <div key={`${comp.id ?? "new"}-${index}`} className="rounded-2xl border border-ink/10 bg-mist/30 p-3 space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={comp.name}
                  onChange={(e) => updateCompetition(index, "name", e.target.value)}
                  placeholder="Competition name"
                  className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/15"
                />
                <input
                  type="date"
                  value={comp.date}
                  onChange={(e) => updateCompetition(index, "date", e.target.value)}
                  className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/15"
                />
                <input
                  value={comp.location}
                  onChange={(e) => updateCompetition(index, "location", e.target.value)}
                  placeholder="Location"
                  className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/15"
                />
                <select
                  value={comp.discipline}
                  onChange={(e) => updateCompetition(index, "discipline", e.target.value)}
                  className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/15"
                >
                  {Object.values(Discipline).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <textarea
                value={comp.notes}
                onChange={(e) => updateCompetition(index, "notes", e.target.value)}
                placeholder="Notes"
                rows={2}
                className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm outline-none resize-none focus:border-pine focus:ring-2 focus:ring-pine/15"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setCompetitions((c) => c.filter((_, i) => i !== index))}
                  className="text-xs font-semibold text-clay hover:text-clay/70 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
