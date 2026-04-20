import { ScheduleConstraint } from "@prisma/client";

export type RecoveryBand = "green" | "yellow" | "red";

export function getRecoveryBand(
  schedule: Pick<
    ScheduleConstraint,
    "recoveryScore" | "sleepScore" | "dayStrain" | "sorenessLevel" | "skinQuality" | "recentClimbingDays" | "energyLevel" | "fatigueLevel"
  >,
) {
  const recovery = schedule.recoveryScore ?? 60;
  const sleep = schedule.sleepScore ?? 70;
  const strainPenalty = schedule.dayStrain ? Math.max(0, schedule.dayStrain - 12) * 2 : 0;
  const sorenessPenalty = schedule.sorenessLevel ? schedule.sorenessLevel * 3 : 0;
  const skinPenalty = schedule.skinQuality ? Math.max(0, 8 - schedule.skinQuality) * 4 : 0;
  const climbingDaysPenalty = schedule.recentClimbingDays ? Math.max(0, schedule.recentClimbingDays - 2) * 4 : 0;
  const energyBoost = schedule.energyLevel ? (schedule.energyLevel - 5) * 4 : 0;
  const fatiguePenalty = schedule.fatigueLevel * 2;

  const composite = Math.round(
    recovery * 0.34 +
      sleep * 0.2 +
      energyBoost -
      strainPenalty -
      sorenessPenalty -
      skinPenalty -
      climbingDaysPenalty -
      fatiguePenalty +
      32,
  );

  if (composite >= 67) return { band: "green" as RecoveryBand, score: Math.min(100, composite) };
  if (composite >= 40) return { band: "yellow" as RecoveryBand, score: Math.min(100, Math.max(0, composite)) };
  return { band: "red" as RecoveryBand, score: Math.max(0, composite) };
}

export function recoveryLabel(band: RecoveryBand) {
  if (band === "green") return "Recovered";
  if (band === "yellow") return "Manage load";
  return "Back off";
}

export function recoveryClass(band: RecoveryBand) {
  if (band === "green") return "bg-moss/20 text-pine border border-moss/25";
  if (band === "yellow") return "bg-sandstone/40 text-ink border border-sandstone";
  return "bg-clay/15 text-clay border border-clay/30";
}
