import { ClimbType, GradeScale } from "@prisma/client";
import { saveRouteEntryAction } from "@/app/actions";
import { Field, FormGrid, inputClassName, textareaClassName } from "@/components/forms";
import { SectionHeading } from "@/components/section-heading";
import { Card } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { StyleTagInput } from "@/components/style-tag-input";
import { getActiveAthlete } from "@/lib/data";
import { getOrCreateDbUser } from "@/lib/auth";
import { redirect } from "next/navigation";

function parseStyleTags(raw: string) {
  try {
    return JSON.parse(raw).join(", ");
  } catch {
    return raw;
  }
}

export default async function RouteAnalysisPage() {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");
  const athlete = await getActiveAthlete(userId);

  if (!athlete) {
    return (
      <Card>
        <p className="text-sm text-ink/70">Create an athlete profile first so route entries can be attached to someone real.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Route analysis"
        title="Log recent climbs with useful detail"
        description="The planner uses these route notes to infer real weaknesses: pump, commitment, movement control, hold-type limitations, and more."
      />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <form action={saveRouteEntryAction} className="space-y-6">
            <input type="hidden" name="userId" value={athlete.id} />

            <FormGrid>
              <Field label="Climb title">
                <input name="title" className={inputClassName()} required />
              </Field>
              <Field label="Grade">
                <input name="grade" className={inputClassName()} required />
              </Field>
              <Field label="Grade scale">
                <select name="gradeScale" defaultValue={GradeScale.YDS} className={inputClassName()}>
                  {Object.values(GradeScale).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Indoor or outdoor">
                <input name="environment" defaultValue="Indoor" className={inputClassName()} required />
              </Field>
              <Field label="Lead or boulder">
                <select name="climbType" defaultValue={ClimbType.ROUTE} className={inputClassName()}>
                  {Object.values(ClimbType).map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Approximate move count">
                <input name="moveCount" type="number" min="0" className={inputClassName()} />
              </Field>
              <Field label="Crux difficulty (1-10)">
                <input name="cruxDifficulty" type="number" min="1" max="10" defaultValue={6} className={inputClassName()} />
              </Field>
              <Field label="Pump level (1-10)">
                <input name="pumpLevel" type="number" min="1" max="10" defaultValue={5} className={inputClassName()} />
              </Field>
              <Field label="Confidence level (1-10)">
                <input name="confidenceLevel" type="number" min="1" max="10" defaultValue={5} className={inputClassName()} />
              </Field>
              <Field label="Style tags" hint="Type to search — press Enter or click to add">
                <StyleTagInput name="styleTags" />
              </Field>
            </FormGrid>

            <FormGrid className="md:grid-cols-1">
              <Field label="Type of movement">
                <input name="movementType" className={inputClassName()} required />
              </Field>
              <Field label="Hold types">
                <input name="holdTypes" className={inputClassName()} required />
              </Field>
              <Field label="Main challenge(s)">
                <textarea name="mainChallenges" className={textareaClassName()} required />
              </Field>
              <Field label="Why they fell or struggled">
                <textarea name="fallReason" className={textareaClassName()} required />
              </Field>
              <Field label="What felt strong">
                <textarea name="feltStrong" className={textareaClassName()} required />
              </Field>
              <Field label="What felt weak">
                <textarea name="feltWeak" className={textareaClassName()} required />
              </Field>
              <Field label="Weakness summary">
                <textarea name="weaknessSummary" className={textareaClassName()} />
              </Field>
              <Field label="Free text description">
                <textarea name="freeText" className={textareaClassName()} />
              </Field>
            </FormGrid>

            <SubmitButton label="Save route analysis" pendingLabel="Saving route..." />
          </form>
        </Card>

        <Card className="space-y-4">
          <SectionHeading
            eyebrow="Recent logs"
            title="Saved route analyses"
            description="These are the latest recent entries the recommendation engine will consider."
          />
          <div className="space-y-4">
            {athlete.routeEntries.length ? (
              athlete.routeEntries.map((entry) => (
                <div key={entry.id} className="rounded-2xl border border-ink/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{entry.title}</p>
                      <p className="text-sm text-ink/55">{entry.grade} • {entry.environment} • {entry.climbType.toLowerCase()}</p>
                    </div>
                    <span className="rounded-full bg-mist px-3 py-1 text-xs font-semibold text-pine">{entry.pumpLevel}/10 pump</span>
                  </div>
                  <p className="mt-3 text-sm text-ink/70">{entry.weaknessSummary || entry.mainChallenges}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-ink/45">{parseStyleTags(entry.styleTags)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-ink/70">No route analyses saved yet.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
