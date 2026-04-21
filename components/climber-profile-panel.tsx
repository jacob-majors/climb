"use client";

import { UserProfile } from "@clerk/nextjs";
import { Discipline, ExperienceLevel, RecoveryQuality, StressLevel } from "@prisma/client";
import { ArrowUpRight, Bug, Lightbulb, Mountain } from "lucide-react";
import { upsertProfileAction } from "@/app/actions";
import { Field, FormGrid, inputClassName, textareaClassName } from "@/components/forms";
import { SubmitButton } from "@/components/ui/submit-button";

const GOOGLE_CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";
const GITHUB_REPO = "https://github.com/jacob-majors/climb";

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

function githubIssueLink(kind: "bug" | "feature") {
  const params = new URLSearchParams({
    title: kind === "bug" ? "[Bug] " : "[Feature] ",
    body:
      kind === "bug"
        ? "What happened?\n\nWhat did you expect to happen?\n\nWhat page were you on?\n\nSteps to reproduce:\n1. \n2. \n3. \n\nPhone / browser:\n"
        : "What would you like to add?\n\nWhy would it help?\n\nWhat page or flow is this for?\n\nAnything specific about how it should work?\n",
  });

  return `${GITHUB_REPO}/issues/new?${params.toString()}`;
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

      <UserProfile.Page
        label="Feedback"
        url="feedback"
        labelIcon={<Bug className="h-4 w-4" />}
      >
        <div className="space-y-5 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">GitHub issues</p>
            <p className="mt-1 text-lg font-semibold text-ink">Report a bug or suggest a feature.</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
              Open a GitHub issue straight from your profile. Bugs and ideas go into the same place we track product work, so nothing gets lost.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <a
              href={githubIssueLink("bug")}
              target="_blank"
              rel="noreferrer"
              className="rounded-[28px] border border-clay/20 bg-clay/5 p-5 transition hover:border-clay/35 hover:bg-clay/10"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-2xl bg-clay/10 p-2.5 text-clay">
                  <Bug className="h-5 w-5" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-clay/70" />
              </div>
              <p className="mt-4 text-base font-semibold text-ink">Report a bug</p>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                Use this when something is broken, confusing, duplicated, or not behaving the way it should.
              </p>
            </a>

            <a
              href={githubIssueLink("feature")}
              target="_blank"
              rel="noreferrer"
              className="rounded-[28px] border border-pine/20 bg-pine/5 p-5 transition hover:border-pine/35 hover:bg-pine/10"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-2xl bg-pine/10 p-2.5 text-pine">
                  <Lightbulb className="h-5 w-5" />
                </span>
                <ArrowUpRight className="h-4 w-4 text-pine/70" />
              </div>
              <p className="mt-4 text-base font-semibold text-ink">Suggest a feature</p>
              <p className="mt-2 text-sm leading-6 text-ink/65">
                Use this for new ideas, workflow improvements, better UI, or anything that would make climb. more useful.
              </p>
            </a>
          </div>

          <div className="rounded-[24px] border border-ink/10 bg-mist/40 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">What to include</p>
            <div className="mt-3 grid gap-2">
              {[
                "What page you were on",
                "What you expected",
                "What actually happened",
                "Steps to reproduce it",
                "Phone, browser, or screenshot details if helpful",
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-white/80 px-3 py-2.5 text-sm text-ink/70">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </UserProfile.Page>
    </UserProfile>
  );
}
