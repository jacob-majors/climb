import type { Metadata } from "next";
import { PricingSection } from "@/components/landing-page";

export const metadata: Metadata = {
  title: "Pricing For Comp Climbing Training",
  description:
    "See pricing for climb., the climbing training app built for comp climbers with planning, route analysis, timers, and coach-style session support.",
  alternates: {
    canonical: "/pricing",
  },
};

export default function PricingPage() {
  return <PricingSection standalone />;
}
