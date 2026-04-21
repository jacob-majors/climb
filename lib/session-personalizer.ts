import { ClimbingProfile, Discipline, SessionType } from "@prisma/client";
import { RankedWeakness } from "@/lib/weakness-scorer";
import { MesocyclePhase } from "@/lib/periodization";

export type SessionContent = {
  warmup: string;
  mainWork: string;
  cooldown: string;
  recoveryNotes: string;
};

export type PersonalizationContext = {
  profile: ClimbingProfile;
  age: number;
  primaryWeakness: RankedWeakness;
  rankedWeaknesses: RankedWeakness[];
  mesocyclePhase: MesocyclePhase;
  sessionDurationMinutes: number;
};

// ──────────────────────────────────────────────────────────────────────────────
// Grade helpers
// ──────────────────────────────────────────────────────────────────────────────

function gradeRange(profile: ClimbingProfile): string {
  if (profile.primaryDiscipline === Discipline.BOULDERING) {
    const flash = profile.boulderFlashGrade;
    const max = profile.boulderMaxGrade;
    if (flash && max) return `${flash}–${max}`;
    if (max) return `around ${max}`;
    return "at your project level";
  }
  const flash = profile.flashGrade;
  const rp = profile.redpointGrade;
  if (flash && rp) return `${flash}–${rp}`;
  if (rp) return `at your ${rp} redpoint level`;
  return "just below your redpoint";
}

function flashGrade(profile: ClimbingProfile): string {
  if (profile.primaryDiscipline === Discipline.BOULDERING) {
    return profile.boulderFlashGrade || "your flash grade";
  }
  return profile.flashGrade || "your flash grade";
}

function projectGrade(profile: ClimbingProfile): string {
  if (profile.primaryDiscipline === Discipline.BOULDERING) {
    return profile.boulderMaxGrade || "your project";
  }
  return profile.redpointGrade || "your redpoint project";
}

function hasWeakness(ctx: PersonalizationContext, category: string): boolean {
  return ctx.rankedWeaknesses.slice(0, 3).some((w) => w.category === category);
}

function intensityLabel(phase: MesocyclePhase): string {
  if (phase === "deload") return "conservative";
  if (phase === "accumulation") return "moderate";
  if (phase === "intensification") return "high-quality";
  return "maximal-effort";
}

// ──────────────────────────────────────────────────────────────────────────────
// Session personalizers
// ──────────────────────────────────────────────────────────────────────────────

function personalizeLeadEndurance(ctx: PersonalizationContext): SessionContent {
  const range = gradeRange(ctx.profile);
  const hasPump = hasWeakness(ctx, "power_endurance");
  const hasPace = hasWeakness(ctx, "technique");
  const phase = ctx.mesocyclePhase;
  const sets = phase === "deload" ? "2" : phase === "realization" ? "4–5" : "3–4";
  const restWindow = phase === "deload" ? "8–10 minutes" : "5–8 minutes";

  const pumpNote = hasPump
    ? " Monitor pump onset actively — begin shaking out before your forearms feel full, not after."
    : "";
  const paceNote = hasPace
    ? " Focus on clipping efficiency and maintaining hip contact with the wall between clips."
    : "";

  return {
    warmup: `Progressive pyramid from easy to ${flashGrade(ctx.profile)}. Add scapular activation, open/close grip prep, and 2–3 clip-practice repetitions.`,
    mainWork: `${sets} interval sets on routes in your ${range} range. Aim for ${ctx.sessionDurationMinutes >= 90 ? "5–6" : "4–5"} minutes on, ${restWindow} off.${pumpNote}${paceNote}`,
    cooldown: `10 minutes ARC at easy-warm pace to flush forearms, then forearm extensors and calf mobility.`,
    recoveryNotes: `Refuel within 30 minutes. Keep tomorrow morning low-stimulus if possible — ${phase === "realization" ? "this was a high-output session." : "the cumulative load adds up."}`,
  };
}

function personalizePowerEndurance(ctx: PersonalizationContext): SessionContent {
  const range = gradeRange(ctx.profile);
  const phase = ctx.mesocyclePhase;
  const circuits = phase === "deload" ? "1–2" : phase === "realization" ? "4" : "2–3";
  const rest = phase === "realization" ? "incomplete rest (2–3 min)" : "incomplete rest (3–4 min)";

  return {
    warmup: `Movement prep and 2 submax circuits on terrain well below ${flashGrade(ctx.profile)}. Get warm, not tired.`,
    mainWork: `${circuits} linked circuits using ${range} sections with ${rest} to train sustained high-output movement. Stop a set if movement quality collapses.`,
    cooldown: `Gentle ARC traverse for 8–10 minutes on easy terrain. Forearm extensor work and wrist circles.`,
    recoveryNotes: `Expect noticeable forearm fatigue — avoid stacking another high-intensity session tomorrow. Prioritize protein and sleep tonight.`,
  };
}

function personalizeLimitBouldering(ctx: PersonalizationContext): SessionContent {
  const proj = projectGrade(ctx.profile);
  const phase = ctx.mesocyclePhase;
  const attempts = phase === "deload" ? "3–4" : phase === "realization" ? "5–8" : "4–6";
  const rest = phase === "realization" ? "4–5 minutes" : "3–5 minutes";
  const hasMental = hasWeakness(ctx, "mental_game");

  const mentalNote = hasMental
    ? " Before each attempt, commit to the move — hesitation at this level wastes energy and reinforces avoidance patterns."
    : "";

  return {
    warmup: `10 minutes easy movement, progressive finger activation across 3 grades, then 2 burns on terrain well below ${proj}.`,
    mainWork: `${attempts} ${intensityLabel(phase)} attempts on your ${proj} project or moves at that level. Full rest (${rest}) between attempts.${mentalNote} Two retries on the crux move only if execution was clean.`,
    cooldown: `Easy traversing on large holds, shoulder care (band rows and serratus), hip mobility.`,
    recoveryNotes: `Protect skin — stop immediately if it starts to tear. Power drops sharply after quality fails; don't chase more volume.`,
  };
}

function personalizeProjecting(ctx: PersonalizationContext): SessionContent {
  const proj = projectGrade(ctx.profile);
  const hasRouteReading = hasWeakness(ctx, "route_reading");

  const readNote = hasRouteReading
    ? " Ground-up read before each attempt: visualize the sequence from the bottom, identify the crux rest position, and decide clipping stance before you pull on."
    : " Take notes between attempts — track what changed on each burn.";

  return {
    warmup: `Easy route mileage at ${flashGrade(ctx.profile)} pace. Include clip drills and brisk mobility.`,
    mainWork: `2–3 quality burns on ${proj}.${readNote} Prioritize purposeful attempts over accumulated volume.`,
    cooldown: `Downclimb easy terrain rather than jumping. Finish with breathing reset and hip mobility.`,
    recoveryNotes: `Keep attempts purposeful — junk volume on a project adds fatigue without learning. One strong session beats three mediocre ones.`,
  };
}

function personalizeARC(ctx: PersonalizationContext): SessionContent {
  const flash = flashGrade(ctx.profile);
  const minutes = ctx.sessionDurationMinutes >= 40 ? "25–35" : "20–25";

  return {
    warmup: `Easy joint mobilization and 5 minutes of comfortable movement on large holds.`,
    mainWork: `${minutes} minutes continuous climbing at ${flash} minus 2 grades — you should be able to hold a conversation and breathe through your nose the entire time. Focus on smooth hips and silent feet.`,
    cooldown: `Light stretching and 500ml of water.`,
    recoveryNotes: `This session should finish feeling better than when it started. If you feel worse, the pace was too hard — back off next ARC session.`,
  };
}

function personalizeFingerStrength(ctx: PersonalizationContext, isYouthSubstituted: boolean): SessionContent {
  if (isYouthSubstituted) {
    return {
      warmup: `General movement warmup, forearm prep, easy hangs on large holds only.`,
      mainWork: `Submax grip positions on big holds, precise foot placements, and short movement drills on crimp terrain. Quality over resistance.`,
      cooldown: `Forearm flush, finger extensors, wrist mobility.`,
      recoveryNotes: `Finger loading was softened for youth safety. Quality movement on moderate terrain builds the same neural patterns with far less injury risk.`,
    };
  }

  const phase = ctx.mesocyclePhase;
  const sets = phase === "deload" ? "3" : phase === "realization" ? "6–8" : "4–6";
  const hangDuration = phase === "realization" ? "10 seconds" : "7–8 seconds";

  return {
    warmup: `General warmup, 10 minutes easy climbing, then progressive hangs starting at 60% bodyweight on a 20mm edge.`,
    mainWork: `${sets} maximal or near-maximal hangs on a ${phase === "realization" ? "18–20mm" : "20–22mm"} edge for ${hangDuration}, full rest (3+ minutes) between sets. Stop while each set feels crisp.`,
    cooldown: `Forearm flush hang (1 min light hang on a large hold), finger extensors, wrist mobility.`,
    recoveryNotes: `Stop immediately if fingers feel tweaky or tendons feel sharp. This session taxes the passive tissue — 48 hours minimum before the next finger-specific load.`,
  };
}

function personalizeRecruitmentPower(ctx: PersonalizationContext): SessionContent {
  const phase = ctx.mesocyclePhase;
  const efforts = phase === "deload" ? "4–5" : phase === "realization" ? "8–10" : "6–8";

  return {
    warmup: `Full body warmup — skip into dynamic movement only after fingers and shoulders are genuinely warm (15+ minutes).`,
    mainWork: `${efforts} maximal short efforts: explosive one- or two-move problems at ${projectGrade(ctx.profile)} or harder. Long rest (4–5 minutes). Stop when the snap fades — this should feel sharp, not grinding.`,
    cooldown: `Easy climbing and shoulder maintenance (band pull-aparts, serratus press).`,
    recoveryNotes: `This is neural, not metabolic — you should finish feeling snappy, not exhausted. If you're tired, the efforts weren't maximal.`,
  };
}

function personalizeTechniqueDrills(ctx: PersonalizationContext): SessionContent {
  const primaryFocus = ctx.primaryWeakness.focusAreas[0]?.toLowerCase() ?? "movement economy";
  const hasFeet = hasWeakness(ctx, "footwork");
  const hasPace = hasWeakness(ctx, "technique");

  const drillFocus = hasFeet
    ? "silent feet (no readjust), pause-at-hold drills, and deliberate hip placement"
    : hasPace
    ? "clipping efficiency, straight-arm positioning, and hip-to-wall distance"
    : `specific ${primaryFocus} patterns`;

  return {
    warmup: `Easy mileage for 10 minutes with a silent-feet constraint. No readjusting footholds — make the placement and commit.`,
    mainWork: `Deliberate drill sets around ${drillFocus} on moderate terrain (${flashGrade(ctx.profile)} minus 1–2 grades). Film one or two attempts if possible to review positioning.`,
    cooldown: `Easy mobility and breathing reset. Light ARC if time allows.`,
    recoveryNotes: `This is skill work, not fitness work — fatigue degrades the quality of movement patterns, so keep the intensity controlled.`,
  };
}

function personalizeFootworkDrills(ctx: PersonalizationContext): SessionContent {
  return {
    warmup: `Ankle mobility circles and 5 minutes on slab or vertical terrain with deliberate foot placement.`,
    mainWork: `Silent-feet progression (no readjust), then pause drills (pause 2 seconds on each foothold), then center-of-mass awareness on ${flashGrade(ctx.profile)} minus 2 grades. Film one traverse if possible.`,
    cooldown: `Calf stretches, hip flexor, and spinal rotation.`,
    recoveryNotes: `Keep this crisp and controlled. Fatigue ruins footwork precision — stop the drill when quality drops.`,
  };
}

function personalizeMobility(ctx: PersonalizationContext): SessionContent {
  const hasMobility = hasWeakness(ctx, "mobility");
  const mobilityNote = hasMobility
    ? " Hip flexors and thoracic mobility are flagged as limiters — prioritize those areas."
    : "";

  return {
    warmup: `Light pulse raiser (5 minutes easy movement), joint prep, and one easy hang or wall-touch set just to wake the body up.`,
    mainWork: `Shoulders, thoracic mobility, hips, calves, and forearm maintenance.${mobilityNote} Spend 3–4 minutes on each area rather than rushing through. Finish with a few controlled climbing-specific ranges like high-steps, drop-knees, and scap pulls if available.`,
    cooldown: `Nasal breathing, legs up or easy walking, and progressive downshift. Avoid any aggressive stretching.`,
    recoveryNotes: `Aim to leave feeling looser, not stretched out aggressively. Forced range gains don't stick without warmth.`,
  };
}

function personalizeAntagonist(ctx: PersonalizationContext): SessionContent {
  const phase = ctx.mesocyclePhase;
  const load = phase === "deload" ? "light" : phase === "realization" ? "moderate-to-heavy" : "moderate";

  return {
    warmup: `Band work, scap pulls, wrist prep, and 5 minutes of easy movement. Start with pull-aparts, face pulls, and serratus activation before loading anything heavy.`,
    mainWork: `Strength block at ${load} load: 1 push pattern, 1 row or scapular control movement, rotator cuff work, posterior chain, and a short core finisher. Stay in the 6–12 rep range for the main lifts and 10–15 reps for prehab work.`,
    cooldown: `Shoulder mobility, forearm extensors, and trunk reset.`,
    recoveryNotes: `This should make you stronger and harder to break, not too smoked to climb well tomorrow. Leave 1–3 reps in reserve on every set.`,
  };
}

function personalizeCore(ctx: PersonalizationContext): SessionContent {
  const phase = ctx.mesocyclePhase;
  const volume = phase === "deload" ? "2 sets" : "3 sets";

  return {
    warmup: `Trunk activation — dead bugs and spinal prep.`,
    mainWork: `${volume} each: hollow body holds (20–30 sec), anti-rotation (Pallof press or equivalent), hanging knee raises, and body-tension intervals on the wall. If you have extra time, pair these with one push and one posterior-chain strength movement for a fuller support session.`,
    cooldown: `Hip flexor stretch and trunk reset (child's pose, spinal rotation).`,
    recoveryNotes: `Core is support work, not max-test territory. Keep quality high and stop a set when form breaks.`,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Static sessions (no meaningful personalization benefit)
// ──────────────────────────────────────────────────────────────────────────────

function personalizeActiveRecovery(): SessionContent {
  return {
    warmup: "Gentle walk, easy bike, or 5-10 minutes of very easy movement to get blood moving.",
    mainWork: "20-30 minutes of easy circulation, mobility, tissue care, and light climbing-specific movement only if it feels restorative. Think recovery walk, bike, mobility flow, forearm flush, and easy shoulder care. No hard climbing load.",
    cooldown: "Breathing reset, hydration, and a short downshift away from screens if possible.",
    recoveryNotes: "Treat this as genuine recovery, not sneaky volume. You should finish fresher than you started.",
  };
}

function personalizeFullRest(): SessionContent {
  return {
    warmup: "None.",
    mainWork: "No formal training. Prioritize food, hydration, school/work balance, and sleep.",
    cooldown: "Optional easy walk only.",
    recoveryNotes: "Rest is part of the plan, not a missed workout.",
  };
}

function personalizeTeamPractice(): SessionContent {
  return {
    warmup: "Use the structured team warmup and add any personal finger or shoulder prep you need beforehand.",
    mainWork: "Treat the team session as real training load. Engage with every drill and attempt.",
    cooldown: "Flush forearms, refuel, and note what kind of load the session created.",
    recoveryNotes: "Avoid bolting on extra intensity after practice unless the day was specifically planned for it.",
  };
}

function personalizeCompetition(): SessionContent {
  return {
    warmup: "Competition-specific warmup: progressive activation, confidence climbs, and mental reset.",
    mainWork: "Comp execution, active recovery between rounds, and purposeful pacing.",
    cooldown: "Walk, eat, rehydrate, and downshift mentally. No extra training today.",
    recoveryNotes: "No additional training. Focus on recovery — you earned it.",
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Main dispatch
// ──────────────────────────────────────────────────────────────────────────────

export function personalizeSession(
  sessionType: SessionType,
  ctx: PersonalizationContext,
  isYouthFingerSubstituted = false,
): SessionContent {
  switch (sessionType) {
    case SessionType.LEAD_ENDURANCE:
      return personalizeLeadEndurance(ctx);
    case SessionType.POWER_ENDURANCE:
      return personalizePowerEndurance(ctx);
    case SessionType.LIMIT_BOULDERING:
      return personalizeLimitBouldering(ctx);
    case SessionType.PROJECTING:
      return personalizeProjecting(ctx);
    case SessionType.ARC:
      return personalizeARC(ctx);
    case SessionType.FINGER_STRENGTH:
      return personalizeFingerStrength(ctx, isYouthFingerSubstituted);
    case SessionType.RECRUITMENT_POWER:
      return personalizeRecruitmentPower(ctx);
    case SessionType.TECHNIQUE_DRILLS:
      return personalizeTechniqueDrills(ctx);
    case SessionType.FOOTWORK_DRILLS:
      return personalizeFootworkDrills(ctx);
    case SessionType.MOBILITY:
      return personalizeMobility(ctx);
    case SessionType.ANTAGONIST_STRENGTH:
      return personalizeAntagonist(ctx);
    case SessionType.CORE:
      return personalizeCore(ctx);
    case SessionType.ACTIVE_RECOVERY:
      return personalizeActiveRecovery();
    case SessionType.FULL_REST:
      return personalizeFullRest();
    case SessionType.TEAM_PRACTICE:
      return personalizeTeamPractice();
    case SessionType.COMPETITION:
      return personalizeCompetition();
    default:
      return personalizeActiveRecovery();
  }
}
