import type { getActiveAthlete } from "@/lib/data";

type AthleteRecord = Awaited<ReturnType<typeof getActiveAthlete>>;

export type SetupTask = {
  key: string;
  label: string;
  description: string;
  done: boolean;
  required: boolean;
  href?: string;
  actionLabel?: string;
};

export function buildSetupTasks(athlete: AthleteRecord): SetupTask[] {
  const hasProfile = Boolean(athlete?.profile);
  const hasSchedule = Boolean(athlete?.scheduleConstraint);
  const hasRoutes = Boolean(athlete?.routeEntries.length);
  const hasCompetition = Boolean(athlete?.competitionEvents.length);

  return [
    {
      key: "profile",
      label: "Athlete profile",
      description: hasProfile
        ? "Age, grades, discipline, recovery baseline, and equipment are saved."
        : "Save your athlete basics so climb. knows who it is planning for.",
      done: hasProfile,
      required: true,
      href: "/profile",
      actionLabel: hasProfile ? "Edit" : "Finish profile",
    },
    {
      key: "schedule",
      label: "Weekly schedule",
      description: hasSchedule
        ? "Training windows, work, practice, classes, and comp anchors are saved."
        : "Block out when you can train and add work, classes, practices, and comps.",
      done: hasSchedule,
      required: true,
      href: "/schedule",
      actionLabel: hasSchedule ? "Edit" : "Finish schedule",
    },
    {
      key: "routes",
      label: "Route analysis",
      description: hasRoutes
        ? "Recent climbs are logged, so the planner has real climbing data."
        : "Log a recent route or boulder to make the training week more specific.",
      done: hasRoutes,
      required: false,
      href: "/routes",
      actionLabel: hasRoutes ? "Open" : "Add climb",
    },
    {
      key: "competition",
      label: "Next competition",
      description: hasCompetition
        ? "A comp is saved, so countdown and taper logic know what to aim at."
        : "Add your next comp so the dashboard can show a real countdown.",
      done: hasCompetition,
      required: false,
      href: "/schedule",
      actionLabel: hasCompetition ? "View" : "Add comp",
    },
  ];
}
