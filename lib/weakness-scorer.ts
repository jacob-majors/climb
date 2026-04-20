import { Discipline, RouteEntry, SessionType } from "@prisma/client";

export type WeaknessCategory =
  | "power_endurance"
  | "max_strength"
  | "technique"
  | "footwork"
  | "mental_game"
  | "aerobic_base"
  | "recruitment_power"
  | "contact_strength"
  | "route_reading"
  | "mobility";

export type RankedWeakness = {
  category: WeaknessCategory;
  score: number;
  evidence: string[];
  label: string;
  focusAreas: string[];
  preferredSessions: SessionType[];
  explanation: string;
};

type NumericSignal = {
  field: "pumpLevel" | "confidenceLevel" | "cruxDifficulty";
  threshold: number;
  direction: "high" | "low";
  weight: number;
};

type CategoryConfig = {
  keywords: string[];
  numericSignals: NumericSignal[];
  label: string;
  focusAreas: string[];
  preferredSessions: SessionType[];
  explanation: string;
};

const CATEGORY_CONFIG: Record<WeaknessCategory, CategoryConfig> = {
  power_endurance: {
    keywords: [
      "pump", "pumped", "endurance", "fading", "fade out", "burning",
      "forearms filling", "arms gave", "couldn't finish", "couldnt finish",
      "fell off at the top", "lost it near the top", "arms pumping", "pumping out",
      "forearms", "getting tired", "sustained", "long route",
    ],
    numericSignals: [{ field: "pumpLevel", threshold: 7, direction: "high", weight: 18 }],
    label: "Power endurance on sustained terrain",
    focusAreas: ["Power endurance", "Pacing", "Shake efficiency"],
    preferredSessions: [SessionType.LEAD_ENDURANCE, SessionType.POWER_ENDURANCE, SessionType.TECHNIQUE_DRILLS],
    explanation: "Route logs show repeated pump-induced failures and declining movement quality as sessions progress.",
  },
  max_strength: {
    keywords: [
      "too hard", "couldn't pull", "couldnt pull", "not strong enough", "not enough strength",
      "couldn't hold", "couldnt hold", "finger strength", "crimp", "small holds", "edge", "edges",
      "tiny holds", "fingers gave out", "fingers gave", "hard section", "strength limited",
    ],
    numericSignals: [{ field: "cruxDifficulty", threshold: 8, direction: "high", weight: 12 }],
    label: "Max finger strength and contact force",
    focusAreas: ["Finger strength", "Grip selection", "Limit move execution"],
    preferredSessions: [SessionType.FINGER_STRENGTH, SessionType.RECRUITMENT_POWER, SessionType.LIMIT_BOULDERING],
    explanation: "The athlete is hitting a ceiling on hard moves that requires more raw contact force than current training develops.",
  },
  technique: {
    keywords: [
      "technique", "inefficient", "sloppy", "wasted energy", "wasted moves", "body position",
      "hip", "sequence", "movement quality", "style", "awkward", "inefficiency",
      "bad sequence", "wrong move", "movement", "form", "positioning",
    ],
    numericSignals: [],
    label: "Technical movement efficiency",
    focusAreas: ["Movement economy", "Body positioning", "Sequence optimization"],
    preferredSessions: [SessionType.TECHNIQUE_DRILLS, SessionType.FOOTWORK_DRILLS, SessionType.ARC],
    explanation: "Session notes indicate inefficient movement patterns that waste energy and reduce success rates.",
  },
  footwork: {
    keywords: [
      "footwork", "feet", "foot placement", "slipping", "smearing", "toe hook",
      "heel hook", "no feet", "feet slipping", "bad feet", "foot", "feet came off",
      "foothold", "foot slip",
    ],
    numericSignals: [],
    label: "Footwork precision and trust",
    focusAreas: ["Silent feet", "Precision placement", "Slab and vertical confidence"],
    preferredSessions: [SessionType.FOOTWORK_DRILLS, SessionType.TECHNIQUE_DRILLS, SessionType.ARC],
    explanation: "Route logs point to imprecise or unconfident foot placements that force extra upper-body work.",
  },
  mental_game: {
    keywords: [
      "scared", "fear", "hesitation", "hesitated", "commit", "couldn't commit",
      "confidence", "nervous", "froze", "freaked out", "mental block", "intimidated",
      "head game", "mindset", "anxious", "bailed", "psyched out", "scared to fall",
      "hesitate", "mental",
    ],
    numericSignals: [{ field: "confidenceLevel", threshold: 4, direction: "low", weight: 22 }],
    label: "Commitment and mental composure",
    focusAreas: ["Commitment on powerful moves", "Competition composure", "Process focus"],
    preferredSessions: [SessionType.LIMIT_BOULDERING, SessionType.RECRUITMENT_POWER, SessionType.PROJECTING],
    explanation: "The log reveals consistent hesitation and confidence drops under pressure, suggesting physical capacity exceeds mental execution.",
  },
  aerobic_base: {
    keywords: [
      "out of breath", "cardiovascular", "aerobic", "breathing hard", "breathless",
      "not fit", "cardio", "lungs", "heart rate", "fitness", "general fitness",
      "out of shape", "cardio base",
    ],
    numericSignals: [],
    label: "Aerobic base and work capacity",
    focusAreas: ["Aerobic capacity", "Route pacing", "General work capacity"],
    preferredSessions: [SessionType.ARC, SessionType.LEAD_ENDURANCE, SessionType.FOOTWORK_DRILLS],
    explanation: "Cardiovascular limitations are reducing overall training quality and route endurance.",
  },
  recruitment_power: {
    keywords: [
      "explosive", "dynamic", "dyno", "deadpoint", "power", "couldn't snap", "pop",
      "can't generate", "cant generate", "not powerful", "dynamic moves", "dead point",
      "one-move", "single move", "crux move", "hard move", "powerful move",
    ],
    numericSignals: [],
    label: "Explosive power and recruitment",
    focusAreas: ["Max recruitment", "Explosive coordination", "Dynamic precision"],
    preferredSessions: [SessionType.RECRUITMENT_POWER, SessionType.LIMIT_BOULDERING, SessionType.CORE],
    explanation: "Dynamic moves and explosive sequences are a consistent limiter, pointing to underdeveloped recruitment patterns.",
  },
  contact_strength: {
    keywords: [
      "slipped off", "can't latch", "cant latch", "couldn't latch", "open hand",
      "grip strength", "slippery", "popped off", "contact", "latching",
      "missed the hold", "couldn't grab", "slipped", "slip",
    ],
    numericSignals: [],
    label: "Contact strength and latch reliability",
    focusAreas: ["Contact strength", "Open-hand grip", "First-contact reliability"],
    preferredSessions: [SessionType.RECRUITMENT_POWER, SessionType.FINGER_STRENGTH, SessionType.LIMIT_BOULDERING],
    explanation: "The athlete is losing holds on first contact, suggesting contact strength is lagging behind move difficulty demands.",
  },
  route_reading: {
    keywords: [
      "read", "beta", "sequence", "wrong sequence", "didn't know", "wasted moves",
      "figured out too late", "beta spray", "couldn't read", "route reading",
      "no beta", "figured it out late", "wrong direction", "bad beta",
    ],
    numericSignals: [],
    label: "Route reading and beta efficiency",
    focusAreas: ["Visual pre-reading", "Beta efficiency", "Decision-making under fatigue"],
    preferredSessions: [SessionType.PROJECTING, SessionType.TECHNIQUE_DRILLS, SessionType.LEAD_ENDURANCE],
    explanation: "Inefficient beta selection and poor pre-route reading are adding unnecessary moves and fatigue.",
  },
  mobility: {
    keywords: [
      "flexible", "flexibility", "mobility", "stiff", "hip flexor", "reach",
      "high step", "couldn't reach", "tight hips", "hip mobility", "tight",
      "not flexible", "can't reach", "too stiff",
    ],
    numericSignals: [],
    label: "Mobility and body-position range",
    focusAreas: ["Hip mobility", "Shoulder range", "High-step confidence"],
    preferredSessions: [SessionType.MOBILITY, SessionType.FOOTWORK_DRILLS, SessionType.TECHNIQUE_DRILLS],
    explanation: "Mobility limitations are restricting movement options and forcing compensatory upper-body work.",
  },
};

// More recent routes carry more weight
const RECENCY_WEIGHTS = [1.0, 0.80, 0.60, 0.42, 0.28];

function textScore(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    if (lower.includes(kw)) {
      score += 10;
    }
  }
  return score;
}

function evidenceLabel(route: RouteEntry): string {
  const name = route.title || route.grade || "route";
  return name.length > 30 ? name.slice(0, 30) + "…" : name;
}

export function scoreWeaknesses(routes: RouteEntry[], discipline: Discipline): RankedWeakness[] {
  const scores: Record<WeaknessCategory, number> = {} as Record<WeaknessCategory, number>;
  const evidence: Record<WeaknessCategory, string[]> = {} as Record<WeaknessCategory, string[]>;

  for (const cat of Object.keys(CATEGORY_CONFIG) as WeaknessCategory[]) {
    scores[cat] = 0;
    evidence[cat] = [];
  }

  routes.slice(0, 5).forEach((route, idx) => {
    const weight = RECENCY_WEIGHTS[idx] ?? 0.2;
    const text = [
      route.mainChallenges,
      route.fallReason,
      route.feltWeak,
      route.weaknessSummary,
      route.freeText,
    ]
      .filter(Boolean)
      .join(" ");

    for (const [cat, cfg] of Object.entries(CATEGORY_CONFIG) as [WeaknessCategory, CategoryConfig][]) {
      const ts = textScore(text, cfg.keywords) * weight;
      if (ts > 0) {
        scores[cat] += ts;
        const label = evidenceLabel(route);
        if (!evidence[cat].includes(label)) evidence[cat].push(label);
      }

      for (const sig of cfg.numericSignals) {
        const val = route[sig.field] as number | null | undefined;
        if (val == null) continue;
        const triggered = sig.direction === "high" ? val >= sig.threshold : val <= sig.threshold;
        if (triggered) {
          scores[cat] += sig.weight * weight;
          const label = evidenceLabel(route);
          if (!evidence[cat].includes(label)) evidence[cat].push(label);
        }
      }
    }
  });

  // Discipline-specific baseline boosts ensure relevant categories rank well when data is sparse
  if (discipline === Discipline.LEAD || discipline === Discipline.MIXED) {
    scores.power_endurance += 6;
    scores.aerobic_base += 3;
  }
  if (discipline === Discipline.BOULDERING || discipline === Discipline.MIXED) {
    scores.recruitment_power += 6;
    scores.max_strength += 4;
  }

  const ranked = (Object.keys(CATEGORY_CONFIG) as WeaknessCategory[])
    .map((cat) => ({
      category: cat,
      score: Math.round(scores[cat]),
      evidence: evidence[cat],
      ...CATEGORY_CONFIG[cat],
    }))
    .filter((w) => w.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    const fallback: WeaknessCategory =
      discipline === Discipline.LEAD ? "power_endurance" : "recruitment_power";
    return [{ category: fallback, score: 0, evidence: [], ...CATEGORY_CONFIG[fallback] }];
  }

  return ranked;
}

// Return the single primary weakness (top ranked)
export function getPrimaryWeaknessFromScores(ranked: RankedWeakness[]): RankedWeakness {
  return ranked[0];
}

// Blend the top-3 detected weaknesses into 3 non-duplicate preferred sessions
export function getBlendedWeaknessSessions(ranked: RankedWeakness[]): SessionType[] {
  const seen = new Set<SessionType>();
  const blended: SessionType[] = [];

  for (const weakness of ranked.slice(0, 3)) {
    for (const session of weakness.preferredSessions) {
      if (!seen.has(session) && blended.length < 3) {
        seen.add(session);
        blended.push(session);
      }
    }
  }

  // Ensure we always return exactly 3
  const fallbacks: SessionType[] = [
    SessionType.TECHNIQUE_DRILLS,
    SessionType.FOOTWORK_DRILLS,
    SessionType.ARC,
  ];
  for (const fb of fallbacks) {
    if (blended.length >= 3) break;
    if (!seen.has(fb)) {
      seen.add(fb);
      blended.push(fb);
    }
  }

  return blended.slice(0, 3);
}

// Build a human-readable multi-weakness explanation
export function buildWeaknessNarrative(ranked: RankedWeakness[]): string {
  const top = ranked.slice(0, 3);
  if (top.length === 0) return "No clear weakness pattern detected yet — the plan defaults to broad technical development.";
  if (top.length === 1) return top[0].explanation;

  const primary = top[0];
  const secondary = top[1];
  const tertiary = top[2];

  let narrative = primary.explanation;
  narrative += ` Secondary signals point to ${secondary.label.toLowerCase()}`;
  if (secondary.evidence.length > 0) {
    narrative += ` (flagged in ${secondary.evidence.slice(0, 2).join(", ")})`;
  }
  narrative += ".";

  if (tertiary) {
    narrative += ` ${tertiary.label} is also present but was weighted lower.`;
  }

  return narrative;
}
