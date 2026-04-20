PRAGMA foreign_keys=OFF;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ClimbingProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "heightCm" INTEGER,
    "weightKg" INTEGER,
    "experienceLevel" TEXT NOT NULL,
    "primaryDiscipline" TEXT NOT NULL,
    "flashGrade" TEXT,
    "redpointGrade" TEXT,
    "onsightGrade" TEXT,
    "boulderFlashGrade" TEXT,
    "boulderMaxGrade" TEXT,
    "competitionCategory" TEXT,
    "injuryHistory" TEXT,
    "currentPain" TEXT,
    "equipment" TEXT NOT NULL,
    "climbingDaysPerWeek" INTEGER NOT NULL,
    "trainingDaysPerWeek" INTEGER NOT NULL,
    "sleepAverage" REAL NOT NULL,
    "recoveryQuality" TEXT NOT NULL,
    "stressLevel" TEXT NOT NULL,
    "workloadNotes" TEXT,
    "otherSports" TEXT,
    "preferredTrainingFocus" TEXT NOT NULL,
    "athleteNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ClimbingProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RouteEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "gradeScale" TEXT NOT NULL,
    "environment" TEXT NOT NULL,
    "climbType" TEXT NOT NULL,
    "styleTags" TEXT NOT NULL,
    "moveCount" INTEGER,
    "cruxDifficulty" INTEGER NOT NULL,
    "movementType" TEXT NOT NULL,
    "holdTypes" TEXT NOT NULL,
    "mainChallenges" TEXT NOT NULL,
    "fallReason" TEXT NOT NULL,
    "feltStrong" TEXT NOT NULL,
    "feltWeak" TEXT NOT NULL,
    "pumpLevel" INTEGER NOT NULL,
    "confidenceLevel" INTEGER NOT NULL,
    "freeText" TEXT,
    "weaknessSummary" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RouteEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ScheduleConstraint" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "schoolWorkSchedule" TEXT,
    "practiceSchedule" TEXT,
    "teamPractices" TEXT,
    "weeklyCalendar" TEXT,
    "calendarSourceUrl" TEXT,
    "importedCalendarAt" DATETIME,
    "trainingAvailability" TEXT,
    "workAtGym" BOOLEAN NOT NULL DEFAULT false,
    "workNotes" TEXT,
    "travelDates" TEXT,
    "restDayPreferences" TEXT,
    "timeAvailableByDay" TEXT NOT NULL,
    "hardDaysRelativeToPractice" TEXT,
    "taperPreference" BOOLEAN NOT NULL DEFAULT true,
    "recoveryNeedsAfterComp" BOOLEAN NOT NULL DEFAULT true,
    "fatigueLevel" INTEGER NOT NULL,
    "recoveryScore" INTEGER,
    "sleepScore" INTEGER,
    "dayStrain" REAL,
    "sorenessLevel" INTEGER,
    "skinQuality" INTEGER,
    "recentClimbingDays" INTEGER,
    "energyLevel" INTEGER,
    "weeklyAvailabilityNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScheduleConstraint_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CompetitionEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventDate" DATETIME NOT NULL,
    "location" TEXT,
    "discipline" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CompetitionEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingPlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "summary" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "keyFocusAreas" TEXT NOT NULL,
    "mainWeakness" TEXT NOT NULL,
    "recoveryNotes" TEXT NOT NULL,
    "compPrepNotes" TEXT NOT NULL,
    "pushBackoffNotes" TEXT NOT NULL,
    "totalLoadScore" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrainingPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "trainingPlanId" TEXT NOT NULL,
    "dayIndex" INTEGER NOT NULL,
    "dayLabel" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "warmup" TEXT NOT NULL,
    "mainWork" TEXT NOT NULL,
    "cooldown" TEXT NOT NULL,
    "recoveryNotes" TEXT NOT NULL,
    "intensity" TEXT NOT NULL,
    "whyChosen" TEXT NOT NULL,
    "loadScore" INTEGER NOT NULL,
    "completionStatus" TEXT NOT NULL DEFAULT 'PLANNED',
    "actualDurationMinutes" INTEGER,
    "completionNotes" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrainingSession_trainingPlanId_fkey" FOREIGN KEY ("trainingPlanId") REFERENCES "TrainingPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ClimbingProfile_userId_key" ON "ClimbingProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleConstraint_userId_key" ON "ScheduleConstraint"("userId");

PRAGMA foreign_keys=ON;
