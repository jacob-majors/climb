import { UserProfile } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SectionHeading } from "@/components/section-heading";
import { Card } from "@/components/ui/card";
import { getOrCreateDbUser } from "@/lib/auth";
import { GOOGLE_CALENDAR_READONLY_SCOPE } from "@/lib/google-calendar";

type AccountPageProps = {
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

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");

  const params = (await searchParams) ?? {};
  const message = accountMessage(readParam(params.error));

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Account"
        title="Connections and permissions"
        description="Connect Google here, then head back to the schedule page and pull your calendar into the week."
      />

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

      <Card className="overflow-hidden">
        <UserProfile
          additionalOAuthScopes={{
            google: [GOOGLE_CALENDAR_READONLY_SCOPE],
          }}
        />
      </Card>
    </div>
  );
}
