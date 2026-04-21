import { IntensityLevel, SessionType } from "@prisma/client";

type SessionCoachInput = {
  sessionType: SessionType;
  intensity: IntensityLevel;
  durationMinutes: number;
  loadScore: number;
};

export type SessionCoachSummary = {
  goal: string;
  effort: string;
  pacing: string;
  win: string;
};

function effortLabel(intensity: IntensityLevel) {
  switch (intensity) {
    case IntensityLevel.LOW:
      return "easy and controlled";
    case IntensityLevel.MODERATE:
      return "steady but not draining";
    case IntensityLevel.HIGH:
      return "high quality and intentional";
    case IntensityLevel.PEAK:
      return "competition-level sharpness";
    default:
      return "controlled";
  }
}

export function buildSessionCoachSummary(input: SessionCoachInput): SessionCoachSummary {
  const baseEffort = `${effortLabel(input.intensity)} for about ${input.durationMinutes} minutes`;

  switch (input.sessionType) {
    case SessionType.LEAD_ENDURANCE:
      return {
        goal: "Build route endurance without turning the whole session into survival climbing.",
        effort: baseEffort,
        pacing: "Start smooth, shake before you feel desperate, and keep the clip positions composed.",
        win: "You finish the work sets with useful movement quality still intact.",
      };
    case SessionType.POWER_ENDURANCE:
      return {
        goal: "Hold high output for longer without losing shape.",
        effort: baseEffort,
        pacing: "Treat each circuit like a quality effort. Rest enough to climb well, not enough to feel totally fresh.",
        win: "The last hard efforts still look like real climbing, not panic mode.",
      };
    case SessionType.LIMIT_BOULDERING:
    case SessionType.RECRUITMENT_POWER:
      return {
        goal: "Train snap, commitment, and quality attempts.",
        effort: baseEffort,
        pacing: "Take long rests and keep each attempt honest. Stop when the pop disappears.",
        win: "A few excellent attempts with real power are better than lots of tired tries.",
      };
    case SessionType.PROJECTING:
      return {
        goal: "Learn the climb and improve execution, not just pile up burns.",
        effort: baseEffort,
        pacing: "Take notes between attempts and make each go feel purposeful.",
        win: "You leave with better beta, better pacing, or one key sequence more dialed.",
      };
    case SessionType.TECHNIQUE_DRILLS:
    case SessionType.FOOTWORK_DRILLS:
      return {
        goal: "Clean up movement quality and make better habits automatic.",
        effort: baseEffort,
        pacing: "Stay below the point where fatigue makes you sloppy.",
        win: "The movement looks quieter, calmer, and more repeatable by the end.",
      };
    case SessionType.FINGER_STRENGTH:
      return {
        goal: "Load the fingers with quality, not junk fatigue.",
        effort: baseEffort,
        pacing: "Full rest between hard sets. Stop immediately if anything feels tweaky.",
        win: "Every hard hang still feels crisp and controlled.",
      };
    case SessionType.ARC:
      return {
        goal: "Build easy aerobic support and recover while moving.",
        effort: baseEffort,
        pacing: "You should be able to talk normally and keep the forearms calm.",
        win: "You finish feeling better warmed up, not cooked.",
      };
    case SessionType.ACTIVE_RECOVERY:
      return {
        goal: "Recover well enough that the next hard day can actually be high quality.",
        effort: baseEffort,
        pacing: "Keep it genuinely light. Do not sneak in extra work.",
        win: "You leave feeling looser, fresher, and less beat up.",
      };
    case SessionType.MOBILITY:
      return {
        goal: "Restore usable range of motion and loosen the areas that are limiting climbing quality.",
        effort: baseEffort,
        pacing: "Move slowly enough to actually improve positions, not just rush through a checklist.",
        win: "You leave moving better and feeling less blocked in key climbing positions.",
      };
    case SessionType.FULL_REST:
      return {
        goal: "Absorb the work you have already done.",
        effort: baseEffort,
        pacing: "Do less than you think you want to do.",
        win: "You feel more ready for tomorrow instead of proud that you did extra.",
      };
    case SessionType.TEAM_PRACTICE:
      return {
        goal: "Use practice as real training load, not background noise.",
        effort: baseEffort,
        pacing: "Pay attention to what kind of fatigue the session creates so tomorrow can adjust if needed.",
        win: "You get high-quality tries without adding unnecessary extra volume after.",
      };
    case SessionType.ANTAGONIST_STRENGTH:
      return {
        goal: "Build strength and durability that supports climbing instead of competing with it.",
        effort: baseEffort,
        pacing: "Lift cleanly, leave a little in reserve, and avoid turning this into a fatigue contest.",
        win: "You finish feeling stronger and more stable, not wrecked for your next climbing day.",
      };
    case SessionType.CORE:
      return {
        goal: "Build the body tension and trunk control that hold harder positions together.",
        effort: baseEffort,
        pacing: "Keep reps clean and leave a little in reserve.",
        win: "You finish feeling worked but not trashed for the next climbing day.",
      };
    case SessionType.COMPETITION:
      return {
        goal: "Execute well and protect energy between efforts.",
        effort: baseEffort,
        pacing: "Stay calm between rounds and keep the warmup specific.",
        win: "Decision-making and execution stay sharp when it matters.",
      };
    default:
      return {
        goal: "Get the intended adaptation without adding junk fatigue.",
        effort: baseEffort,
        pacing: "Stay controlled and honest about how good the work quality is.",
        win: "The session feels like useful training, not random volume.",
      };
  }
}
