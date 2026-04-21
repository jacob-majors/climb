"use server";

import { startOfDay } from "date-fns";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Discipline, ExperienceLevel, GradeScale, ClimbType, RecoveryQuality, StressLevel } from "@prisma/client";
import { CalendarEntry, parseWeeklyCalendar } from "@/lib/calendar";
import { ImportedCalendarEvent, importedCompetitionEvents, importableCalendarEntries, parseIcs } from "@/lib/ics";
import { parseLocalDateInput } from "@/lib/format";
import { fetchGoogleCalendarEvents, getCurrentGoogleAccessToken } from "@/lib/google-calendar";
import { prisma } from "@/lib/prisma";
import { getSessionsZoneLabel, SESSIONS_GYM_NAME } from "@/lib/sessions-map";
import {
  availabilityMinutesByDay,
  deriveAvailabilityFromCalendar,
  parseTrainingAvailability,
  stringifyTrainingAvailability,
} from "@/lib/training-availability";
import { generateTrainingPlan } from "@/lib/training-engine";
import { getOrCreateDbUser } from "@/lib/auth";
import { ensureFreshTrainingPlan } from "@/lib/plan-sync";

function text(formData: FormData, key: string) {
  return String(formData.get(key) || "").trim();
}

function intValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function floatValue(formData: FormData, key: string, fallback = 0) {
  const value = Number(formData.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function stringList(formData: FormData, key: string) {
  return text(formData, key)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function dateValue(formData: FormData, key: string) {
  const value = text(formData, key);
  return value ? new Date(value) : null;
}

function jsonValue<T>(formData: FormData, key: string, fallback: T): T {
  const value = text(formData, key);
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

type CompletionStatus = "PLANNED" | "COMPLETED" | "MODIFIED" | "SKIPPED";
type SyncedCalendarSource = "ics" | "google";

function entriesWithSource(entries: CalendarEntry[], source: SyncedCalendarSource) {
  return entries.map((entry) => ({ ...entry, source }));
}

function mergeSyncedEntries(existingEntries: CalendarEntry[], incomingEntries: CalendarEntry[], source: SyncedCalendarSource) {
  return [...existingEntries.filter((entry) => (entry.source ?? "manual") !== source), ...incomingEntries];
}

async function persistImportedCalendarData({
  userId,
  importedEvents,
  source,
  calendarSourceUrl,
}: {
  userId: string;
  importedEvents: ImportedCalendarEvent[];
  source: SyncedCalendarSource;
  calendarSourceUrl?: string;
}) {
  const now = new Date();
  const upcomingEvents = importedEvents.filter((event) => event.start.getTime() >= startOfDay(now).getTime());
  const calendarEntries = entriesWithSource(importableCalendarEntries(upcomingEvents), source);
  const competitions = importedCompetitionEvents(upcomingEvents);
  const trainingAvailability = deriveAvailabilityFromCalendar(upcomingEvents);
  const availability = availabilityMinutesByDay(trainingAvailability);

  const existingSchedule = await prisma.scheduleConstraint.findUnique({ where: { userId } });
  const existingEntries = parseWeeklyCalendar(existingSchedule?.weeklyCalendar ?? null);
  const mergedEntries = mergeSyncedEntries(existingEntries, calendarEntries, source);

  const baseCreate = {
    userId,
    timeAvailableByDay: JSON.stringify(availability),
    fatigueLevel: existingSchedule?.fatigueLevel ?? 4,
    weeklyCalendar: JSON.stringify(mergedEntries),
    importedCalendarAt: new Date(),
    trainingAvailability: stringifyTrainingAvailability(trainingAvailability),
  };

  const baseUpdate = {
    weeklyCalendar: JSON.stringify(mergedEntries),
    timeAvailableByDay: JSON.stringify(availability),
    importedCalendarAt: new Date(),
    trainingAvailability: stringifyTrainingAvailability(trainingAvailability),
  };

  await prisma.scheduleConstraint.upsert({
    where: { userId },
    create: calendarSourceUrl === undefined ? baseCreate : { ...baseCreate, calendarSourceUrl },
    update: calendarSourceUrl === undefined ? baseUpdate : { ...baseUpdate, calendarSourceUrl },
  });

  for (const competition of competitions) {
    const existing = await prisma.competitionEvent.findFirst({
      where: {
        userId,
        name: competition.name,
        eventDate: competition.eventDate,
      },
    });

    if (!existing) {
      await prisma.competitionEvent.create({
        data: {
          userId,
          name: competition.name,
          eventDate: competition.eventDate,
          location: competition.location,
          discipline: Discipline.MIXED,
          notes: competition.notes,
        },
      });
    }
  }

  await ensureFreshTrainingPlan(userId);
}

export async function upsertProfileAction(formData: FormData) {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");
  const profileData = {
    heightCm: intValue(formData, "heightCm") || null,
    weightKg: intValue(formData, "weightKg") || null,
    experienceLevel: text(formData, "experienceLevel") as ExperienceLevel,
    primaryDiscipline: text(formData, "primaryDiscipline") as Discipline,
    flashGrade: text(formData, "flashGrade") || null,
    redpointGrade: text(formData, "redpointGrade") || null,
    onsightGrade: text(formData, "onsightGrade") || null,
    boulderFlashGrade: text(formData, "boulderFlashGrade") || null,
    boulderMaxGrade: text(formData, "boulderMaxGrade") || null,
    competitionCategory: text(formData, "competitionCategory") || null,
    injuryHistory: text(formData, "injuryHistory") || null,
    currentPain: text(formData, "currentPain") || null,
    equipment: JSON.stringify(stringList(formData, "equipment")),
    climbingDaysPerWeek: intValue(formData, "climbingDaysPerWeek", 3),
    trainingDaysPerWeek: intValue(formData, "trainingDaysPerWeek", 4),
    sleepAverage: floatValue(formData, "sleepAverage", 7.5),
    recoveryQuality: text(formData, "recoveryQuality") as RecoveryQuality,
    stressLevel: text(formData, "stressLevel") as StressLevel,
    workloadNotes: text(formData, "workloadNotes") || null,
    otherSports: text(formData, "otherSports") || null,
    preferredTrainingFocus: text(formData, "preferredTrainingFocus"),
    athleteNotes: text(formData, "athleteNotes") || null,
  };

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: text(formData, "name"),
      age: intValue(formData, "age", 16),
      profile: {
        upsert: {
          create: profileData,
          update: profileData,
        },
      },
    },
  });

  await ensureFreshTrainingPlan(userId);

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/profile");
  revalidatePath("/plans");
  redirect("/dashboard");
}

export async function saveRouteEntryAction(formData: FormData) {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");

  const gymRouteId = text(formData, "gymRouteId") || null;
  const gymName = text(formData, "gymName") || null;
  const gymZoneId = text(formData, "gymZoneId") || null;
  const gymZoneLabel = text(formData, "gymZoneLabel") || getSessionsZoneLabel(gymZoneId);

  const titleInput = text(formData, "title");
  const gradeInput = text(formData, "grade");
  const gradeScale = text(formData, "gradeScale") as GradeScale;
  const climbType = text(formData, "climbType") as ClimbType;
  const environmentInput = text(formData, "environment");
  const wallAngle = text(formData, "wallAngle") || null;
  const wallHeight = text(formData, "wallHeight") || null;
  const holdTypes = text(formData, "holdTypes");
  const movementType = text(formData, "movementType");
  const styleTags = text(formData, "styleTags");

  const existingGymRoute = gymRouteId
    ? await prisma.gymRoute.findUnique({
        where: { id: gymRouteId },
      })
    : null;

  let sharedRouteId = existingGymRoute?.id ?? null;

  if (existingGymRoute) {
    await prisma.gymRoute.update({
      where: { id: existingGymRoute.id },
      data: {
        wallAngle: wallAngle || undefined,
        wallHeight: wallHeight || undefined,
        holdTypes: holdTypes && holdTypes !== "Not specified" ? holdTypes : undefined,
        movementType: movementType && movementType !== "Not specified" ? movementType : undefined,
        styleTags: styleTags && styleTags !== "[]" ? styleTags : undefined,
        notes: text(formData, "mainChallenges") || undefined,
      },
    });
  }

  if (!sharedRouteId && gymName && gymZoneId && titleInput && gradeInput && climbType) {
    const sharedRoute = await prisma.gymRoute.upsert({
      where: {
        gymName_gymZoneId_title_grade_climbType: {
          gymName,
          gymZoneId,
          title: titleInput,
          grade: gradeInput,
          climbType,
        },
      },
      create: {
        gymName,
        gymZoneId,
        gymZoneLabel: gymZoneLabel ?? getSessionsZoneLabel(gymZoneId) ?? gymZoneId,
        title: titleInput,
        grade: gradeInput,
        gradeScale,
        climbType,
        environment: environmentInput || (gymName === SESSIONS_GYM_NAME ? "Indoor" : "Gym"),
        wallAngle,
        wallHeight,
        holdTypes: holdTypes || null,
        movementType: movementType || null,
        styleTags: styleTags || null,
        notes: text(formData, "mainChallenges") || text(formData, "freeText") || null,
        createdById: userId,
      },
      update: {
        gradeScale,
        environment: environmentInput || undefined,
        wallAngle: wallAngle ?? undefined,
        wallHeight: wallHeight ?? undefined,
        holdTypes: holdTypes || undefined,
        movementType: movementType || undefined,
        styleTags: styleTags || undefined,
        notes: text(formData, "mainChallenges") || text(formData, "freeText") || undefined,
      },
    });

    sharedRouteId = sharedRoute.id;
  }

  await prisma.routeEntry.create({
    data: {
      userId,
      gymRouteId: sharedRouteId,
      gymName,
      gymZoneId,
      gymZoneLabel,
      title: titleInput || existingGymRoute?.title || "Unnamed climb",
      grade: gradeInput || existingGymRoute?.grade || "Unknown",
      gradeScale: gradeScale || existingGymRoute?.gradeScale || GradeScale.YDS,
      environment: environmentInput || existingGymRoute?.environment || "Indoor",
      climbType: climbType || existingGymRoute?.climbType || ClimbType.ROUTE,
      styleTags: styleTags || existingGymRoute?.styleTags || JSON.stringify([]),
      moveCount: intValue(formData, "moveCount") || null,
      cruxDifficulty: intValue(formData, "cruxDifficulty", 5),
      movementType: movementType || existingGymRoute?.movementType || "Not specified",
      holdTypes: holdTypes || existingGymRoute?.holdTypes || "Not specified",
      mainChallenges: text(formData, "mainChallenges"),
      fallReason: text(formData, "fallReason"),
      feltStrong: text(formData, "feltStrong"),
      feltWeak: text(formData, "feltWeak"),
      pumpLevel: intValue(formData, "pumpLevel", 5),
      confidenceLevel: intValue(formData, "confidenceLevel", 5),
      freeText: text(formData, "freeText") || null,
      weaknessSummary: text(formData, "weaknessSummary") || null,
      wallAngle: wallAngle || existingGymRoute?.wallAngle || null,
      wallHeight: wallHeight || existingGymRoute?.wallHeight || null,
    },
  });

  await ensureFreshTrainingPlan(userId);

  revalidatePath("/routes");
  revalidatePath("/dashboard");
  revalidatePath("/plans");
  redirect("/routes");
}

export async function saveScheduleAction(formData: FormData) {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");
  const weeklyCalendarJson = jsonValue<CalendarEntry[]>(formData, "weeklyCalendarJson", []);
  const weeklyCalendar = weeklyCalendarJson.length ? weeklyCalendarJson : parseWeeklyCalendar(text(formData, "weeklyCalendar"));
  const trainingAvailability = parseTrainingAvailability(text(formData, "trainingAvailabilityJson"));
  const hasCompetitionPayload = formData.has("competitionsJson");
  const competitionsJson = jsonValue<
    Array<{ id?: string; name: string; date: string; location: string; discipline: Discipline; notes: string }>
  >(formData, "competitionsJson", []);
  const derivedAvailability = availabilityMinutesByDay(trainingAvailability);
  const hasStructuredAvailability = Object.values(derivedAvailability).some((value) => value > 0);
  const availability = hasStructuredAvailability
    ? derivedAvailability
    : {
        Monday: intValue(formData, "monday", 60),
        Tuesday: intValue(formData, "tuesday", 60),
        Wednesday: intValue(formData, "wednesday", 60),
        Thursday: intValue(formData, "thursday", 60),
        Friday: intValue(formData, "friday", 60),
        Saturday: intValue(formData, "saturday", 90),
        Sunday: intValue(formData, "sunday", 60),
      };

  await prisma.scheduleConstraint.upsert({
    where: { userId },
    create: {
      userId,
      schoolWorkSchedule: text(formData, "schoolWorkSchedule") || null,
      practiceSchedule: text(formData, "practiceSchedule") || null,
      teamPractices: text(formData, "teamPractices") || null,
      weeklyCalendar: weeklyCalendar.length ? JSON.stringify(weeklyCalendar) : null,
      calendarSourceUrl: text(formData, "calendarSourceUrl") || null,
      trainingAvailability: stringifyTrainingAvailability(trainingAvailability),
      workAtGym: Boolean(formData.get("workAtGym")),
      workNotes: text(formData, "workNotes") || null,
      travelDates: text(formData, "travelDates") || null,
      restDayPreferences: text(formData, "restDayPreferences") || null,
      timeAvailableByDay: JSON.stringify(availability),
      hardDaysRelativeToPractice: text(formData, "hardDaysRelativeToPractice") || null,
      taperPreference: Boolean(formData.get("taperPreference")),
      recoveryNeedsAfterComp: Boolean(formData.get("recoveryNeedsAfterComp")),
      fatigueLevel: intValue(formData, "fatigueLevel", 4),
      recoveryScore: intValue(formData, "recoveryScore") || null,
      sleepScore: intValue(formData, "sleepScore") || null,
      dayStrain: floatValue(formData, "dayStrain") || null,
      sorenessLevel: intValue(formData, "sorenessLevel") || null,
      skinQuality: intValue(formData, "skinQuality") || null,
      recentClimbingDays: intValue(formData, "recentClimbingDays") || null,
      energyLevel: intValue(formData, "energyLevel") || null,
      weeklyAvailabilityNotes: text(formData, "weeklyAvailabilityNotes") || null,
    },
    update: {
      schoolWorkSchedule: text(formData, "schoolWorkSchedule") || null,
      practiceSchedule: text(formData, "practiceSchedule") || null,
      teamPractices: text(formData, "teamPractices") || null,
      weeklyCalendar: weeklyCalendar.length ? JSON.stringify(weeklyCalendar) : null,
      calendarSourceUrl: text(formData, "calendarSourceUrl") || null,
      trainingAvailability: stringifyTrainingAvailability(trainingAvailability),
      workAtGym: Boolean(formData.get("workAtGym")),
      workNotes: text(formData, "workNotes") || null,
      travelDates: text(formData, "travelDates") || null,
      restDayPreferences: text(formData, "restDayPreferences") || null,
      timeAvailableByDay: JSON.stringify(availability),
      hardDaysRelativeToPractice: text(formData, "hardDaysRelativeToPractice") || null,
      taperPreference: Boolean(formData.get("taperPreference")),
      recoveryNeedsAfterComp: Boolean(formData.get("recoveryNeedsAfterComp")),
      fatigueLevel: intValue(formData, "fatigueLevel", 4),
      recoveryScore: intValue(formData, "recoveryScore") || null,
      sleepScore: intValue(formData, "sleepScore") || null,
      dayStrain: floatValue(formData, "dayStrain") || null,
      sorenessLevel: intValue(formData, "sorenessLevel") || null,
      skinQuality: intValue(formData, "skinQuality") || null,
      recentClimbingDays: intValue(formData, "recentClimbingDays") || null,
      energyLevel: intValue(formData, "energyLevel") || null,
      weeklyAvailabilityNotes: text(formData, "weeklyAvailabilityNotes") || null,
    },
  });

  if (hasCompetitionPayload) {
    const existingIds = competitionsJson.map((competition) => competition.id).filter(Boolean) as string[];
    await prisma.competitionEvent.deleteMany({ where: { userId, ...(existingIds.length ? { id: { notIn: existingIds } } : {}) } });

    for (const competition of competitionsJson) {
      const payload = {
        name: competition.name,
        eventDate: parseLocalDateInput(competition.date) ?? new Date(competition.date),
        location: competition.location || null,
        discipline: competition.discipline,
        notes: competition.notes || null,
      };

      if (competition.id) {
        await prisma.competitionEvent.update({
          where: { id: competition.id },
          data: payload,
        });
      } else {
        await prisma.competitionEvent.create({
          data: {
            userId,
            ...payload,
          },
        });
      }
    }
  }

  await ensureFreshTrainingPlan(userId);

  revalidatePath("/");
  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  revalidatePath("/plans");
  redirect("/schedule");
}

export async function importCalendarAction(formData: FormData) {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");
  const calendarUrls = text(formData, "calendarUrls")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);

  if (!calendarUrls.length) {
    redirect("/schedule");
  }

  const importedEvents = [];

  for (const calendarUrl of calendarUrls) {
    const response = await fetch(calendarUrl, { cache: "no-store" });
    if (!response.ok) {
      redirect("/schedule?error=calendar-import");
    }

    const icsText = await response.text();
    importedEvents.push(...parseIcs(icsText));
  }

  await persistImportedCalendarData({
    userId,
    importedEvents,
    source: "ics",
    calendarSourceUrl: calendarUrls.join("\n"),
  });

  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  redirect("/schedule");
}

export async function refreshCalendarAction(formData: FormData) {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");
  const schedule = await prisma.scheduleConstraint.findUnique({ where: { userId } });

  if (!schedule?.calendarSourceUrl) {
    redirect("/schedule?error=no-calendar-url");
  }

  const urls = schedule.calendarSourceUrl.split("\n").map((u) => u.trim()).filter(Boolean);
  if (!urls.length) redirect("/schedule?error=no-calendar-url");

  const importedEvents = [];
  for (const url of urls) {
    const response = await fetch(url, { cache: "no-store" });
    if (response.ok) {
      importedEvents.push(...parseIcs(await response.text()));
    }
  }

  await persistImportedCalendarData({
    userId,
    importedEvents,
    source: "ics",
  });

  revalidatePath("/schedule");
  revalidatePath("/dashboard");
  redirect("/schedule");
}

export async function syncGoogleCalendarAction() {
  const { userId: clerkId } = await auth();
  const userId = await getOrCreateDbUser();
  if (!clerkId || !userId) redirect("/sign-in");

  const accessToken = await getCurrentGoogleAccessToken();
  if (!accessToken) {
    redirect("/account?intent=google-calendar&error=google-calendar-not-connected");
  }

  try {
    const importedEvents = await fetchGoogleCalendarEvents(accessToken);

    await persistImportedCalendarData({
      userId,
      importedEvents,
      source: "google",
    });

    revalidatePath("/schedule");
    revalidatePath("/dashboard");
    redirect("/schedule?success=google-calendar-synced");
  } catch (error) {
    if (error instanceof Error && error.message.includes("403")) {
      redirect("/account?intent=google-calendar&error=google-calendar-permission");
    }

    redirect("/schedule?error=google-calendar-sync");
  }
}

export async function generatePlanAction(formData: FormData) {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");
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
    redirect("/dashboard?error=complete-profile-and-schedule");
  }

  const planDraft = generateTrainingPlan({
    user,
    profile: user.profile,
    schedule: user.scheduleConstraint,
    routes: user.routeEntries,
    competitions: user.competitionEvents,
    priorPlans: user.trainingPlans,
  });

  const plan = await prisma.trainingPlan.create({
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
  });

  revalidatePath("/dashboard");
  revalidatePath("/plans");
  redirect(`/plans/${plan.id}`);
}

export async function duplicatePlanAction(formData: FormData) {
  const planId = text(formData, "planId");
  const existing = await prisma.trainingPlan.findUnique({
    where: { id: planId },
    include: { sessions: true },
  });

  if (!existing) {
    redirect("/plans");
  }

  const duplicated = await prisma.trainingPlan.create({
    data: {
      userId: existing.userId,
      title: `${existing.title} (copy)`,
      startDate: new Date(),
      endDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
      summary: existing.summary,
      explanation: existing.explanation,
      keyFocusAreas: existing.keyFocusAreas,
      mainWeakness: existing.mainWeakness,
      recoveryNotes: existing.recoveryNotes,
      compPrepNotes: existing.compPrepNotes,
      pushBackoffNotes: existing.pushBackoffNotes,
      totalLoadScore: existing.totalLoadScore,
      sessions: {
        create: existing.sessions.map((session) => ({
          dayIndex: session.dayIndex,
          dayLabel: session.dayLabel,
          sessionType: session.sessionType,
          title: session.title,
          durationMinutes: session.durationMinutes,
          warmup: session.warmup,
          mainWork: session.mainWork,
          cooldown: session.cooldown,
          recoveryNotes: session.recoveryNotes,
          intensity: session.intensity,
          whyChosen: session.whyChosen,
          loadScore: session.loadScore,
        })),
      },
    },
  });

  revalidatePath("/plans");
  redirect(`/plans/${duplicated.id}`);
}

export async function deletePlanAction(formData: FormData) {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");

  const planId = text(formData, "planId");
  if (!planId) redirect("/plans");

  const existing = await prisma.trainingPlan.findUnique({
    where: { id: planId },
    select: { id: true, userId: true },
  });

  if (!existing || existing.userId !== userId) {
    redirect("/plans");
  }

  await prisma.trainingPlan.delete({
    where: { id: planId },
  });

  revalidatePath("/dashboard");
  revalidatePath("/plans");
  revalidatePath(`/plans/${planId}`);
  redirect("/plans");
}

export async function createSamplePlanAction() {
  await generatePlanAction(new FormData());
}

export async function updateSessionCompletionAction(formData: FormData) {
  const sessionId = text(formData, "sessionId");
  const returnTo = text(formData, "returnTo") || "/dashboard";
  const completionStatus = text(formData, "completionStatus") as CompletionStatus;
  const actualDurationRaw = text(formData, "actualDurationMinutes");
  const completionNotes = text(formData, "completionNotes") || null;

  if (!sessionId) {
    redirect(returnTo);
  }

  const session = await prisma.trainingSession.findUnique({
    where: { id: sessionId },
    include: { trainingPlan: true },
  });

  if (!session) {
    redirect(returnTo);
  }

  const parsedDuration = actualDurationRaw ? Number(actualDurationRaw) : undefined;
  const safeDuration = Number.isFinite(parsedDuration) ? Math.max(0, Math.round(parsedDuration as number)) : undefined;

  await prisma.trainingSession.update({
    where: { id: sessionId },
    data: {
      completionStatus,
      actualDurationMinutes:
        completionStatus === "SKIPPED"
          ? null
          : safeDuration ?? session.durationMinutes,
      completionNotes,
      completedAt: completionStatus === "PLANNED" ? null : new Date(),
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/plans");
  revalidatePath(`/plans/${session.trainingPlanId}`);
  redirect(returnTo);
}

export async function updateQuickCheckInAction(formData: FormData) {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");

  const existing = await prisma.scheduleConstraint.findUnique({
    where: { userId },
  });

  if (!existing) {
    redirect("/schedule");
  }

  const maybeInt = (key: string) => {
    const raw = text(formData, key);
    if (!raw) return undefined;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  await prisma.scheduleConstraint.update({
    where: { userId },
    data: {
      fatigueLevel: maybeInt("fatigueLevel") ?? existing.fatigueLevel,
      sorenessLevel: maybeInt("sorenessLevel") ?? existing.sorenessLevel,
      skinQuality: maybeInt("skinQuality") ?? existing.skinQuality,
      recentClimbingDays: maybeInt("recentClimbingDays") ?? existing.recentClimbingDays,
      sleepScore: maybeInt("sleepScore") ?? existing.sleepScore,
      recoveryScore: maybeInt("recoveryScore") ?? existing.recoveryScore,
      dayStrain: maybeInt("dayStrain") ?? existing.dayStrain,
      energyLevel: maybeInt("energyLevel") ?? existing.energyLevel,
    },
  });

  await ensureFreshTrainingPlan(userId);

  revalidatePath("/dashboard");
  revalidatePath("/plans");
  redirect("/dashboard");
}

export async function addCompetitionAction(formData: FormData) {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");
  const dateStr = text(formData, "date");
  if (!dateStr) redirect("/schedule");
  await prisma.competitionEvent.create({
    data: {
      userId,
      name: text(formData, "name") || "Competition",
      eventDate: new Date(dateStr + "T12:00:00"),
      location: text(formData, "location") || null,
      discipline: (text(formData, "discipline") as Discipline) || Discipline.MIXED,
      notes: text(formData, "notes") || null,
    },
  });
  await ensureFreshTrainingPlan(userId);
  revalidatePath("/dashboard");
  revalidatePath("/schedule");
  revalidatePath("/plans");
  redirect("/dashboard");
}

export async function logSessionSurveyAction(formData: FormData) {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");
  const sessionId = text(formData, "sessionId");
  const completionStatus = (text(formData, "completionStatus") || "COMPLETED") as CompletionStatus;
  const actualMinutes = text(formData, "actualDurationMinutes");
  const completionNotes = text(formData, "completionNotes") || null;

  if (sessionId) {
    const parsedDuration = actualMinutes ? Number(actualMinutes) : undefined;
    const safeDuration = Number.isFinite(parsedDuration) ? Math.max(0, Math.round(parsedDuration as number)) : undefined;
    const session = await prisma.trainingSession.findUnique({ where: { id: sessionId } });
    if (session) {
      const completedAt = completionStatus === "PLANNED" ? null : new Date();
      await prisma.trainingSession.update({
        where: { id: sessionId },
        data: {
          completionStatus,
          actualDurationMinutes: completionStatus === "SKIPPED" ? null : safeDuration ?? session.durationMinutes,
          completionNotes,
          completedAt,
        },
      });

      if (completionStatus !== "SKIPPED") {
        revalidatePath("/dashboard");
        revalidatePath("/plans");
        const params = new URLSearchParams({
          sourceSessionId: session.id,
          sourceSessionTitle: session.title,
          sourceSessionType: session.sessionType,
          sourceDay: session.dayLabel,
          sourceStart: session.scheduledStartTime || "",
          sourceEnd: session.scheduledEndTime || "",
          sourceWindow: session.scheduledWindowLabel || "",
          sourceCompletedAt: completedAt?.toISOString() || "",
        });
        redirect(`/routes?${params.toString()}`);
      }
    }
  }

  // Also update recovery check-in
  const existing = await prisma.scheduleConstraint.findUnique({ where: { userId } });
  if (existing) {
    const maybeInt = (key: string) => {
      const raw = text(formData, key);
      if (!raw) return undefined;
      const n = Number(raw);
      return Number.isFinite(n) ? n : undefined;
    };
    await prisma.scheduleConstraint.update({
      where: { userId },
      data: {
        skinQuality: maybeInt("skinQuality") ?? existing.skinQuality,
        sorenessLevel: maybeInt("sorenessLevel") ?? existing.sorenessLevel,
        energyLevel: maybeInt("energyLevel") ?? existing.energyLevel,
      },
    });
  }

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateSessionPlacementAction(input: {
  sessionId: string;
  dayIndex: number;
  dayLabel: string;
  windowLabel?: string | null;
  startTime?: string | null;
  endTime?: string | null;
}) {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");

  const session = await prisma.trainingSession.findUnique({
    where: { id: input.sessionId },
    include: {
      trainingPlan: {
        select: {
          id: true,
          userId: true,
        },
      },
    },
  });

  if (!session || session.trainingPlan.userId !== userId) {
    return { ok: false };
  }

  await prisma.trainingSession.update({
    where: { id: input.sessionId },
    data: {
      dayIndex: input.dayIndex,
      dayLabel: input.dayLabel,
      scheduledWindowLabel: input.windowLabel || null,
      scheduledStartTime: input.startTime || null,
      scheduledEndTime: input.endTime || null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/plans");
  revalidatePath(`/plans/${session.trainingPlan.id}`);
  return { ok: true };
}
