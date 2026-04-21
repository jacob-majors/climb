import { PricingTable } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SectionHeading } from "@/components/section-heading";

export default async function UpgradePage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="mx-auto max-w-4xl space-y-8 py-4">
      <SectionHeading
        eyebrow="Pro · AI Add-on"
        title="14 days free, then $5/mo"
        description="Try the full AI coach free for 14 days. Cancel any time — no charge until the trial ends."
      />

      <PricingTable />
    </div>
  );
}
