import Script from "next/script";
import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LandingPage } from "@/components/landing-page";
import { getSiteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Climbing Training App For Comp Climbers",
  description:
    "A climbing training app for comp climbers that plans sessions around school, work, recovery, route logs, and competition prep.",
  keywords: [
    "climbing training app",
    "competition climbing app",
    "comp climbing training app",
    "climbing planner",
    "climbing timer app",
  ],
  alternates: {
    canonical: "/",
  },
};

export default async function HomePage() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  const siteUrl = getSiteUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "climb.",
    applicationCategory: "SportsApplication",
    operatingSystem: "Web",
    url: siteUrl,
    description:
      "climb. is a climbing training app for competition climbers that combines weekly planning, session timers, route analysis, and comp-focused training structure.",
    offers: [
      {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        category: "Free",
      },
      {
        "@type": "Offer",
        price: "5",
        priceCurrency: "USD",
        category: "Pro",
      },
    ],
    featureList: [
      "Climbing training plan builder",
      "Comp climbing session timer",
      "Route analysis and weakness tracking",
      "Calendar-aware weekly scheduling",
      "Training flow for youth and performance climbers",
    ],
  };

  return (
    <>
      <Script
        id="climb-structured-data"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <LandingPage />
    </>
  );
}
