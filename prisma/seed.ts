import { PrismaClient, Discipline, ExperienceLevel, GradeScale, ClimbType, RecoveryQuality, StressLevel } from "@prisma/client";
import { generateTrainingPlan } from "../lib/training-engine";
import { stringifyTrainingAvailability } from "../lib/training-availability";

const prisma = new PrismaClient();

function localDate(year: number, month: number, day: number) {
  return new Date(year, month - 1, day, 12, 0, 0, 0);
}

async function main() {
  await prisma.trainingSession.deleteMany();
  await prisma.trainingPlan.deleteMany();
  await prisma.competitionEvent.deleteMany();
  await prisma.routeEntry.deleteMany();
  await prisma.scheduleConstraint.deleteMany();
  await prisma.climbingProfile.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      name: "Jacob",
      age: 16,
      profile: {
        create: {
          experienceLevel: ExperienceLevel.ADVANCED,
          primaryDiscipline: Discipline.LEAD,
          flashGrade: "5.11d",
          redpointGrade: "5.12b",
          onsightGrade: "5.11a",
          boulderFlashGrade: "V4",
          boulderMaxGrade: "V6",
          competitionCategory: "Lead divisionals",
          injuryHistory: "Some finger tenderness after high-volume weeks, otherwise healthy.",
          currentPain: "No active injury, but recovery is better when hard finger loading stays spaced out.",
          equipment: JSON.stringify(["Gym only", "Hangboard", "Weights", "Pull-up bar", "Home wall"]),
          climbingDaysPerWeek: 4,
          trainingDaysPerWeek: 5,
          sleepAverage: 7.4,
          recoveryQuality: RecoveryQuality.MODERATE,
          stressLevel: StressLevel.MODERATE,
          workloadNotes: "Work and life load vary week to week, so the plan should stay useful even when time is uneven.",
          otherSports: "Occasional conditioning and easy cardio.",
          preferredTrainingFocus: "Lead endurance, power endurance, technique, competition prep",
          athleteNotes: "Primary focus is peaking for upcoming lead divisionals in Salt Lake City.",
        },
      },
      scheduleConstraint: {
        create: {
          schoolWorkSchedule: "Climbing gym shifts during the week with extra fatigue from being on feet and around climbing all day.",
          practiceSchedule: "Independent climbing sessions Tuesday, Thursday, and Saturday.",
          teamPractices: "Tue power / bouldering focus, Thu lead intervals, Sat longer mixed session",
          weeklyCalendar: JSON.stringify([
            { day: "Monday", title: "Gym shift", type: "work", load: "moderate", time: "2-8pm", notes: "On feet and around climbing all evening" },
            { day: "Tuesday", title: "Power bouldering practice", type: "practice", load: "high", time: "6-8pm", notes: "Limit moves and board climbing" },
            { day: "Wednesday", title: "Gym shift", type: "work", load: "moderate", time: "3-9pm", notes: "Energy usually lower by the end" },
            { day: "Thursday", title: "Lead intervals practice", type: "practice", load: "high", time: "6-8pm", notes: "Sustained routes and power endurance" },
            { day: "Saturday", title: "Long mixed climbing session", type: "climbing", load: "moderate", time: "11am-2pm", notes: "Projecting plus volume" }
          ]),
          calendarSourceUrl: ["https://calendar.example.com/jacob-school.ics", "https://calendar.example.com/jacob-work.ics"].join("\n"),
          trainingAvailability: stringifyTrainingAvailability([
            { day: "Monday", windows: [{ label: "Evening", start: "20:15", end: "21:15" }] },
            { day: "Tuesday", windows: [{ label: "Practice", start: "18:00", end: "20:00" }] },
            { day: "Wednesday", windows: [{ label: "Morning", start: "07:00", end: "08:00" }] },
            { day: "Thursday", windows: [{ label: "Practice", start: "18:00", end: "20:00" }] },
            { day: "Friday", windows: [] },
            { day: "Saturday", windows: [{ label: "Late morning", start: "10:30", end: "13:00" }] },
            { day: "Sunday", windows: [{ label: "Afternoon", start: "14:00", end: "15:15" }] },
          ]),
          workAtGym: true,
          workNotes: "Gym work matters because it keeps you on your feet, around climbing temptation, and sometimes adds demo / coaching fatigue before your own session.",
          travelDates: "None this month",
          restDayPreferences: "Friday full rest preferred",
          timeAvailableByDay: JSON.stringify({
            Monday: 60,
            Tuesday: 120,
            Wednesday: 60,
            Thursday: 120,
            Friday: 30,
            Saturday: 150,
            Sunday: 75
          }),
          hardDaysRelativeToPractice: "Harder sessions work best when they are short and clearly separated from fatigue-heavy days.",
          taperPreference: true,
          recoveryNeedsAfterComp: true,
          fatigueLevel: 4,
          recoveryScore: 71,
          sleepScore: 84,
          dayStrain: 11.8,
          sorenessLevel: 3,
          skinQuality: 7,
          recentClimbingDays: 3,
          energyLevel: 7,
          weeklyAvailabilityNotes: "Can handle one shorter Sunday session if Saturday is not a full-gas day.",
        },
      },
      competitionEvents: {
        create: [
          {
            name: "Lead Divisionals",
            eventDate: localDate(2026, 5, 2),
            location: "Momentum Millcreek, Salt Lake City",
            discipline: Discipline.LEAD,
            notes: "Competition runs May 2-3, 2026. Main target event right now.",
          },
        ],
      },
      routeEntries: {
        create: [
          {
            title: "Steep endurance project",
            grade: "5.12a",
            gradeScale: GradeScale.YDS,
            environment: "Indoor",
            climbType: ClimbType.ROUTE,
            styleTags: JSON.stringify(["Overhang", "Endurance", "Crimpy", "Technical"]),
            moveCount: 30,
            cruxDifficulty: 8,
            movementType: "Long reaches off small feet with fast clipping decisions",
            holdTypes: "Small edges, sidepulls, pinches",
            mainChallenges: "Pump built too quickly in the second half and body position got sloppier.",
            fallReason: "Lost pacing and overgripped once the route got sustained.",
            feltStrong: "Opening moves and body tension felt solid.",
            feltWeak: "Shake efficiency and composure once forearms loaded up.",
            pumpLevel: 8,
            confidenceLevel: 6,
            freeText: "The route felt in range, but the last third turned into survival climbing instead of controlled movement.",
            weaknessSummary: "Power endurance and efficiency on pumped terrain.",
          },
          {
            title: "Tension board compression problem",
            grade: "V5",
            gradeScale: GradeScale.V_SCALE,
            environment: "Indoor",
            climbType: ClimbType.BOULDER,
            styleTags: JSON.stringify(["Powerful", "Pinchy", "Overhang"]),
            moveCount: 8,
            cruxDifficulty: 7,
            movementType: "Compression move into a toe hook and quick bump",
            holdTypes: "Pinches, slopers",
            mainChallenges: "Exploding through the move with full commitment.",
            fallReason: "Hesitated at the moment of commitment and came off the catch.",
            feltStrong: "General body tension and pulling strength.",
            feltWeak: "Commitment and snap on the hardest move.",
            pumpLevel: 3,
            confidenceLevel: 5,
            freeText: "The move feels doable, but only after enough tries to remove the hesitation.",
            weaknessSummary: "Explosive commitment under pressure.",
          },
        ],
      },
    },
  });

  const athlete = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    include: {
      profile: true,
      routeEntries: {
        orderBy: { createdAt: "desc" },
      },
      scheduleConstraint: true,
      competitionEvents: {
        orderBy: { eventDate: "asc" },
      },
      trainingPlans: {
        include: { sessions: true },
      },
    },
  });

  if (athlete.profile && athlete.scheduleConstraint) {
    const draft = generateTrainingPlan({
      user: athlete,
      profile: athlete.profile,
      schedule: athlete.scheduleConstraint,
      routes: athlete.routeEntries,
      competitions: athlete.competitionEvents,
      priorPlans: athlete.trainingPlans,
    });

    await prisma.trainingPlan.create({
      data: {
        userId: athlete.id,
        title: draft.title,
        startDate: draft.startDate,
        endDate: draft.endDate,
        summary: draft.summary,
        explanation: draft.explanation,
        keyFocusAreas: draft.keyFocusAreas,
        mainWeakness: draft.mainWeakness,
        recoveryNotes: draft.recoveryNotes,
        compPrepNotes: draft.compPrepNotes,
        pushBackoffNotes: draft.pushBackoffNotes,
        totalLoadScore: draft.totalLoadScore,
        sessions: {
          create: draft.sessions,
        },
      },
    });
  }

  console.log(`Seeded athlete ${user.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
