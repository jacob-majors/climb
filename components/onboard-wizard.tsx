"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Discipline, ExperienceLevel } from "@prisma/client";
import { upsertProfileAction, saveScheduleAction } from "@/app/actions";

const YDS = ["5.7","5.8","5.9","5.10a","5.10b","5.10c","5.10d","5.11a","5.11b","5.11c","5.11d","5.12a","5.12b","5.12c","5.12d","5.13a","5.13b","5.13c","5.13d","5.14a+"];
const V_SCALE = ["V0","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10","V11","V12","V13+"];
const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

type Step = 1 | 2 | 3;

export function OnboardWizard({
  athleteId,
  existingName,
  existingAge,
}: {
  athleteId: string;
  existingName: string;
  existingAge: number | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>(1);

  // Step 1 state
  const [name, setName] = useState(existingName);
  const [age, setAge] = useState(existingAge ? String(existingAge) : "");
  const [discipline, setDiscipline] = useState<Discipline>(Discipline.LEAD);
  const [experience, setExperience] = useState<ExperienceLevel>(ExperienceLevel.INTERMEDIATE);

  // Step 2 state
  const [routeRedpoint, setRouteRedpoint] = useState("5.11a");
  const [routeFlash, setRouteFlash] = useState("5.10c");
  const [boulderMax, setBoulderMax] = useState("V4");
  const [boulderFlash, setBoulderFlash] = useState("V3");

  // Step 3 state
  const [trainingDays, setTrainingDays] = useState<string[]>(["Monday","Wednesday","Friday"]);
  const [climbingDays, setClimbingDays] = useState<string[]>(["Tuesday","Thursday","Saturday"]);

  function toggleDay(day: string, list: string[], setter: (v: string[]) => void) {
    setter(list.includes(day) ? list.filter((d) => d !== day) : [...list, day]);
  }

  function submitStep1() {
    if (!name.trim()) return;
    setStep(2);
  }

  function submitStep2() {
    setStep(3);
  }

  function submitAll() {
    startTransition(async () => {
      // Build profile form data
      const fd = new FormData();
      fd.set("name", name);
      fd.set("age", age || "16");
      fd.set("primaryDiscipline", discipline);
      fd.set("experienceLevel", experience);
      fd.set("flashGrade", routeFlash);
      fd.set("redpointGrade", routeRedpoint);
      fd.set("boulderFlashGrade", boulderFlash);
      fd.set("boulderMaxGrade", boulderMax);
      // Required defaults
      fd.set("climbingDaysPerWeek", String(climbingDays.length || 3));
      fd.set("trainingDaysPerWeek", String(trainingDays.length || 3));
      fd.set("sleepAverage", "7.5");
      fd.set("recoveryQuality", "AVERAGE");
      fd.set("stressLevel", "MODERATE");
      fd.set("equipment", "Harness, Shoes, Chalk bag");
      fd.set("preferredTrainingFocus", "Balanced");

      await upsertProfileAction(fd);

      // Build a minimal schedule constraint so dashboard doesn't redirect back
      const sfd = new FormData();
      sfd.set("athleteId", athleteId);
      // Set availability in minutes per day based on selected training days
      const availability: Record<string, number> = {};
      DAYS.forEach((d) => {
        availability[d] = trainingDays.includes(d) ? 90 : 0;
      });
      sfd.set("monday", String(availability.Monday));
      sfd.set("tuesday", String(availability.Tuesday));
      sfd.set("wednesday", String(availability.Wednesday));
      sfd.set("thursday", String(availability.Thursday));
      sfd.set("friday", String(availability.Friday));
      sfd.set("saturday", String(availability.Saturday));
      sfd.set("sunday", String(availability.Sunday));
      sfd.set("weeklyCalendarJson", JSON.stringify([]));
      sfd.set("trainingAvailabilityJson", JSON.stringify([]));
      sfd.set("competitionsJson", JSON.stringify([]));

      // This action redirects — wrap to catch the thrown redirect
      try { await saveScheduleAction(sfd); } catch {}

      router.push("/dashboard");
    });
  }

  const STEP_LABELS = ["About you", "Your grades", "Your schedule"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-2xl font-bold text-ink">Welcome to climb.</p>
        <p className="mt-1 text-sm text-ink/50">Three quick questions and you're in.</p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
              s < step ? "bg-pine text-chalk" : s === step ? "bg-ink text-chalk" : "bg-ink/10 text-ink/30"
            }`}>
              {s < step ? "✓" : s}
            </div>
            <span className={`text-xs font-medium ${s === step ? "text-ink" : "text-ink/35"}`}>{STEP_LABELS[s - 1]}</span>
            {s < 3 && <span className="text-ink/15 text-xs">→</span>}
          </div>
        ))}
      </div>

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink/55">Your name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First name is fine"
              autoFocus
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/15"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-ink/55">Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="e.g. 17"
              min="10"
              max="80"
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/15"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-ink/55">What do you mostly climb?</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: Discipline.LEAD, label: "Lead / Sport" },
                { value: Discipline.BOULDERING, label: "Bouldering" },
                { value: Discipline.MIXED, label: "Both equally" },
                { value: Discipline.SPEED, label: "Speed" },
              ].map((opt) => (
                <button key={opt.value} type="button" onClick={() => setDiscipline(opt.value)}
                  className={`rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors ${
                    discipline === opt.value
                      ? "border-pine/40 bg-pine/10 text-pine"
                      : "border-ink/10 bg-white text-ink/60 hover:border-ink/25"
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-ink/55">Experience level</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: ExperienceLevel.BEGINNER, label: "Beginner", sub: "< 1 year" },
                { value: ExperienceLevel.INTERMEDIATE, label: "Intermediate", sub: "1–3 years" },
                { value: ExperienceLevel.ADVANCED, label: "Advanced", sub: "3–7 years" },
                { value: ExperienceLevel.ELITE, label: "Elite", sub: "7+ / competing" },
              ].map((opt) => (
                <button key={opt.value} type="button" onClick={() => setExperience(opt.value)}
                  className={`rounded-2xl border px-4 py-3 text-left transition-colors ${
                    experience === opt.value
                      ? "border-pine/40 bg-pine/10"
                      : "border-ink/10 bg-white hover:border-ink/25"
                  }`}>
                  <p className={`text-sm font-semibold ${experience === opt.value ? "text-pine" : "text-ink/70"}`}>{opt.label}</p>
                  <p className="text-xs text-ink/40 mt-0.5">{opt.sub}</p>
                </button>
              ))}
            </div>
          </div>

          <button type="button" onClick={submitStep1} disabled={!name.trim()}
            className="w-full rounded-full bg-pine py-3.5 text-sm font-bold text-chalk transition hover:bg-ink disabled:opacity-40">
            Next →
          </button>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-5">
          <p className="text-xs text-ink/45 leading-5">Best guess is fine — we'll update these automatically as you log climbs.</p>

          {(discipline === Discipline.LEAD || discipline === Discipline.MIXED || discipline === Discipline.SPEED) && (
            <div className="rounded-[20px] border border-ink/10 bg-white/80 p-4 space-y-4">
              <p className="text-sm font-semibold text-ink">Routes</p>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink/50">Hardest redpoint (sent after multiple goes)</label>
                <select value={routeRedpoint} onChange={(e) => setRouteRedpoint(e.target.value)}
                  className="w-full rounded-xl border border-ink/10 bg-mist/30 px-3 py-2.5 text-sm outline-none focus:border-pine">
                  {YDS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink/50">Hardest flash (sent first try)</label>
                <select value={routeFlash} onChange={(e) => setRouteFlash(e.target.value)}
                  className="w-full rounded-xl border border-ink/10 bg-mist/30 px-3 py-2.5 text-sm outline-none focus:border-pine">
                  {YDS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          )}

          {(discipline === Discipline.BOULDERING || discipline === Discipline.MIXED) && (
            <div className="rounded-[20px] border border-ink/10 bg-white/80 p-4 space-y-4">
              <p className="text-sm font-semibold text-ink">Bouldering</p>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink/50">Hardest boulder (sent)</label>
                <select value={boulderMax} onChange={(e) => setBoulderMax(e.target.value)}
                  className="w-full rounded-xl border border-ink/10 bg-mist/30 px-3 py-2.5 text-sm outline-none focus:border-pine">
                  {V_SCALE.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink/50">Hardest flash</label>
                <select value={boulderFlash} onChange={(e) => setBoulderFlash(e.target.value)}
                  className="w-full rounded-xl border border-ink/10 bg-mist/30 px-3 py-2.5 text-sm outline-none focus:border-pine">
                  {V_SCALE.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)}
              className="rounded-full border border-ink/10 px-5 py-3 text-sm font-semibold text-ink/50 hover:text-ink transition-colors">
              ← Back
            </button>
            <button type="button" onClick={submitStep2}
              className="flex-1 rounded-full bg-pine py-3 text-sm font-bold text-chalk transition hover:bg-ink">
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 3 */}
      {step === 3 && (
        <div className="space-y-5">
          <p className="text-xs text-ink/45 leading-5">This shapes your training plan. You can change it any time.</p>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-ink/55">When do you want to train? (gym work, hangboard, etc.)</label>
            <div className="grid grid-cols-4 gap-1.5">
              {DAYS.map((day) => (
                <button key={day} type="button"
                  onClick={() => toggleDay(day, trainingDays, setTrainingDays)}
                  className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${
                    trainingDays.includes(day)
                      ? "border-pine/40 bg-pine/10 text-pine"
                      : "border-ink/10 bg-white text-ink/50 hover:border-ink/25"
                  }`}>
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-ink/55">When do you climb? (at the wall, outside, practice)</label>
            <div className="grid grid-cols-4 gap-1.5">
              {DAYS.map((day) => (
                <button key={day} type="button"
                  onClick={() => toggleDay(day, climbingDays, setClimbingDays)}
                  className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${
                    climbingDays.includes(day)
                      ? "border-purple-300 bg-purple-50 text-purple-700"
                      : "border-ink/10 bg-white text-ink/50 hover:border-ink/25"
                  }`}>
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[16px] border border-pine/15 bg-pine/5 px-4 py-3">
            <p className="text-xs text-ink/60 leading-5">
              <span className="font-semibold text-pine">That's it.</span> We'll generate your first training plan right away. You can always fine-tune your schedule later.
            </p>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(2)}
              className="rounded-full border border-ink/10 px-5 py-3 text-sm font-semibold text-ink/50 hover:text-ink transition-colors">
              ← Back
            </button>
            <button type="button" onClick={submitAll} disabled={isPending}
              className="flex-1 rounded-full bg-pine py-3 text-sm font-bold text-chalk transition hover:bg-ink disabled:opacity-50">
              {isPending ? "Setting up…" : "Build my plan →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
