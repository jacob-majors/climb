import Link from "next/link";
import { Mountain } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/profile", label: "Athlete Profile" },
  { href: "/routes", label: "Route Analysis" },
  { href: "/schedule", label: "Schedule" },
  { href: "/plans", label: "Saved Plans" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink/10 bg-chalk/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-sm font-semibold tracking-[0.22em] text-ink uppercase">
          <span className="rounded-full bg-pine p-2 text-chalk">
            <Mountain className="h-4 w-4" />
          </span>
          Climb Planner
        </Link>
        <nav className="hidden flex-wrap items-center gap-5 text-sm text-ink/70 md:flex">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="transition hover:text-ink">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
