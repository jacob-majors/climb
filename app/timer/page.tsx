import { redirect } from "next/navigation";
import { ClimbTimer } from "@/components/climb-timer";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/section-heading";
import { getOrCreateDbUser } from "@/lib/auth";

export default async function TimerPage() {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");

  return (
    <div className="space-y-6">
      <SectionHeading
        eyebrow="Timer"
        title="Run your own climbing timer"
        description="Open this anytime from your account, customize the section lengths, and keep the beeps and pacing the way you like them."
      />

      <Card className="space-y-4">
        <div className="rounded-[20px] border border-pine/10 bg-pine/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">How it works</p>
          <p className="mt-2 text-sm leading-6 text-ink/70">
            Change each section name and duration, pick how many rounds you want, then start. Your timer settings stay saved on this device so the next warm-up is ready faster.
          </p>
        </div>

        <ClimbTimer
          title="Custom timer"
          description="Use it for hangboard activation, density intervals, or any short climbing circuit that needs consistent cues."
          storageKey="climb:standalone-timer"
        />
      </Card>
    </div>
  );
}
