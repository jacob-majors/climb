const FALLBACK_SITE_URL = "https://climb-app.vercel.app";

export function getSiteUrl() {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  if (!envUrl) return FALLBACK_SITE_URL;
  if (envUrl.startsWith("http://") || envUrl.startsWith("https://")) return envUrl;
  return `https://${envUrl}`;
}

export const siteConfig = {
  name: "climb.",
  shortName: "climb",
  description:
    "climb. is a climbing training app for competition climbers. Plan sessions, run timers, review route logs, and build smarter comp-climbing weeks.",
  keywords: [
    "climbing training app",
    "comp climbing app",
    "competition climbing training",
    "climbing workout planner",
    "climbing session timer",
    "route analysis app",
    "youth climbing training",
    "lead climbing training app",
    "bouldering training planner",
  ],
};
