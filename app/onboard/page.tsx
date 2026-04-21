import { redirect } from "next/navigation";
import { getOrCreateDbUser } from "@/lib/auth";
import { getActiveAthlete } from "@/lib/data";
import { OnboardWizard } from "@/components/onboard-wizard";

export default async function OnboardPage() {
  const userId = await getOrCreateDbUser();
  if (!userId) redirect("/sign-in");

  const athlete = await getActiveAthlete(userId);

  // If they already have a full profile + schedule, skip onboarding
  if (athlete?.profile && athlete?.scheduleConstraint) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-lg pt-8 pb-24">
      <OnboardWizard
        athleteId={athlete?.id ?? ""}
        existingName={athlete?.name ?? ""}
        existingAge={athlete?.age ?? null}
      />
    </div>
  );
}
