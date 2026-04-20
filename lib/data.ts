import { unstable_noStore as noStore } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function getActiveAthlete(userId: string) {
  noStore();
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      routeEntries: {
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          gymRoute: true,
        },
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
}

export async function getSessionsSharedRoutes() {
  noStore();
  return prisma.gymRoute.findMany({
    where: {
      gymName: "Sessions",
    },
    orderBy: [
      { gymZoneId: "asc" },
      { updatedAt: "desc" },
    ],
    include: {
      _count: {
        select: {
          routeEntries: true,
        },
      },
      createdByUser: {
        select: {
          name: true,
        },
      },
    },
  });
}

export async function getPlan(planId: string) {
  noStore();
  return prisma.trainingPlan.findUnique({
    where: { id: planId },
    include: {
      user: {
        include: {
          scheduleConstraint: true,
          competitionEvents: {
            orderBy: { eventDate: "asc" },
          },
        },
      },
      sessions: {
        orderBy: { dayIndex: "asc" },
      },
    },
  });
}
