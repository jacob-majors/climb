import {
  ClimbingProfile,
  CompetitionEvent,
  IntensityLevel,
  RouteEntry,
  ScheduleConstraint,
  SessionType,
  TrainingPlan,
  TrainingSession,
  User,
} from "@prisma/client";

export type AthleteBundle = User & {
  profile: ClimbingProfile | null;
  routeEntries: RouteEntry[];
  scheduleConstraint: ScheduleConstraint | null;
  competitionEvents: CompetitionEvent[];
  trainingPlans: (TrainingPlan & { sessions: TrainingSession[] })[];
};

export type PlannedSessionDraft = {
  dayIndex: number;
  dayLabel: string;
  scheduledWindowLabel?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  sessionType: SessionType;
  title: string;
  durationMinutes: number;
  warmup: string;
  mainWork: string;
  cooldown: string;
  recoveryNotes: string;
  intensity: IntensityLevel;
  whyChosen: string;
  loadScore: number;
};

export type PlanDraft = {
  title: string;
  startDate: Date;
  endDate: Date;
  summary: string;
  explanation: string;
  keyFocusAreas: string;
  mainWeakness: string;
  recoveryNotes: string;
  compPrepNotes: string;
  pushBackoffNotes: string;
  totalLoadScore: number;
  sessions: PlannedSessionDraft[];
};
