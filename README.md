# climb.

climb. is a climbing-specific weekly training planner aimed at youth competition climbers and serious performance athletes. It combines athlete profile data, route analysis, schedule constraints, competition timing, and recovery context to generate a realistic weekly plan with readable daily sessions.

## Stack

- Next.js 16 + React 19 + TypeScript
- Tailwind CSS
- Prisma + SQLite
- Server Actions for form handling and plan generation

## What the MVP includes

- Landing page
- Dashboard with athlete snapshot, route readouts, risk flags, and latest plan
- Editable athlete profile
- Route analysis logging
- Schedule + competition input
- Weekly plan generation with saved plan history
- Duplicate previous week
- Printable / PDF-friendly plan view
- Sample seed athlete and route data

## Training logic highlights

The planner uses explicit rule-based logic first, not vague AI guessing.

- Counts team practice as real load
- Avoids stacking too many high-intensity days in a row
- Reduces volume when fatigue, stress, or low sleep suggest recovery is limited
- Tapers when a competition is near
- Identifies a main weakness from route logs such as pump, small-hold difficulty, or commitment on powerful moves
- Shifts session choices toward discipline-specific needs
- Protects youth athletes by softening aggressive finger-loading recommendations

The engine lives in [lib/training-engine.ts](/Users/jacobmajors/Desktop/Coding/climb/lib/training-engine.ts).

## Data model

Prisma models are defined in [prisma/schema.prisma](/Users/jacobmajors/Desktop/Coding/climb/prisma/schema.prisma).

Core entities:

- `User`
- `ClimbingProfile`
- `RouteEntry`
- `ScheduleConstraint`
- `CompetitionEvent`
- `TrainingPlan`
- `TrainingSession`

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Generate the Prisma client:

```bash
npm run db:generate
```

3. Initialize the SQLite database:

Preferred:

```bash
npm run db:push
```

Verified fallback used in this workspace:

```bash
npm run db:init
```

4. Seed sample data:

```bash
npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

6. Open `http://localhost:3000`

## Verified commands

These were run successfully in this workspace:

- `npm run db:generate`
- `npm run db:init`
- `npm run db:seed`
- `npm run lint`
- `npm run build`

`npm run db:push` is still included, but Prisma’s schema engine returned an opaque error in this environment. The SQL initialization fallback in [prisma/init.sql](/Users/jacobmajors/Desktop/Coding/climb/prisma/init.sql) was used instead and works with the generated Prisma client.

## Project structure

```text
.
├── app
│   ├── actions.ts
│   ├── dashboard/page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   ├── plans/[id]/page.tsx
│   ├── plans/page.tsx
│   ├── profile/page.tsx
│   ├── routes/page.tsx
│   └── schedule/page.tsx
├── components
│   ├── forms.tsx
│   ├── load-chart.tsx
│   ├── nav.tsx
│   ├── plan-print-button.tsx
│   ├── section-heading.tsx
│   └── ui
├── lib
│   ├── data.ts
│   ├── format.ts
│   ├── prisma.ts
│   ├── training-engine.ts
│   └── types.ts
├── prisma
│   ├── init.sql
│   ├── schema.prisma
│   └── seed.ts
└── README.md
```

## Product notes

This MVP is intentionally coach-like rather than flashy:

- It assumes training plans should be adaptable, not maximal
- It favors useful daily structure over generic exercise dumps
- It treats recovery as part of performance
- It leaves room for later enhancements like readiness check-ins, session completion tracking, and coach views
