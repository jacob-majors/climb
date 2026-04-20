import { Discipline, ExperienceLevel, RecoveryQuality, StressLevel } from "@prisma/client";
import { upsertProfileAction } from "@/app/actions";
import Link from "next/link";
import { Field, FormGrid, inputClassName, textareaClassName } from "@/components/forms";
import { SectionHeading } from "@/components/section-heading";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { getActiveAthlete } from "@/lib/data";
import { getOrCreateDbUser } from "@/lib/auth";
import { buildSetupTasks } from "@/lib/setup-tasks";
import { redirect } from "next/navigation";

function equipmentString(raw?: string | null) {
  if (!raw) return "";
  try {
    return JSON.parse(raw).join(", ");
  } catch {
    return "";
  }
}

export default async function ProfilePage() {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");
  const athlete = await getActiveAthlete(userId);
  const profile = athlete?.profile;
  const setupTasks = buildSetupTasks(athlete);
  const requiredTasks = setupTasks.filter((task) => task.required);
  const optionalTasks = setupTasks.filter((task) => !task.required);

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Athlete profile"
        title="Build the athlete foundation"
        description="This page captures who the athlete is, what they climb, how much they can recover from, and what tools they have access to."
      />

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Profile setup</p>
            <p className="mt-1 text-lg font-semibold text-ink">
              {requiredTasks.filter((task) => task.done).length}/{requiredTasks.length} core pieces finished
            </p>
          </div>
          <p className="max-w-md text-sm leading-6 text-ink/60">
            Dashboard setup nudges live here now, so the dashboard can stay focused on training, recovery, and the next session.
          </p>
        </div>

        <div className="space-y-3">
          {requiredTasks.map((task) => (
            <div key={task.key} className="flex items-start justify-between gap-4 rounded-2xl border border-ink/10 bg-white/70 p-4">
              <div>
                <p className="text-sm font-semibold text-ink">{task.label}</p>
                <p className="mt-1 text-sm leading-6 text-ink/60">{task.description}</p>
              </div>
              {task.href ? (
                <Link
                  href={task.href}
                  className="inline-flex shrink-0 rounded-full border border-ink/10 px-3 py-2 text-xs font-semibold text-ink transition hover:border-pine hover:text-pine"
                >
                  {task.actionLabel}
                </Link>
              ) : null}
            </div>
          ))}
          {optionalTasks.map((task) => (
            <div key={task.key} className="flex items-start justify-between gap-4 rounded-2xl bg-mist/50 p-4">
              <div>
                <p className="text-sm font-semibold text-ink">{task.label}</p>
                <p className="mt-1 text-sm leading-6 text-ink/60">{task.description}</p>
              </div>
              {task.href ? (
                <Link
                  href={task.href}
                  className="inline-flex shrink-0 rounded-full border border-ink/10 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-pine hover:text-pine"
                >
                  {task.actionLabel}
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <form action={upsertProfileAction} className="space-y-8">
          <input type="hidden" name="userId" defaultValue={athlete?.id ?? ""} />

          <FormGrid>
            <Field label="Name">
              <input name="name" defaultValue={athlete?.name ?? ""} className={inputClassName()} required />
            </Field>
            <Field label="Age">
              <input name="age" type="number" min="8" max="99" defaultValue={athlete?.age ?? 16} className={inputClassName()} required />
            </Field>
            <Field label="Height (cm)">
              <input name="heightCm" type="number" min="0" defaultValue={profile?.heightCm ?? ""} className={inputClassName()} />
            </Field>
            <Field label="Weight (kg)">
              <input name="weightKg" type="number" min="0" defaultValue={profile?.weightKg ?? ""} className={inputClassName()} />
            </Field>
            <Field label="Experience level">
              <select name="experienceLevel" defaultValue={profile?.experienceLevel ?? ExperienceLevel.INTERMEDIATE} className={inputClassName()}>
                {Object.values(ExperienceLevel).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Primary discipline">
              <select name="primaryDiscipline" defaultValue={profile?.primaryDiscipline ?? Discipline.MIXED} className={inputClassName()}>
                {Object.values(Discipline).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
          </FormGrid>

          <FormGrid>
            <Field label="Flash grade">
              <input name="flashGrade" defaultValue={profile?.flashGrade ?? ""} className={inputClassName()} />
            </Field>
            <Field label="Redpoint grade">
              <input name="redpointGrade" defaultValue={profile?.redpointGrade ?? ""} className={inputClassName()} />
            </Field>
            <Field label="Onsight grade">
              <input name="onsightGrade" defaultValue={profile?.onsightGrade ?? ""} className={inputClassName()} />
            </Field>
            <Field label="Boulder flash grade">
              <input name="boulderFlashGrade" defaultValue={profile?.boulderFlashGrade ?? ""} className={inputClassName()} />
            </Field>
            <Field label="Boulder max grade">
              <input name="boulderMaxGrade" defaultValue={profile?.boulderMaxGrade ?? ""} className={inputClassName()} />
            </Field>
            <Field label="Competition category">
              <input name="competitionCategory" defaultValue={profile?.competitionCategory ?? ""} className={inputClassName()} />
            </Field>
          </FormGrid>

          <FormGrid>
            <Field label="Climbing days available per week">
              <input name="climbingDaysPerWeek" type="number" min="1" max="7" defaultValue={profile?.climbingDaysPerWeek ?? 3} className={inputClassName()} />
            </Field>
            <Field label="Total training days available per week">
              <input name="trainingDaysPerWeek" type="number" min="1" max="7" defaultValue={profile?.trainingDaysPerWeek ?? 4} className={inputClassName()} />
            </Field>
            <Field label="Sleep average">
              <input name="sleepAverage" type="number" min="0" max="12" step="0.1" defaultValue={profile?.sleepAverage ?? 7.5} className={inputClassName()} />
            </Field>
            <Field label="Recovery quality">
              <select name="recoveryQuality" defaultValue={profile?.recoveryQuality ?? RecoveryQuality.MODERATE} className={inputClassName()}>
                {Object.values(RecoveryQuality).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Stress level">
              <select name="stressLevel" defaultValue={profile?.stressLevel ?? StressLevel.MODERATE} className={inputClassName()}>
                {Object.values(StressLevel).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Equipment" hint="Comma-separated. Example: Gym only, Hangboard, Weights">
              <input name="equipment" defaultValue={equipmentString(profile?.equipment)} className={inputClassName()} />
            </Field>
          </FormGrid>

          <FormGrid className="md:grid-cols-1">
            <Field label="Preferred training focus" hint="Example: strength, endurance, competition prep">
              <input name="preferredTrainingFocus" defaultValue={profile?.preferredTrainingFocus ?? ""} className={inputClassName()} required />
            </Field>
            <Field label="Injury history">
              <textarea name="injuryHistory" defaultValue={profile?.injuryHistory ?? ""} className={textareaClassName()} />
            </Field>
            <Field label="Current pain or limitations">
              <textarea name="currentPain" defaultValue={profile?.currentPain ?? ""} className={textareaClassName()} />
            </Field>
            <Field label="School / work load">
              <textarea name="workloadNotes" defaultValue={profile?.workloadNotes ?? ""} className={textareaClassName()} />
            </Field>
            <Field label="Other sports or physical activities">
              <textarea name="otherSports" defaultValue={profile?.otherSports ?? ""} className={textareaClassName()} />
            </Field>
            <Field label="Athlete notes">
              <textarea name="athleteNotes" defaultValue={profile?.athleteNotes ?? ""} className={textareaClassName()} />
            </Field>
          </FormGrid>

          <SubmitButton label="Save athlete profile" pendingLabel="Saving profile..." />
        </form>
      </Card>
    </div>
  );
}
