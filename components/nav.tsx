"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Show, UserButton, SignInButton } from "@clerk/nextjs";
import { CalendarDays, LayoutDashboard, Mountain, UserRound } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const links = [
  { href: "/dashboard", label: "Dashboard",      icon: LayoutDashboard },
  { href: "/routes",    label: "Route Analysis",  icon: Mountain },
  { href: "/schedule",  label: "Schedule",        icon: CalendarDays },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <>
      <div className="fixed top-4 left-4 z-40">
        <BrandMark />
      </div>

      {/* Top-right: profile link + Clerk user button */}
      <div className="fixed top-4 right-4 z-40 flex items-center gap-2">
        <Show when="signed-in">
          <Link
            href="/profile"
            className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold shadow-[0_8px_24px_rgba(15,36,32,0.12)] backdrop-blur transition ${
              pathname === "/profile"
                ? "border-pine bg-pine text-chalk"
                : "border-ink/12 bg-chalk/95 text-ink hover:border-pine/40"
            }`}
          >
            <UserRound className="h-3.5 w-3.5" />
            Profile
          </Link>
          <UserButton />
        </Show>
        <Show when="signed-out">
          <Link
            href="/pricing"
            className="flex items-center gap-2 rounded-full border border-clay/18 bg-clay/10 px-3 py-2 text-xs font-semibold text-clay shadow-[0_8px_24px_rgba(15,36,32,0.08)] backdrop-blur transition hover:border-clay/40"
          >
            Pricing
          </Link>
          <SignInButton mode="redirect">
            <button className="flex items-center gap-2 rounded-full border border-ink/12 bg-chalk/95 px-3 py-2 text-xs font-semibold shadow-[0_8px_24px_rgba(15,36,32,0.12)] backdrop-blur transition hover:border-pine/40">
              Sign in
            </button>
          </SignInButton>
        </Show>
      </div>

      <Show when="signed-in">
        <nav className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-3 pointer-events-none">
          <div className="pointer-events-auto flex items-center gap-1 rounded-[28px] border border-ink/12 bg-chalk/95 p-2 shadow-[0_18px_50px_rgba(15,36,32,0.18)] backdrop-blur">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex min-w-0 flex-col items-center gap-1 rounded-[20px] px-3 py-2 transition sm:flex-row sm:gap-2 sm:px-4 ${
                    isActive ? "bg-pine text-chalk" : "text-ink/55 hover:bg-ink/6 hover:text-ink"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="text-[10px] font-semibold leading-tight sm:text-xs">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </Show>
    </>
  );
}
