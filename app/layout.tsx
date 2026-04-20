import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "@/app/globals.css";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "climb.",
  description: "climb. is a climbing-specific weekly planner for competition and performance athletes.",
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
