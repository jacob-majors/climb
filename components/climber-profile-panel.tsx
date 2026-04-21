"use client";

import { UserProfile } from "@clerk/nextjs";
import { Discipline, ExperienceLevel, RecoveryQuality, StressLevel } from "@prisma/client";
import { Mountain } from "lucide-react";
import { upsertProfileAction } from "@/app/actions";
import { Field, FormGrid, inputClassName, textareaClassName } from "@/components/forms";
import { SubmitButton } from "@/components/ui/submit-button";

const GOOGLE_CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

type ClimberProfilePanelProps = {
  athleteId: string;
  athleteName: string;
  athleteAge: number;
  profile: {
    heightCm?: number | null;
    weightKg?: number | null;
    experienceLevel?: ExperienceLevel | null;
    primaryDiscipline?: Discipline | null;
    flashGrade?: string | null;
    redpointGrade?: string | null;
    onsightGrade?: string | null;
    boulderFlashGrade?: string | null;
    boulderMaxGrade?: string | null;
    competitionCategory?: string | null;
    climbingDaysPerWeek?: number | null;
    trainingDaysPerWeek?: number | null;
    sleepAverage?: number | null;
    recoveryQuality?: RecoveryQuality | null;
    stressLevel?: StressLevel | null;
    equipment?: string | null;
    preferredTrainingFocus?: string | null;
    injuryHistory?: string | null;
    currentPain?: string | null;
    workloadNotes?: string | null;
    otherSports?: string | null;
    athleteNotes?: string | null;
  } | null | undefined;
};

function equipmentString(raw?: string | null) {
  if (!raw) return "";
  try {
    return JSON.parse(raw).join(", ");
  } catch {
    return "";
  }
}

export function ClimberProfilePanel({ athleteId, athleteName, athleteAge, profile }: ClimberProfilePanelProps) {
  return (
    <UserProfile
      routing="hash"
      additionalOAuthScopes={{
        google: [GOOGLE_CALENDAR_READONLY_SCOPE],
      }}
    >
      <UserProfile.Page
        label="Climber"
        url="climber"
        labelIcon={<Mountain className="h-4 w-4" />}
      >
        <div className="space-y-5 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Climb profile</p>
            <p className="mt-1 text-lg font-semibold text-ink">Athlete settings for climb.</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
              Keep climbing grades, recovery baseline, available training days, and athlete notes inside the same profile UI as your account settings.
            </p>
          </div>

          <form action={upsertProfileAction} className="space-y-8">
            <input type="hidden" name="userId" defaultValue={athleteId} />

            <FormGrid>
              <Field label="Name">
                <input name="name" defaultValue={athleteName} className={inputClassName()} required />
              </Field>
              <Field label="Age">
                <input name="age" type="number" min="8" max="99" defaultValue={athleteAge} className={inputClassName()} required />
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

            <SubmitButton label="Save climber profile" pendingLabel="Saving profile..." />
          </form>
        </div>
      </UserProfile.Page>
    </UserProfile>
  );
}
