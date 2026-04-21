import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";
import { generateTrainingPlan } from "@/lib/training-engine";

function canOverwritePlan(plan: {
  sessions: Array<{
    completionStatus: string;
    actualDurationMinutes: number | null;
    completionNotes: string | null;
    completedAt: Date | null;
  }>;
}) {
  return plan.sessions.every((session) =>
    session.completionStatus === "PLANNED" &&
    session.actualDurationMinutes === null &&
    session.completionNotes === null &&
    session.completedAt === null,
  );
}

export async function ensureFreshTrainingPlan(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      routeEntries: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      scheduleConstraint: true,
      competitionEvents: {
        orderBy: { eventDate: "asc" },
      },
      trainingPlans: {
        orderBy: { createdAt: "desc" },
        include: {
          sessions: {
            orderBy: { dayIndex: "asc" },
          },
        },
      },
    },
  });

  if (!user?.profile || !user.scheduleConstraint) {
    return null;
  }

  const planDraft = generateTrainingPlan({
    user,
    profile: user.profile,
    schedule: user.scheduleConstraint,
    routes: user.routeEntries,
    competitions: user.competitionEvents,
    priorPlans: user.trainingPlans,
  });

  const existingForWeek = user.trainingPlans.find(
    (plan) =>
      startOfDay(plan.startDate).getTime() === startOfDay(planDraft.startDate).getTime() &&
      startOfDay(plan.endDate).getTime() === startOfDay(planDraft.endDate).getTime(),
  );

  if (existingForWeek) {
    if (!canOverwritePlan(existingForWeek)) {
      return existingForWeek;
    }

    return prisma.$transaction(async (tx) => {
      await tx.trainingSession.deleteMany({
        where: { trainingPlanId: existingForWeek.id },
      });

      return tx.trainingPlan.update({
        where: { id: existingForWeek.id },
        data: {
          title: planDraft.title,
          startDate: planDraft.startDate,
          endDate: planDraft.endDate,
          summary: planDraft.summary,
          explanation: planDraft.explanation,
          keyFocusAreas: planDraft.keyFocusAreas,
          mainWeakness: planDraft.mainWeakness,
          recoveryNotes: planDraft.recoveryNotes,
          compPrepNotes: planDraft.compPrepNotes,
          pushBackoffNotes: planDraft.pushBackoffNotes,
          totalLoadScore: planDraft.totalLoadScore,
          sessions: {
            create: planDraft.sessions,
          },
        },
        include: {
          sessions: {
            orderBy: { dayIndex: "asc" },
          },
        },
      });
    });
  }

  return prisma.trainingPlan.create({
    data: {
      userId,
      title: planDraft.title,
      startDate: planDraft.startDate,
      endDate: planDraft.endDate,
      summary: planDraft.summary,
      explanation: planDraft.explanation,
      keyFocusAreas: planDraft.keyFocusAreas,
      mainWeakness: planDraft.mainWeakness,
      recoveryNotes: planDraft.recoveryNotes,
      compPrepNotes: planDraft.compPrepNotes,
      pushBackoffNotes: planDraft.pushBackoffNotes,
      totalLoadScore: planDraft.totalLoadScore,
      sessions: {
        create: planDraft.sessions,
      },
    },
    include: {
      sessions: {
        orderBy: { dayIndex: "asc" },
      },
    },
  });
}
