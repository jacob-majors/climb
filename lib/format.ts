import { IntensityLevel, SessionType } from "@prisma/client";
import { format } from "date-fns";

export const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function formatDate(date: Date) {
  return format(date, "MMM d, yyyy");
}

export function parseLocalDateInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const [, year, month, day] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
}

export function toDateInputValue(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return format(value, "yyyy-MM-dd");
}

export function formatSessionType(type: SessionType) {
  return type
    .toLowerCase()
    .split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

export function intensityLabel(intensity: IntensityLevel) {
  switch (intensity) {
    case IntensityLevel.LOW:
      return "Low";
    case IntensityLevel.MODERATE:
      return "Moderate";
    case IntensityLevel.HIGH:
      return "High";
    case IntensityLevel.PEAK:
      return "Peak";
    default:
      return intensity;
  }
}

export function intensityClass(intensity: IntensityLevel) {
  switch (intensity) {
    case IntensityLevel.LOW:
      return "bg-mist text-pine";
    case IntensityLevel.MODERATE:
      return "bg-sandstone/60 text-ink";
    case IntensityLevel.HIGH:
      return "bg-clay/20 text-clay";
    case IntensityLevel.PEAK:
      return "bg-ink text-chalk";
    default:
      return "bg-mist text-ink";
  }
}
