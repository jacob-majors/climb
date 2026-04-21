"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  ChartNoAxesCombined,
  Check,
  Route,
  Sparkles,
  WandSparkles,
  TimerReset,
  BrainCircuit,
  ShieldCheck,
  Orbit,
} from "lucide-react";
import { ProgressRing } from "@/components/progress-ring";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function update() {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const next = total <= 0 ? 0 : clamp(window.scrollY / total);
      setProgress(next);
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return progress;
}

function LeadFallGraphic({
  progress,
  mode = "card",
}: {
  progress: number;
  mode?: "card" | "backdrop";
}) {
  const normalized = clamp((progress - 0.01) / 0.18);
  const climberY = 102 + normalized * 228;
  const climberX = 210 + normalized * 42;
  const climberRotation = normalized * 44;
  const ropeCatch = normalized > 0.68 ? (normalized - 0.68) / 0.32 : 0;
  const belayerLean = normalized > 0.66 ? 1 + (normalized - 0.66) * 0.36 : 1;
  const chalkOpacity = clamp((normalized - 0.12) / 0.24);
  const blurStrength = mode === "backdrop" ? 1.4 + normalized * 1.8 : 0;
  const telemetryPulse = 0.35 + normalized * 0.65;

  const ropePath = `M 276 380 C 274 328, ${260 + normalized * 24} ${286 + normalized * 18}, ${climberX + 2} ${climberY + 10}`;
  const wallDots = useMemo(
    () => [
      { x: 190, y: 88, r: 9, fill: "#D96C47" },
      { x: 248, y: 112, r: 8, fill: "#274E45" },
      { x: 216, y: 164, r: 7, fill: "#E7A83D" },
      { x: 266, y: 202, r: 10, fill: "#C6537A" },
      { x: 182, y: 248, r: 8, fill: "#678F65" },
      { x: 250, y: 272, r: 7, fill: "#2E6AB3" },
      { x: 210, y: 326, r: 8, fill: "#7E5D4E" },
    ],
    [],
  );

  if (mode === "backdrop") {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-6rem] top-[-1rem] hidden h-[36rem] w-[44rem] overflow-hidden lg:block"
        style={{ opacity: 0.48 }}
      >
        <svg
          viewBox="0 0 400 440"
          className="h-full w-full"
          style={{ filter: `blur(${blurStrength}px)` }}
        >
          <defs>
            <linearGradient id="wall-backdrop" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E9D9C1" />
              <stop offset="100%" stopColor="#D6C2A5" />
            </linearGradient>
          </defs>

          <path d="M160 20 C208 58, 166 138, 246 176 C326 214, 246 298, 294 420 L400 440 L400 0 L160 0 Z" fill="url(#wall-backdrop)" />
          {wallDots.map((hold) => (
            <circle key={`${hold.x}-${hold.y}`} cx={hold.x} cy={hold.y} r={hold.r} fill={hold.fill} opacity="0.8" />
          ))}
          <path d="M276 380 C278 328, 270 250, 272 148" stroke="#0F241F" strokeWidth="5" strokeLinecap="round" opacity="0.25" />
          <path d={ropePath} stroke="#D96C47" strokeWidth={4 + ropeCatch * 2} strokeLinecap="round" fill="none" opacity="0.85" />

          <g transform={`translate(276 ${382 - ropeCatch * 10}) scale(${belayerLean} 1)`} opacity="0.8">
            <circle cx="0" cy="-28" r="10" fill="#101418" />
            <path d="M-2 -16 L8 22" stroke="#101418" strokeWidth="8" strokeLinecap="round" />
            <path d="M2 -8 L-16 6" stroke="#101418" strokeWidth="7" strokeLinecap="round" />
            <path d="M6 -4 L20 16" stroke="#101418" strokeWidth="7" strokeLinecap="round" />
            <path d="M8 22 L-8 52" stroke="#101418" strokeWidth="8" strokeLinecap="round" />
            <path d="M8 22 L24 54" stroke="#101418" strokeWidth="8" strokeLinecap="round" />
          </g>

          <g transform={`translate(${climberX} ${climberY}) rotate(${climberRotation})`} opacity="0.92">
            <circle cx="0" cy="-16" r="10" fill="#101418" />
            <path d="M0 -6 L0 24" stroke="#101418" strokeWidth="8" strokeLinecap="round" />
            <path d="M0 0 L-16 -10" stroke="#101418" strokeWidth="7" strokeLinecap="round" />
            <path d="M0 4 L16 14" stroke="#101418" strokeWidth="7" strokeLinecap="round" />
            <path d="M0 24 L-14 50" stroke="#101418" strokeWidth="8" strokeLinecap="round" />
            <path d="M0 24 L18 42" stroke="#101418" strokeWidth="8" strokeLinecap="round" />
          </g>

          <g opacity={chalkOpacity * 0.8}>
            <circle cx={climberX - 26} cy={climberY + 6} r="4" fill="#fff" />
            <circle cx={climberX - 42} cy={climberY - 4} r="3" fill="#fff" />
            <circle cx={climberX - 12} cy={climberY - 18} r="2.5" fill="#fff" />
          </g>
        </svg>
      </div>
    );
  }

  return (
    <div className="sticky top-20 overflow-hidden rounded-[32px] border border-ink/10 bg-[linear-gradient(180deg,#fef6e6_0%,#f3ebda_46%,#e8dfcf_100%)] shadow-[0_28px_90px_rgba(16,20,24,0.12)]">
      <div className="border-b border-ink/8 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-pine/70">Scroll The Fall</p>
            <p className="mt-1 text-sm text-ink/60">A lead session turning into a catch, then a plan.</p>
          </div>
          <div className="rounded-full border border-pine/15 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-pine">
            live model
          </div>
        </div>
      </div>

      <div className="relative h-[440px]">
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.85),transparent_60%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(16,20,24,0.05)_50%,transparent_100%),linear-gradient(rgba(16,20,24,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(16,20,24,0.04)_1px,transparent_1px)] bg-[length:100%_100%,100%_28px,28px_100%]" />
        <svg viewBox="0 0 400 440" className="h-full w-full">
          <defs>
            <linearGradient id="wall" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#E9D9C1" />
              <stop offset="100%" stopColor="#D6C2A5" />
            </linearGradient>
          </defs>

          <path d="M160 20 C208 58, 166 138, 246 176 C326 214, 246 298, 294 420 L400 440 L400 0 L160 0 Z" fill="url(#wall)" />

          {wallDots.map((hold) => (
            <circle key={`${hold.x}-${hold.y}`} cx={hold.x} cy={hold.y} r={hold.r} fill={hold.fill} opacity="0.94" />
          ))}

          <path d="M276 380 C278 328, 270 250, 272 148" stroke="#0F241F" strokeWidth="5" strokeLinecap="round" opacity="0.45" />
          <path d={ropePath} stroke="#D96C47" strokeWidth={4 + ropeCatch * 1.5} strokeLinecap="round" fill="none" />

          <g transform={`translate(276 ${382 - ropeCatch * 10}) scale(${belayerLean} 1)`}>
            <circle cx="0" cy="-28" r="10" fill="#101418" />
            <path d="M-2 -16 L8 22" stroke="#101418" strokeWidth="8" strokeLinecap="round" />
            <path d="M2 -8 L-16 6" stroke="#101418" strokeWidth="7" strokeLinecap="round" />
            <path d="M6 -4 L20 16" stroke="#101418" strokeWidth="7" strokeLinecap="round" />
            <path d="M8 22 L-8 52" stroke="#101418" strokeWidth="8" strokeLinecap="round" />
            <path d="M8 22 L24 54" stroke="#101418" strokeWidth="8" strokeLinecap="round" />
          </g>

          <g transform={`translate(${climberX} ${climberY}) rotate(${climberRotation})`}>
            <circle cx="0" cy="-16" r="10" fill="#101418" />
            <path d="M0 -6 L0 24" stroke="#101418" strokeWidth="8" strokeLinecap="round" />
            <path d="M0 0 L-16 -10" stroke="#101418" strokeWidth="7" strokeLinecap="round" />
            <path d="M0 4 L16 14" stroke="#101418" strokeWidth="7" strokeLinecap="round" />
            <path d="M0 24 L-14 50" stroke="#101418" strokeWidth="8" strokeLinecap="round" />
            <path d="M0 24 L18 42" stroke="#101418" strokeWidth="8" strokeLinecap="round" />
          </g>

          <g opacity={chalkOpacity}>
            <circle cx={climberX - 26} cy={climberY + 6} r="4" fill="#fff" />
            <circle cx={climberX - 42} cy={climberY - 4} r="3" fill="#fff" />
            <circle cx={climberX - 12} cy={climberY - 18} r="2.5" fill="#fff" />
          </g>

          <text x="32" y="372" fill="#101418" opacity="0.6" fontSize="16" fontFamily="Georgia, ui-serif, serif">
            Catch the chaos. Train the pattern.
          </text>
        </svg>

        <div className="absolute left-4 top-4 max-w-[10rem] rounded-[22px] border border-white/45 bg-white/70 px-3 py-3 backdrop-blur">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/45">Wall read</p>
          <p className="mt-2 text-sm font-semibold text-ink">
            {normalized < 0.42 ? "Commit high. Clip clean." : normalized < 0.78 ? "Foot cut detected." : "Catch logged. Build next week from it."}
          </p>
        </div>

        <div className="absolute right-4 top-4 rounded-[22px] border border-white/45 bg-white/72 px-3 py-3 backdrop-blur">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/45">Signal</p>
          <p className="mt-2 text-xl font-black text-ink">{Math.round(64 + normalized * 31)}</p>
          <p className="text-[11px] text-ink/45">power-endurance</p>
        </div>

        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-[24px] border border-white/40 bg-white/65 px-4 py-3 backdrop-blur">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-pine">Live Story</p>
            <p className="mt-1 text-sm text-ink/70">
              {normalized < 0.28
                ? "Climb with confidence."
                : normalized < 0.65
                ? "Miss the clip. Take the whip."
                : normalized < 0.88
                ? "Get caught. Log the session."
                : "Turn the catch into next week’s plan."}
            </p>
          </div>
          <div className="h-2 w-28 overflow-hidden rounded-full bg-ink/10">
            <div className="h-full rounded-full bg-clay transition-all duration-150" style={{ width: `${normalized * 100}%` }} />
          </div>
        </div>

        <div className="absolute bottom-24 right-4 rounded-full border border-clay/15 bg-white/72 px-3 py-1.5 backdrop-blur">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-clay" style={{ opacity: telemetryPulse }} />
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-clay">telemetry active</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeroSignalCard({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-[26px] border border-white/45 bg-white/62 p-4 shadow-sm backdrop-blur">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-pine/70">{eyebrow}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-sm leading-6 text-ink/64">{body}</p>
    </div>
  );
}

function StoryGridSection() {
  const cards = [
    {
      eyebrow: "Calendar engine",
      title: "The week starts with reality",
      body: "School, team practice, work shifts, travel, and comps get loaded first so the plan grows around real time instead of fantasy availability.",
      accent: "bg-[#f5ede1]",
    },
    {
      eyebrow: "Route memory",
      title: "The wall keeps voting",
      body: "Every route log nudges the next sessions: pump, hesitation, foot errors, confidence drops, and movement patterns all feed back into the plan.",
      accent: "bg-[#edf4f0]",
    },
    {
      eyebrow: "Session runner",
      title: "The workout is built to be used mid-session",
      body: "Open the plan, run the timer, adjust the block, mark fatigue, and step into route analysis without losing context.",
      accent: "bg-[#faf4eb]",
    },
    {
      eyebrow: "Comp mode",
      title: "A comp countdown that actually changes behavior",
      body: "Taper notes, recovery pressure, practice load, and route feedback all shift as the event gets closer, so the plan becomes sharper, not just fuller.",
      accent: "bg-[#f2efe8]",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-8 lg:px-12">
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-pine/70">How The System Thinks</p>
          <h2 className="text-3xl leading-tight text-ink sm:text-5xl" style={{ fontFamily: "Georgia, Times New Roman, serif" }}>
            Not a template.
            <span className="block text-clay">More like a climbing operating system.</span>
          </h2>
          <p className="max-w-xl text-base leading-7 text-ink/68">
            The best part of climb. is not one feature. It is the way the schedule, session runner, route logs, and comp prep all stay in conversation with each other.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((card, index) => (
            <div
              key={card.title}
              className={`rounded-[30px] border border-ink/10 ${card.accent} p-5 shadow-[0_18px_50px_rgba(16,20,24,0.08)]`}
              style={{ transform: `translateY(${index % 2 === 0 ? 0 : 22}px)` }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-pine/72">{card.eyebrow}</p>
              <h3 className="mt-3 text-xl font-semibold leading-tight text-ink">{card.title}</h3>
              <p className="mt-3 text-sm leading-6 text-ink/66">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TrainingLoopSection() {
  const phases = [
    {
      title: "Prime",
      body: "The app opens with the exact session block that fits the day, not a pile of notes to interpret.",
      icon: TimerReset,
    },
    {
      title: "Perform",
      body: "Warm-up, work blocks, timer cues, and how-tiring tags stay visible while you are actually climbing.",
      icon: Orbit,
    },
    {
      title: "Reflect",
      body: "Route logging catches the mistakes and trends while they are still fresh, before memory gets blurry.",
      icon: BrainCircuit,
    },
    {
      title: "Rebuild",
      body: "The next week shifts from those signals so the plan keeps learning instead of repeating itself.",
      icon: ShieldCheck,
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-8 lg:px-12">
      <div className="rounded-[38px] border border-ink/10 bg-[linear-gradient(180deg,#fffdf8_0%,#f4eddf_100%)] p-6 shadow-[0_26px_70px_rgba(16,20,24,0.08)] sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[0.84fr_1.16fr]">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-pine/70">The Loop</p>
            <h2 className="text-3xl leading-tight text-ink sm:text-4xl" style={{ fontFamily: "Georgia, Times New Roman, serif" }}>
              A training flow that feels alive while you use it.
            </h2>
            <p className="text-base leading-7 text-ink/68">
              Most apps stop at planning. climb. keeps going through the session, into the route log, and back into the next plan so the whole thing behaves like one loop.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {phases.map((phase, index) => {
              const Icon = phase.icon;
              return (
                <div key={phase.title} className="rounded-[28px] border border-ink/10 bg-white/80 p-5 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pine/10 text-pine">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/35">0{index + 1}</span>
                  </div>
                  <p className="mt-4 text-lg font-semibold text-ink">{phase.title}</p>
                  <p className="mt-2 text-sm leading-6 text-ink/66">{phase.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

const pricingPlans = [
  {
    name: "Free",
    price: "$0",
    tone: "ink" as const,
    description: "Everything in the app — full planning, route logging, session flow, and calendar scheduling. No credit card.",
    ctaLabel: "Start Free",
    ctaHref: "/sign-up",
    features: [
      "Full weekly schedule and session planning",
      "Route logging with weakness tracking",
      "Session flow — timers, warm-up, main set",
      "Drag-and-place sessions into real calendar windows",
      "Competition and recovery planning",
      "Strain, Try Hard, and Weakness ring scores",
    ],
  },
  {
    name: "Pro",
    price: "$5",
    tone: "clay" as const,
    description: "Add an AI layer that watches your climbs, reads your logs, and writes the plan for you.",
    ctaLabel: "Go Pro",
    ctaHref: "/sign-up",
    badge: "AI Add-on",
    features: [
      "AI video analysis from route clips",
      "Personal coach recap after every session",
      "AI-generated weekly plan with rationale",
      "Smart practice primers based on weaknesses",
    ],
  },
];

function RingsFormulaSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-8 lg:px-12">
      <div className="grid gap-8 rounded-[36px] border border-ink/10 bg-white/75 p-7 shadow-[0_24px_70px_rgba(16,20,24,0.08)] backdrop-blur sm:p-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-pine/70">Rings + Formula</p>
          <h2 className="text-3xl leading-tight text-ink sm:text-4xl" style={{ fontFamily: "Georgia, Times New Roman, serif" }}>
            Show the training signals, not just the vibe.
          </h2>
          <p className="text-base leading-7 text-ink/68">
            The rings preview how the app scores a session and route log. These numbers come from the same weighted formulas we use inside the product, so athletes can see why the next plan changed.
          </p>

          <div className="rounded-[28px] border border-pine/10 bg-pine/5 p-5">
            <p className="text-sm font-semibold text-ink">Example session</p>
            <p className="mt-2 text-sm leading-6 text-ink/66">
              Tuesday power-endurance primer, load score 8, 95 minutes, high intensity, route notes showing repeated pump and hesitation.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-5 rounded-[30px] border border-ink/10 bg-[#fcfaf4] p-5 sm:grid-cols-3">
            <ProgressRing label="Strain" helper="How much load the session puts into the week." valueLabel="14.4 / 21" percent={69} tone="pine" />
            <ProgressRing label="Try Hard" helper="How committed and intense the effort was." valueLabel="9.9 / 10" percent={99} tone="clay" />
            <ProgressRing label="Weakness Signal" helper="How strongly the latest logs point to one limiter." valueLabel="74 / 100" percent={74} tone="ink" />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[28px] border border-ink/10 bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-pine/70">Strain formula</p>
              <p className="mt-3 text-sm leading-6 text-ink/66">
                <code>loadScore * 0.9 + duration / 24 + intensity adjustment + session bias</code>, capped from <code>0</code> to <code>21</code>.
              </p>
              <p className="mt-3 text-sm font-semibold text-ink">8*0.9 + 95/24 + 2 + 1.2 = 14.4</p>
            </div>

            <div className="rounded-[28px] border border-ink/10 bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-clay/80">Try Hard formula</p>
              <p className="mt-3 text-sm leading-6 text-ink/66">
                <code>intensity base + session bias + loadScore / 5 + long-session bonus</code>, capped from <code>0</code> to <code>10</code>.
              </p>
              <p className="mt-3 text-sm font-semibold text-ink">7 + 0.8 + 1.6 + 0.5 = 9.9</p>
            </div>

            <div className="rounded-[28px] border border-ink/10 bg-white p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-ink/50">Weakness formula</p>
              <p className="mt-3 text-sm leading-6 text-ink/66">
                Keyword hits get recency weighting, numeric triggers add score, then discipline boosts keep the top limiter visible when data is thin.
              </p>
              <p className="mt-3 text-sm font-semibold text-ink">pump hits + confidence drop + lead boost = power-endurance signal</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PricingSection({ standalone = false }: { standalone?: boolean }) {
  return (
    <section className={`mx-auto max-w-7xl px-4 ${standalone ? "py-10" : "pb-24"} sm:px-8 lg:px-12`}>
      <div className="space-y-4 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-pine/70">Pricing</p>
        <h2
          className="text-4xl leading-tight text-ink sm:text-5xl"
          style={{ fontFamily: "Georgia, Times New Roman, serif" }}
        >
          Keep it simple.
          <span className="block text-clay">Keep it cheap.</span>
        </h2>
        <p className="mx-auto max-w-2xl text-base leading-7 text-ink/68">
          Free gets you everything. Pro adds the AI layer — video analysis, coach recaps, and smart plan generation.
        </p>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        {pricingPlans.map((plan) => {
          const isPro = plan.name === "Pro";
          return (
            <div
              key={plan.name}
              className={
                isPro
                  ? "relative overflow-hidden rounded-[34px] border border-clay/20 bg-[linear-gradient(180deg,#fff9f2_0%,#f7ecdc_100%)] p-7 shadow-[0_26px_70px_rgba(16,20,24,0.1)]"
                  : "rounded-[34px] border border-ink/10 bg-white/80 p-7 shadow-[0_22px_60px_rgba(16,20,24,0.08)] backdrop-blur"
              }
            >
              {plan.badge ? (
                <div className="absolute right-4 top-4 rounded-full bg-clay px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-chalk">
                  {plan.badge}
                </div>
              ) : null}

              <div className="flex items-center gap-3">
                {isPro ? (
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-clay/12 text-clay">
                    <WandSparkles className="h-5 w-5" />
                  </div>
                ) : null}
                <div>
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${isPro ? "text-clay" : "text-ink/45"}`}>
                    {isPro ? "climb. Pro" : "climb."}
                  </p>
                  <div className="mt-2 flex items-end gap-2">
                    <span className="text-5xl font-black text-ink">{plan.price}</span>
                    <span className="pb-1 text-sm font-semibold text-ink/50">/ month</span>
                  </div>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-ink/68">{plan.description}</p>
              <div className="mt-6 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className={`flex items-start gap-3 text-sm ${isPro ? "text-ink/78" : "text-ink/72"}`}>
                    <Check className={`mt-0.5 h-4 w-4 ${isPro ? "text-clay" : "text-pine"}`} />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={plan.ctaHref}
                  className={
                    isPro
                      ? "inline-flex items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-chalk transition hover:bg-pine"
                      : "inline-flex rounded-full border border-ink/12 px-5 py-3 text-sm font-semibold text-ink transition hover:border-pine/35"
                  }
                >
                  {plan.ctaLabel}
                  {isPro ? <ArrowRight className="h-4 w-4" /> : null}
                </Link>
                {isPro ? (
                  <Link
                    href="/sign-in"
                    className="inline-flex items-center justify-center rounded-full border border-ink/12 bg-white/60 px-5 py-3 text-sm font-semibold text-ink transition hover:border-clay/35"
                  >
                    Sign In
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function LandingPage() {
  const progress = useScrollProgress();

  return (
    <div className="-mx-3 -mt-16 overflow-x-hidden px-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <section className="relative overflow-visible px-4 pb-32 pt-24 sm:px-8 lg:px-12">
        <div className="absolute left-1/2 top-0 h-full w-screen -translate-x-1/2 bg-[radial-gradient(circle_at_15%_15%,rgba(217,108,71,0.18),transparent_24%),radial-gradient(circle_at_80%_18%,rgba(39,78,69,0.18),transparent_22%),linear-gradient(180deg,#f7efe2_0%,#f3ebdd_65%,transparent_100%)]" />
        <div className="pointer-events-none absolute -left-24 top-28 h-64 w-64 rounded-full bg-clay/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-pine/10 blur-3xl" />
        <LeadFallGraphic progress={progress} mode="backdrop" />

        <div className="relative mx-auto max-w-7xl">
          <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_440px]">
            <div className="relative z-10 max-w-3xl pt-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-pine shadow-sm backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" />
                Climbing Training App For Comp Climbers
              </div>

              <h1
                className="mt-6 max-w-5xl text-5xl leading-[0.9] text-ink sm:text-6xl lg:text-7xl"
                style={{ fontFamily: "Georgia, Times New Roman, serif" }}
              >
                Plan the week.
                <span className="block text-clay">Catch the fall.</span>
                <span className="block">Train the pattern.</span>
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-ink/72 sm:text-lg">
                <span className="font-black lowercase tracking-tight text-ink">
                  climb<span className="text-clay">.</span>
                </span>{" "}
                turns school, work, comps, route logs, recovery, and real calendar gaps into a climbing system that actually adapts. It plans the week, runs the session, remembers what happened on the wall, and feeds it back into what comes next.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/sign-up"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-chalk shadow-[0_18px_45px_rgba(16,20,24,0.2)] transition hover:bg-pine"
                >
                  Start Building Your Week
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/sign-in"
                  className="inline-flex items-center justify-center rounded-full border border-ink/12 bg-white/75 px-6 py-3 text-sm font-semibold text-ink backdrop-blur transition hover:border-pine/40"
                >
                  Sign In
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-full border border-clay/20 bg-clay/10 px-6 py-3 text-sm font-semibold text-clay transition hover:border-clay/40"
                >
                  View Pricing
                </Link>
              </div>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                <HeroSignalCard eyebrow="Source of truth" title="One plan surface" body="Calendar, comps, school, work, and route signals stay inside the same model." />
                <HeroSignalCard eyebrow="Session runner" title="Use it mid-climb" body="Open the block, warm up, train, rate the effort, and move straight into route logging." />
                <HeroSignalCard eyebrow="Phone speed" title="Fast in the gym" body="Built to be checked with chalky hands between burns, not only later at your desk." />
              </div>

              <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[32px] border border-white/45 bg-white/68 p-5 shadow-sm backdrop-blur">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-pine/70">A day in climb.</p>
                    <div className="rounded-full border border-ink/10 bg-white/70 px-3 py-1 text-[11px] font-semibold text-ink/50">live flow</div>
                  </div>
                  <div className="mt-4 grid gap-3">
                    {[
                      ["4:00PM", "Primer session", "Open the plan and run the exact block for the day."],
                      ["6:00PM", "Team practice", "Practice load stays connected to the rest of the week."],
                      ["After", "Route log + next-week signal", "The app catches what happened and turns it into the next adjustment."],
                    ].map(([time, title, body]) => (
                      <div key={title} className="grid grid-cols-[72px_1fr] gap-3 rounded-[24px] bg-white/82 px-4 py-3">
                        <div className="text-xs font-semibold text-ink/45">{time}</div>
                        <div>
                          <p className="text-sm font-semibold text-ink">{title}</p>
                          <p className="mt-1 text-sm text-ink/62">{body}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[32px] border border-white/45 bg-[#fbf6eb]/88 p-5 shadow-sm backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-pine/70">Live signals</p>
                  <div className="mt-4 space-y-3">
                    {[
                      "calendar window found",
                      "team practice counted as load",
                      "route hesitation flagged",
                      "power-endurance trend rising",
                    ].map((item, index) => (
                      <div key={item} className="flex items-center gap-3 rounded-[20px] bg-white/80 px-3 py-3">
                        <span className={`h-2.5 w-2.5 rounded-full ${index === 2 ? "bg-clay" : "bg-pine"}`} />
                        <p className="text-sm font-medium text-ink/74">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <LeadFallGraphic progress={progress} />
            </div>
          </div>
        </div>
      </section>

      <div className="px-4 pb-24 sm:px-8 lg:hidden lg:px-12">
        <LeadFallGraphic progress={progress} />
      </div>

      <StoryGridSection />

      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-24 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12">
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-pine/70">On Your Phone</p>
          <h2 className="text-3xl leading-tight text-ink sm:text-4xl" style={{ fontFamily: "Georgia, Times New Roman, serif" }}>
            The session runner feels like gear, not paperwork.
          </h2>
          <p className="text-base leading-7 text-ink/68">
            The product has to be good in the worst moment to use software: tired, rushing, under the wall, trying to remember what changed. So the training flow is short, tactile, and built for action first.
          </p>
          <div className="grid gap-3">
            {[
              { icon: CalendarClock, title: "Scheduled around real life", body: "Sessions sit in real windows instead of pretending every day has an empty three-hour block." },
              { icon: ChartNoAxesCombined, title: "Adjusts as you log", body: "Recovery, route trends, and what you actually completed can bend the next week in real time." },
              { icon: Route, title: "Climbing details stay connected", body: "Warm-up, main set, timer, fatigue rating, and route analysis all live in one flow." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="flex gap-3 rounded-[26px] border border-ink/10 bg-white/80 p-4 shadow-sm backdrop-blur">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pine/10 text-pine">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{item.title}</p>
                    <p className="mt-1 text-sm leading-6 text-ink/65">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -left-6 top-10 h-20 w-20 rounded-full bg-clay/10 blur-2xl" />
          <div className="absolute -right-8 top-32 h-28 w-28 rounded-full bg-pine/10 blur-3xl" />
          <div className="relative overflow-hidden rounded-[40px] border border-ink/10 bg-[linear-gradient(180deg,#fffdf8_0%,#f5efe3_100%)] p-3 shadow-[0_32px_90px_rgba(16,20,24,0.14)]">
            <div className="rounded-[32px] border border-ink/10 bg-[#fcfaf4] p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-pine/70">Next Session</p>
                  <p className="mt-1 text-lg font-semibold text-ink">Lead power-endurance primer</p>
                </div>
                <div className="rounded-full bg-clay/10 px-3 py-1 text-xs font-semibold text-clay">Tomorrow</div>
              </div>

              <div className="mt-4 rounded-[24px] border border-pine/10 bg-pine/5 p-4">
                <p className="text-sm font-semibold text-ink">Tuesday • 4:00PM-5:45PM</p>
                <p className="mt-2 text-sm leading-6 text-ink/68">
                  Activation, linked lead intervals, clipping under pump, then reset for team practice.
                </p>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                {[
                  ["Focus", "PE"],
                  ["Load", "8"],
                  ["Feel", "mod"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[18px] border border-ink/8 bg-white/85 px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink/35">{label}</p>
                    <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-3">
                {[
                  ["1", "Hangboard warm-up", "Short beeping timer to wake up fingers without burning them."],
                  ["2", "Advanced warm-up", "Progressive lead movement and clip-and-shake rehearsal."],
                  ["3", "Main activity", "Controlled power-endurance primer based on tonight’s practice theme."],
                  ["4", "After session", "Route analysis opens with session context already filled in."],
                ].map(([step, title, body]) => (
                  <div key={title} className="flex gap-3 rounded-[22px] border border-ink/8 bg-white/80 p-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-ink text-xs font-bold text-chalk">
                      {step}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-ink/62">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <TrainingLoopSection />

      <RingsFormulaSection />

      <PricingSection />

      <section className="mx-auto max-w-7xl px-4 pb-28 sm:px-8 lg:px-12">
        <div className="overflow-hidden rounded-[36px] border border-ink/10 bg-[linear-gradient(135deg,#132823_0%,#1d3a33_50%,#274E45_100%)] p-8 text-chalk shadow-[0_28px_80px_rgba(16,20,24,0.18)] sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-chalk/70">Built For Serious Youth And Comp Athletes</p>
          <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl leading-tight text-chalk sm:text-4xl" style={{ fontFamily: "Georgia, Times New Roman, serif" }}>
                Chaotic on the wall.
                <span className="block text-[#f6d6c7]">Calm everywhere else.</span>
              </h2>
              <p className="mt-3 text-base leading-7 text-chalk/72">
                Once you’re inside, the product should slow the noise down: cleaner sessions, better timing, faster logging, and a week that actually reacts to what happened.
              </p>
            </div>
            <Link
              href="/sign-up"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-chalk px-6 py-3 text-sm font-semibold text-ink transition hover:bg-[#f6efe0]"
            >
              Create Account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-8 lg:px-12">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              title: "What is climb.?",
              body: "climb. is a climbing training app for competition climbers who need weekly planning, timers, and route analysis in one place.",
            },
            {
              title: "Who is it for?",
              body: "It is built for comp climbers, youth athletes, and performance-focused climbers balancing school, work, practice, and comps.",
            },
            {
              title: "What makes it different?",
              body: "It combines comp climbing planning, session timing, recovery-aware scheduling, and route-log feedback instead of separating them into different tools.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-[28px] border border-ink/10 bg-white/80 p-5 shadow-sm backdrop-blur">
              <h3 className="text-lg font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-ink/66">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
