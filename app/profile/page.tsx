import { Discipline, ExperienceLevel, RecoveryQuality, StressLevel } from "@prisma/client";
import { upsertProfileAction } from "@/app/actions";
import { Field, FormGrid, inputClassName, textareaClassName } from "@/components/forms";
import { SectionHeading } from "@/components/section-heading";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { getActiveAthlete } from "@/lib/data";
import { getOrCreateDbUser } from "@/lib/auth";
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

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Athlete profile"
        title="Build the athlete foundation"
        description="This page captures who the athlete is, what they climb, how much they can recover from, and what tools they have access to."
      />

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
