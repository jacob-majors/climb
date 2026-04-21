"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarClock, ChartNoAxesCombined, Route, Sparkles } from "lucide-react";

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

function LeadFallGraphic({ progress }: { progress: number }) {
  const normalized = clamp((progress - 0.08) / 0.52);
  const climberY = 106 + normalized * 198;
  const climberX = 214 + normalized * 36;
  const climberRotation = normalized * 36;
  const ropeCatch = normalized > 0.76 ? (normalized - 0.76) / 0.24 : 0;
  const belayerLean = normalized > 0.72 ? 1 + (normalized - 0.72) * 0.3 : 1;
  const chalkOpacity = clamp((normalized - 0.18) / 0.3);

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

  return (
    <div className="sticky top-20 overflow-hidden rounded-[32px] border border-ink/10 bg-[linear-gradient(180deg,#fef6e6_0%,#f3ebda_46%,#e8dfcf_100%)] shadow-[0_28px_90px_rgba(16,20,24,0.12)]">
      <div className="border-b border-ink/8 px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-pine/70">Scroll The Fall</p>
        <p className="mt-1 text-sm text-ink/60">A lead session turning into a catch, then a plan.</p>
      </div>

      <div className="relative h-[440px]">
        <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_50%_10%,rgba(255,255,255,0.85),transparent_60%)]" />
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
      </div>
    </div>
  );
}

export function LandingPage() {
  const progress = useScrollProgress();

  return (
    <div className="-mx-3 -mt-16 px-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <section className="relative overflow-hidden px-4 pb-20 pt-24 sm:px-8 lg:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(217,108,71,0.18),transparent_24%),radial-gradient(circle_at_80%_18%,rgba(39,78,69,0.18),transparent_22%),linear-gradient(180deg,#f7efe2_0%,#f3ebdd_58%,#f7f2ea_100%)]" />
        <div className="pointer-events-none absolute -left-24 top-28 h-64 w-64 rounded-full bg-clay/10 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 rounded-full bg-pine/10 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="max-w-2xl pt-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/70 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-pine shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              Training For Comp Climbers
            </div>

            <h1
              className="mt-6 max-w-4xl text-5xl leading-[0.92] text-ink sm:text-6xl lg:text-7xl"
              style={{ fontFamily: "Georgia, Times New Roman, serif" }}
            >
              Plan the week
              <span className="block text-clay">before the whip</span>
              <span className="block">decides it for you.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-7 text-ink/72 sm:text-lg">
              `climb.` turns school, work, comps, route logs, recovery, and real calendar gaps into sessions you can actually place, run, and review on your phone.
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
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {[
                ["Source of truth", "Calendar, comps, school, work, and route data stay connected."],
                ["Session flow", "Plan it, run it, warm up, then jump straight into route analysis."],
                ["Mobile first", "Fast enough to use between burns, not only at your desk."],
              ].map(([title, body]) => (
                <div key={title} className="rounded-[28px] border border-white/45 bg-white/60 p-4 shadow-sm backdrop-blur">
                  <p className="text-sm font-semibold text-ink">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-ink/65">{body}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <div className="animate-float-slow rounded-full border border-white/45 bg-white/70 px-4 py-2 text-xs font-semibold text-ink/70 shadow-sm backdrop-blur">
                Tuesday • Primer 4:00PM-5:45PM
              </div>
              <div className="animate-drift rounded-full border border-pine/15 bg-pine/10 px-4 py-2 text-xs font-semibold text-pine shadow-sm">
                Team practice • 6:00PM-8:00PM
              </div>
              <div className="animate-float-slow rounded-full border border-clay/15 bg-clay/10 px-4 py-2 text-xs font-semibold text-clay shadow-sm">
                Route log opens after session
              </div>
            </div>
          </div>

          <LeadFallGraphic progress={progress} />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-24 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:px-12">
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-pine/70">Why It Feels Different</p>
          <h2 className="text-3xl leading-tight text-ink sm:text-4xl" style={{ fontFamily: "Georgia, Times New Roman, serif" }}>
            The scroll tells the same story the app solves.
          </h2>
          <p className="text-base leading-7 text-ink/68">
            Big training apps feel generic because they pretend every athlete has empty evenings and perfect recovery. This one is built around crowded calendars, changing comps, and what actually happened on the wall.
          </p>
        </div>

        <div className="grid gap-4">
          {[
            {
              eyebrow: "1. Load the week",
              title: "Pull in real life first",
              body: "School, work at the gym, team practices, holidays, and competition dates shape the plan before any workout gets suggested.",
            },
            {
              eyebrow: "2. Place the sessions",
              title: "Drag workouts into real windows",
              body: "Suggested sessions land beside actual open time blocks, so the plan can fit Tuesday after school or a short Friday reset instead of pretending every day is the same.",
            },
            {
              eyebrow: "3. Run the day",
              title: "From timer to route log",
              body: "Open a session on your phone, start the hangboard timer, move through the warm-up and main set, then roll straight into route analysis with the session context already there.",
            },
          ].map((item, index) => (
            <div
              key={item.title}
              className="rounded-[30px] border border-ink/10 bg-white/80 p-5 shadow-[0_18px_50px_rgba(16,20,24,0.08)] backdrop-blur"
              style={{ transform: `translateY(${Math.max(0, 18 - index * 6)}px)` }}
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-clay">{item.eyebrow}</p>
              <h3 className="mt-2 text-xl font-semibold text-ink">{item.title}</h3>
              <p className="mt-3 text-sm leading-6 text-ink/66">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-4 pb-24 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-12">
        <div className="space-y-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-pine/70">On Your Phone</p>
          <h2 className="text-3xl leading-tight text-ink sm:text-4xl" style={{ fontFamily: "Georgia, Times New Roman, serif" }}>
            Open the session. Run the timer. Finish and log the routes.
          </h2>
          <p className="text-base leading-7 text-ink/68">
            The app should feel fast when you are tired, rushing between school and practice, or standing under the wall with chalk on your hands. The whole flow is designed around that moment.
          </p>
          <div className="grid gap-3">
            {[
              { icon: CalendarClock, title: "Scheduled around real life", body: "Sessions are placed into actual windows instead of pretending you have three empty hours every day." },
              { icon: ChartNoAxesCombined, title: "Adapts as you log", body: "Recovery, route trends, and what you actually completed can shape the next week." },
              { icon: Route, title: "Built for climbing detail", body: "Warm-up, main set, and route analysis stay connected instead of living in separate tools." },
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

      <section className="mx-auto max-w-7xl px-4 pb-28 sm:px-8 lg:px-12">
        <div className="overflow-hidden rounded-[36px] border border-ink/10 bg-[linear-gradient(135deg,#132823_0%,#1d3a33_50%,#274E45_100%)] p-8 text-chalk shadow-[0_28px_80px_rgba(16,20,24,0.18)] sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-chalk/70">Built For Serious Youth And Comp Athletes</p>
          <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl leading-tight text-chalk sm:text-4xl" style={{ fontFamily: "Georgia, Times New Roman, serif" }}>
                Make the landing page the only chaotic part of the app.
              </h2>
              <p className="mt-3 text-base leading-7 text-chalk/72">
                Once you’re inside, everything should feel calmer: better sessions, cleaner scheduling, faster logging, smarter adjustments.
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
    </div>
  );
}
