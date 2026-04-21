import Link from "next/link";
import { TimerReset } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { Card } from "@/components/ui/card";
import { getActiveAthlete } from "@/lib/data";
import { getOrCreateDbUser } from "@/lib/auth";
import { buildSetupTasks } from "@/lib/setup-tasks";
import { redirect } from "next/navigation";
import { ClimberProfilePanel } from "@/components/climber-profile-panel";

type ProfilePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function accountMessage(error?: string) {
  switch (error) {
    case "google-calendar-not-connected":
      return {
        tone: "amber",
        title: "Connect Google first",
        description: "Add your Google account here so climb. can read your calendar and pull classes, work, and practice into your schedule.",
      };
    case "google-calendar-permission":
      return {
        tone: "clay",
        title: "Google needs calendar permission",
        description: "Reconnect Google and approve read-only Calendar access, then come back and sync again.",
      };
    default:
      return null;
  }
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");

  const params = (await searchParams) ?? {};
  const message = accountMessage(readParam(params.error));
  const athlete = await getActiveAthlete(userId);
  const profile = athlete?.profile;
  const setupTasks = buildSetupTasks(athlete);
  const requiredTasks = setupTasks.filter((task) => task.required);
  const optionalTasks = setupTasks.filter((task) => !task.required);

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Profile"
        title="Athlete details, account access, and permissions"
        description="Keep the athlete profile and Clerk account settings together, including Google Calendar access for schedule sync."
      />

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Profile setup</p>
            <p className="mt-1 text-lg font-semibold text-ink">
              {requiredTasks.filter((task) => task.done).length}/{requiredTasks.length} core pieces finished
            </p>
          </div>
          <p className="max-w-md text-sm leading-6 text-ink/60">
            Dashboard setup nudges live here now, so the dashboard can stay focused on training, recovery, and the next session.
          </p>
        </div>

        <div className="space-y-3">
          {requiredTasks.map((task) => (
            <div key={task.key} className="flex items-start justify-between gap-4 rounded-2xl border border-ink/10 bg-white/70 p-4">
              <div>
                <p className="text-sm font-semibold text-ink">{task.label}</p>
                <p className="mt-1 text-sm leading-6 text-ink/60">{task.description}</p>
              </div>
              {task.href ? (
                <Link
                  href={task.href}
                  className="inline-flex shrink-0 rounded-full border border-ink/10 px-3 py-2 text-xs font-semibold text-ink transition hover:border-pine hover:text-pine"
                >
                  {task.actionLabel}
                </Link>
              ) : null}
            </div>
          ))}
          {optionalTasks.map((task) => (
            <div key={task.key} className="flex items-start justify-between gap-4 rounded-2xl bg-mist/50 p-4">
              <div>
                <p className="text-sm font-semibold text-ink">{task.label}</p>
                <p className="mt-1 text-sm leading-6 text-ink/60">{task.description}</p>
              </div>
              {task.href ? (
                <Link
                  href={task.href}
                  className="inline-flex shrink-0 rounded-full border border-ink/10 bg-white px-3 py-2 text-xs font-semibold text-ink transition hover:border-pine hover:text-pine"
                >
                  {task.actionLabel}
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      {message ? (
        <Card className={message.tone === "clay" ? "border-clay/20 bg-clay/5" : "border-amber-200 bg-amber-50/70"}>
          <p className="text-sm font-semibold text-ink">{message.title}</p>
          <p className="mt-2 text-sm leading-6 text-ink/70">{message.description}</p>
          <div className="mt-4">
            <Link
              href="/schedule"
              className="inline-flex items-center rounded-full border border-ink/10 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-pine"
            >
              Back to schedule
            </Link>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Quick access</p>
            <p className="mt-1 text-lg font-semibold text-ink">Jump straight to the timer</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink/60">
              Open the standalone climbing timer from your profile, customize section lengths and rounds, and keep those settings saved for the next session.
            </p>
          </div>
          <Link
            href="/timer"
            className="inline-flex items-center gap-2 rounded-full border border-pine/15 bg-pine px-4 py-2.5 text-sm font-semibold text-chalk transition hover:bg-ink"
          >
            <TimerReset className="h-4 w-4" />
            Open timer
          </Link>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <ClimberProfilePanel
          athleteId={athlete?.id ?? ""}
          athleteName={athlete?.name ?? ""}
          athleteAge={athlete?.age ?? 16}
          profile={profile}
        />
      </Card>
    </div>
  );
}
