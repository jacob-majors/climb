import { getActiveAthlete } from "@/lib/data";
import { getOrCreateDbUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/section-heading";
import { RouteWizard } from "@/components/route-wizard";

function parseStyleTags(raw: string) {
  try {
    return (JSON.parse(raw) as string[]).join(", ");
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
        <p className="text-sm text-ink/70">Create an athlete profile first.</p>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <SectionHeading
        eyebrow="Route analysis"
        title="Log a climb"
        description="One question at a time. Upload a video and Claude will analyze your technique."
      />

      <Card>
        <RouteWizard />
      </Card>

      {athlete.routeEntries.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-ink/60 px-1">Recent climbs</p>
          <div className="space-y-2">
            {athlete.routeEntries.map((entry) => (
              <div key={entry.id} className="rounded-[20px] border border-ink/10 bg-white/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{entry.title}</p>
                    <p className="text-sm text-ink/55 mt-0.5">
                      {entry.grade} · {entry.environment} · {entry.climbType.toLowerCase()}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <span className="rounded-full bg-mist px-2.5 py-1 text-xs font-semibold text-pine">
                      pump {entry.pumpLevel}
                    </span>
                    <span className="rounded-full bg-mist px-2.5 py-1 text-xs font-semibold text-ink/60">
                      crux {entry.cruxDifficulty}
                    </span>
                  </div>
                </div>
                {(entry.weaknessSummary || entry.mainChallenges) && (
                  <p className="mt-2 text-sm text-ink/65 leading-relaxed">
                    {entry.weaknessSummary || entry.mainChallenges}
                  </p>
                )}
                {entry.styleTags && (
                  <p className="mt-1.5 text-xs text-ink/40">{parseStyleTags(entry.styleTags)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
