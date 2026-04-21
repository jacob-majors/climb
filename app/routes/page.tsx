import { getActiveAthlete, getSessionsSharedRoutes, getRouteHistory } from "@/lib/data";
import { getOrCreateDbUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/section-heading";
import { RouteWizard } from "@/components/route-wizard";
import { RouteEntryList } from "@/components/route-entry-list";
import { GradeChart } from "@/components/grade-chart";

export default async function RouteAnalysisPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");
  const [athlete, sessionsRoutes, routeHistory] = await Promise.all([
    getActiveAthlete(userId),
    getSessionsSharedRoutes(),
    getRouteHistory(userId),
  ]);
  const resolvedSearchParams = (await searchParams) ?? {};
  const sessionPrefill = {
    sourceSessionId: String(resolvedSearchParams.sourceSessionId || ""),
    sourceSessionTitle: String(resolvedSearchParams.sourceSessionTitle || ""),
    sourceSessionType: String(resolvedSearchParams.sourceSessionType || ""),
    sourceDay: String(resolvedSearchParams.sourceDay || ""),
    sourceStart: String(resolvedSearchParams.sourceStart || ""),
    sourceEnd: String(resolvedSearchParams.sourceEnd || ""),
    sourceWindow: String(resolvedSearchParams.sourceWindow || ""),
    sourceCompletedAt: String(resolvedSearchParams.sourceCompletedAt || ""),
  };

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
        description="Tap Sessions zones, reuse shared route details when they already exist, and only go as deep as you want."
      />

      <Card>
        <RouteWizard
          sessionPrefill={sessionPrefill}
          sessionsRoutes={sessionsRoutes.map((route) => ({
            id: route.id,
            gymZoneId: route.gymZoneId,
            gymZoneLabel: route.gymZoneLabel,
            zoneMapX: route.zoneMapX,
            zoneMapY: route.zoneMapY,
            title: route.title,
            grade: route.grade,
            gradeScale: route.gradeScale,
            climbType: route.climbType,
            environment: route.environment,
            wallAngle: route.wallAngle,
            wallHeight: route.wallHeight,
            holdTypes: route.holdTypes,
            movementType: route.movementType,
            styleTags: route.styleTags,
            notes: route.notes,
            routeCount: route._count.routeEntries,
            submittedBy: route.createdByUser?.name ?? null,
          }))}
        />
      </Card>

      {routeHistory.length > 1 && (
        <GradeChart
          entries={routeHistory.map((e) => ({
            grade: e.grade,
            gradeScale: e.gradeScale as "YDS" | "V_SCALE",
            createdAt: e.createdAt.toISOString(),
          }))}
        />
      )}

      {athlete.routeEntries.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-ink/60 px-1">Recent climbs</p>
          <RouteEntryList entries={athlete.routeEntries.map((entry) => ({
            id: entry.id,
            title: entry.title,
            grade: entry.grade,
            gymZoneLabel: entry.gymZoneLabel,
            environment: entry.environment,
            climbType: entry.climbType,
            pumpLevel: entry.pumpLevel,
            cruxDifficulty: entry.cruxDifficulty,
            weaknessSummary: entry.weaknessSummary,
            mainChallenges: entry.mainChallenges,
            styleTags: entry.styleTags,
          }))} />
        </div>
      )}
    </div>
  );
}
