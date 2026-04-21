import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-10 pt-10">
      <section className="space-y-4 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-pine/70">Pricing</p>
        <h1
          className="text-4xl leading-tight text-ink sm:text-5xl"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Keep it simple.
          <span className="block text-clay">Keep it cheap.</span>
        </h1>
        <p className="mx-auto max-w-2xl text-base leading-7 text-ink/68">
          Start free, then upgrade to Pro for full planning, session flow, and route-analysis tools without turning this into a giant expensive SaaS bill.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[34px] border border-ink/10 bg-white/80 p-7 shadow-[0_22px_60px_rgba(16,20,24,0.08)] backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-ink/45">Free</p>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-5xl font-black text-ink">$0</span>
            <span className="pb-1 text-sm font-semibold text-ink/50">/ month</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-ink/66">
            Good for trying the flow and keeping a basic climbing log going.
          </p>
          <div className="mt-6 space-y-3">
            {[
              "Basic weekly schedule",
              "Route logging",
              "Simple session view",
              "Landing page and account access",
            ].map((feature) => (
              <div key={feature} className="flex items-start gap-3 text-sm text-ink/72">
                <Check className="mt-0.5 h-4 w-4 text-pine" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Link
              href="/sign-up"
              className="inline-flex rounded-full border border-ink/12 px-5 py-3 text-sm font-semibold text-ink transition hover:border-pine/35"
            >
              Start Free
            </Link>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-[34px] border border-clay/20 bg-[linear-gradient(180deg,#fff9f2_0%,#f7ecdc_100%)] p-7 shadow-[0_26px_70px_rgba(16,20,24,0.1)]">
          <div className="absolute right-4 top-4 rounded-full bg-clay px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-chalk">
            Pro
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-clay">climb. Pro</p>
          <div className="mt-4 flex items-end gap-2">
            <span className="text-5xl font-black text-ink">$5</span>
            <span className="pb-1 text-sm font-semibold text-ink/50">/ month</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-ink/68">
            Full planning for athletes who actually want the app to think with their calendar instead of around it.
          </p>
          <div className="mt-6 space-y-3">
            {[
              "Smart weekly plan generation",
              "Drag-and-place sessions into real open windows",
              "Practice primers based on team theme",
              "Session player with hangboard timer",
              "Route analysis with session handoff",
              "Recovery-aware adjustments over time",
            ].map((feature) => (
              <div key={feature} className="flex items-start gap-3 text-sm text-ink/78">
                <Check className="mt-0.5 h-4 w-4 text-clay" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-chalk transition hover:bg-pine"
            >
              Go Pro
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-ink/12 bg-white/60 px-5 py-3 text-sm font-semibold text-ink transition hover:border-clay/35"
            >
              Back To Landing Page
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
