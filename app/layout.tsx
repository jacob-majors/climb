import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "@/app/globals.css";
import { Nav } from "@/components/nav";
import { getSiteUrl, siteConfig } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: siteConfig.name,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: siteConfig.keywords,
  applicationName: siteConfig.name,
  category: "sports",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: siteConfig.name,
    title: `${siteConfig.name} | Climbing Training App For Comp Climbers`,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} | Climbing Training App For Comp Climbers`,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider afterSignOutUrl="/sign-in">
      <html lang="en">
        <body className="font-sans">
          <Nav />
          <main className="mx-auto max-w-7xl px-3 pt-16 pb-28 sm:px-6 sm:pt-16 sm:pb-28 lg:px-8">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
