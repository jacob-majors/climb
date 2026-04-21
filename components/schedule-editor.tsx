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

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyEvent(day: string): CalendarEntry {
  return { day, title: "", type: "practice", load: "low", time: "", notes: "", source: "manual" };
}

function emptyCompetition(): CompetitionDraft {
  return { name: "", date: "", location: "", discipline: Discipline.MIXED, notes: "" };
}

// ── PartnerTags ───────────────────────────────────────────────────────────────

function PartnerTags({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState("");
  const partners = value.split(",").map((s) => s.trim()).filter(Boolean);

  function add(name: string) {
    const clean = name.trim();
    if (!clean) return;
    const next = [...partners.filter((p) => p.toLowerCase() !== clean.toLowerCase()), clean];
    onChange(next.join(", "));
    setDraft("");
  }

  function remove(name: string) {
    onChange(partners.filter((p) => p !== name).join(", "));
  }

  return (
    <div className="space-y-2">
      {partners.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {partners.map((p) => (
            <span key={p} className="inline-flex items-center gap-1 rounded-full border border-pine/20 bg-pine/8 px-2.5 py-1 text-xs font-semibold text-pine">
              {p}
              <button type="button" onClick={() => remove(p)} className="text-pine/50 hover:text-pine leading-none">×</button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(draft); } }}
          onBlur={() => { if (draft.trim()) add(draft); }}
          placeholder="Add name, press Enter"
          className="flex-1 rounded-xl border border-ink/10 bg-mist/30 px-3 py-2 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/15"
        />
        <button
          type="button"
          onClick={() => add(draft)}
          disabled={!draft.trim()}
          className="rounded-xl border border-pine/20 bg-pine/5 px-3 py-2 text-xs font-semibold text-pine disabled:opacity-40 hover:bg-pine/10 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ── EventCard (edit mode only) ────────────────────────────────────────────────

type EventCardProps = {
  event: CalendarEntry;
  isExpanded: boolean;
  isSelected: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onUpdate: (field: keyof CalendarEntry, value: string) => void;
  onRemove: () => void;
};

function EventCard({ event, isExpanded, isSelected, onToggle, onSelect, onUpdate, onRemove }: EventCardProps) {
  const cfg = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.life;
  const isSynced = Boolean(event.source && event.source !== "manual");

  return (
    <div className={`rounded-2xl border overflow-hidden transition-colors ${isSelected ? "border-pine/40 bg-pine/5" : "border-ink/10"}`}>
      <div className={`flex items-center gap-2 px-3 py-2.5 transition-colors ${isExpanded ? "bg-ink/5" : ""}`}>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          onClick={(e) => e.stopPropagation()}
          className="h-4 w-4 rounded border-ink/20 accent-pine flex-shrink-0 cursor-pointer"
        />
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
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
      </div>

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

          {(event.type === "climbing" || event.type === "practice") && (
            <div>
              <p className="text-xs font-semibold text-ink/40 mb-1.5">Training with</p>
              <PartnerTags value={event.partners ?? ""} onChange={(v) => onUpdate("partners", v)} />
            </div>
          )}

          {(event.type === "climbing" || event.type === "practice") && (
            <div>
              <p className="text-xs font-semibold text-ink/40 mb-1.5">Standard warmup</p>
              <div className="grid grid-cols-2 gap-1">
                {WARMUP_STRETCHES.map((stretch) => (
                  <p key={stretch} className="text-xs text-ink/55">· {stretch}</p>
                ))}
              </div>
            </div>
          )}

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

function getNowInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = Number(byType.year);
  const month = Number(byType.month);
  const day = Number(byType.day);
  const hour = Number(byType.hour) || 0;
  const minute = Number(byType.minute) || 0;

  return {
    today: new Date(year, month - 1, day),
    weekday: byType.weekday,
    nowMinutes: hour * 60 + minute,
  };
}

function parseEventStartMinutes(time?: string | null): number | null {
  if (!time) return null;
  const normalized = time.trim().toLowerCase().replace(/\s+/g, "");
  const startToken = normalized.split(/[-–]/)[0] ?? "";
  if (!startToken) return null;
  const match = /^(\d{1,2})(?::(\d{2}))?(am|pm)?$/.exec(startToken);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  let meridiem = match[3];
  if (!meridiem) {
    if (normalized.includes("pm")) meridiem = "pm";
    else if (normalized.includes("am")) meridiem = "am";
  }
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function normalizeTimeDisplay(time: string | undefined | null): string | null {
  if (!time) return null;
  const parts = time.trim().split(/\s*[-–]\s*/);
  const fmt = (part: string) => {
    const t = part.trim();
    if (/[ap]m/i.test(t)) return t;
    const m = /^(\d{1,2}):(\d{2})$/.exec(t);
    if (!m) return t;
    const h = Number(m[1]), min = Number(m[2]);
    if (h > 23 || min > 59) return t;
    const suffix = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(min).padStart(2, "0")} ${suffix}`;
  };
  return parts.map(fmt).join(" – ");
}

const WARMUP_STRETCHES = [
  "Leg swings forward/back",
  "Leg swings side to side",
  "Open the gate (hip circles)",
  "Arm swings",
  "Arm circles",
  "Wrist circles",
  "Shoulder rolls",
  "Finger flexion/extension",
];

function parseEventEndMinutes(time?: string | null): number | null {
  if (!time) return null;
  const normalized = time.trim().toLowerCase().replace(/\s+/g, "");
  const parts = normalized.split(/[-–]/).filter(Boolean);
  const endToken = parts.length >= 2 ? parts[parts.length - 1] : parts[0];
  if (!endToken) return null;
  const match = /^(\d{1,2})(?::(\d{2}))?(am|pm)?$/.exec(endToken);
  if (!match) return null;
  let hours = Number(match[1]);
  const minutes = Number(match[2] ?? "0");
  const meridiem = match[3];
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function getWeekDates(timeZone = "America/Los_Angeles", weekOffset = 0) {
  const { today } = getNowInTimeZone(timeZone);
  const dow = today.getDay(); // 0 = Sun
  const daysFromMonday = dow === 0 ? 6 : dow - 1;
  const monday = new Date(today);
  monday.setDate(today.getDate() - daysFromMonday + weekOffset * 7);
  return dayNames.map((name, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { name, dateNum: d.getDate(), monthLabel: d.toLocaleDateString("en-US", { month: "long", day: "numeric" }), isoDate };
  });
}

function weekLabel(offset: number) {
  if (offset === 0) return "This week";
  if (offset === 1) return "Next week";
  if (offset === -1) return "Last week";
  return offset > 0 ? `${offset} weeks ahead` : `${Math.abs(offset)} weeks ago`;
}

// Returns true if an event should be shown for a given day in the current week.
// ICS/Google events with a date field are only shown if the date matches this week's date for that day.
// Manual events and events without a date always show.
function eventBelongsToDay(event: CalendarEntry, weekDate: { name: string; isoDate: string }) {
  if (event.day !== weekDate.name) return false;
  if (event.date && (event.source === "ics" || event.source === "google")) {
    return event.date === weekDate.isoDate;
  }
  return true;
}

// ── Main component ────────────────────────────────────────────────────────────

export function ScheduleEditor({
  initialEvents,
  initialCompetitions,
  initialAvailability,
  initialTrainingAvailability,
  passthrough,
}: ScheduleEditorProps) {
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [events, setEvents] = useState<CalendarEntry[]>(initialEvents);
  const [competitions, setCompetitions] = useState<CompetitionDraft[]>(
    initialCompetitions.slice(0, 1),
  );
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [weekOffset, setWeekOffset] = useState(0);
  const { weekday: todayDay, nowMinutes } = getNowInTimeZone("America/Los_Angeles");
  const weekDates = getWeekDates("America/Los_Angeles", weekOffset);

  const dayEvents = dayNames.map((day) => ({
    day,
    events: events
      .filter((e) => e.day === day)
      .sort((a, b) => (parseEventStartMinutes(a.time) ?? 24 * 60) - (parseEventStartMinutes(b.time) ?? 24 * 60)),
  }));

  const thisWeekEvents = weekDates.flatMap((wd) => events.filter((e) => eventBelongsToDay(e, wd)));
  const savedEvents = thisWeekEvents.filter((e) => e.title.trim());
  const savedCompetitions = competitions.slice(0, 1).filter((c) => c.name.trim() && c.date);

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
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setWeekOffset((o) => o - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/10 bg-white text-ink/60 hover:border-pine/40 hover:text-pine transition-colors text-sm"
              title="Previous week"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className={`px-3 h-8 rounded-full border text-xs font-semibold transition-colors ${weekOffset === 0 ? "border-pine/25 bg-pine/8 text-pine" : "border-ink/10 bg-white text-ink/60 hover:border-pine/40 hover:text-pine"}`}
            >
              {weekLabel(weekOffset)}
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((o) => o + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/10 bg-white text-ink/60 hover:border-pine/40 hover:text-pine transition-colors text-sm"
              title="Next week"
            >
              ›
            </button>
          </div>
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
          <div className="rounded-[24px] border border-ink/10 bg-white/80 p-3 sm:p-4">
            <div className="grid gap-3 lg:grid-cols-7">
              {weekDates.map((weekDate) => {
                const { name, dateNum } = weekDate;
                const isToday = name === todayDay;
                const dayEvts = events
                  .filter((e) => eventBelongsToDay(e, weekDate))
                  .filter((e) => {
                    if (weekOffset !== 0 || weekDate.name !== todayDay) return true;
                    const endMin = parseEventEndMinutes(e.time);
                    return endMin === null || nowMinutes < endMin;
                  })
                  .sort((a, b) => (parseEventStartMinutes(a.time) ?? 24 * 60) - (parseEventStartMinutes(b.time) ?? 24 * 60));

                return (
                  <div
                    key={name}
                    className={`rounded-[20px] border border-ink/8 bg-mist/35 p-3 ${isToday ? "ring-2 ring-pine/25" : ""}`}
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-ink">{name}</p>
                        <p className="text-xs text-ink/50">{weekDate.monthLabel}</p>
                      </div>
                      <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                        isToday ? "bg-pine text-chalk" : "bg-white text-ink/70"
                      }`}>
                        {dateNum}
                      </span>
                    </div>

                    {dayEvts.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-ink/10 px-3 py-4 text-center text-xs text-ink/35">Nothing scheduled</p>
                    ) : (
                      <div className="space-y-2">
                        {dayEvts.map((ev, i) => {
                          const cfg = TYPE_CONFIG[ev.type] ?? TYPE_CONFIG.life;
                          return (
                            <div key={i} className={`rounded-xl px-3 py-2.5 ${cfg.viewClass}`}>
                              <div className="flex items-start gap-2">
                                <span className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${cfg.dotClass}`} />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium text-ink">{ev.title || "Untitled"}</p>
                                  {ev.time ? <p className="mt-1 text-xs text-ink/60">{normalizeTimeDisplay(ev.time)}</p> : null}
                                  {ev.partners ? (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      {ev.partners.split(",").map((p) => p.trim()).filter(Boolean).map((p) => (
                                        <span key={p} className="rounded-full border border-pine/20 bg-pine/8 px-2 py-0.5 text-[10px] font-semibold text-pine">{p}</span>
                                      ))}
                                    </div>
                                  ) : null}
                                  {ev.notes ? <p className="mt-1 text-xs text-ink/50">{ev.notes}</p> : null}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
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

      {/* Bulk-select action bar */}
      {selectedIndices.length > 0 && (
        <div className="sticky top-2 z-10 rounded-[20px] border border-pine/25 bg-white/95 p-3 shadow-lg backdrop-blur space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-pine">{selectedIndices.length} selected</p>
            <button type="button" onClick={() => setSelectedIndices([])}
              className="text-xs font-semibold text-ink/45 hover:text-ink transition-colors">
              Clear
            </button>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40 mb-1.5">Set type</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TYPES.map((type) => {
                const tcfg = TYPE_CONFIG[type];
                return (
                  <button key={type} type="button"
                    onClick={() => setEvents((cur) => cur.map((e, i) => selectedIndices.includes(i) ? { ...e, type } : e))}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${tcfg.chipClass}`}>
                    {tcfg.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/40 mb-1.5">Set load</p>
            <div className="flex gap-1.5">
              {ALL_LOADS.map((load) => {
                const lcfg = LOAD_CONFIG[load];
                return (
                  <button key={load} type="button"
                    onClick={() => setEvents((cur) => cur.map((e, i) => selectedIndices.includes(i) ? { ...e, load } : e))}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${lcfg.activeClass}`}>
                    {lcfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Day grid */}
      <div className="space-y-3">
        <div className="grid gap-3 xl:grid-cols-2">
          {dayEvents.map(({ day, events: dayEvts }) => {
            const icsCount = dayEvts.filter((e) => e.source === "ics").length;
            const dayIndices = dayEvts.map((e) => events.indexOf(e));
            const allSelected = dayIndices.length > 0 && dayIndices.every((i) => selectedIndices.includes(i));
            return (
              <div key={day} className="rounded-[20px] border border-ink/10 bg-white/70 p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {dayEvts.length > 0 && (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => {
                          if (allSelected) {
                            setSelectedIndices((cur) => cur.filter((i) => !dayIndices.includes(i)));
                          } else {
                            setSelectedIndices((cur) => [...new Set([...cur, ...dayIndices])]);
                          }
                        }}
                        className="h-4 w-4 rounded border-ink/20 accent-pine flex-shrink-0 cursor-pointer"
                        title={`Select all ${day} events`}
                      />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-ink">{day}</p>
                      {dayEvts.length > 0 && (
                        <p className="text-xs text-ink/45">
                          {dayEvts.length} event{dayEvts.length !== 1 ? "s" : ""}
                          {icsCount > 0 ? ` · ${icsCount} synced` : ""}
                        </p>
                      )}
                    </div>
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
                          isSelected={selectedIndices.includes(idx)}
                          onToggle={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                          onSelect={() => setSelectedIndices((cur) =>
                            cur.includes(idx) ? cur.filter((i) => i !== idx) : [...cur, idx]
                          )}
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
          <button type="button" onClick={() => setCompetitions((c) => (c.length ? c : [emptyCompetition()]))}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-ink/10 bg-white text-ink/60 hover:border-pine/40 hover:text-pine transition-colors text-base font-light leading-none"
            title="Set competition"
            disabled={competitions.length > 0}>
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
          {competitions.slice(0, 1).map((comp, index) => (
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
