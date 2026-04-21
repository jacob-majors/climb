"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ClimbType, GradeScale } from "@prisma/client";
import { saveRouteEntryAction } from "@/app/actions";
import type { ClimbAnalysis } from "@/app/api/analyze-climb/route";
import { SessionsGymMap } from "@/components/sessions-gym-map";
import { getSessionsZoneLabel, SESSIONS_GYM_NAME, type SessionsZoneId } from "@/lib/sessions-map";

const ROUTE_COLORS = [
  { name: "Red", hex: "#ef4444" },
  { name: "Blue", hex: "#3b82f6" },
  { name: "Green", hex: "#22c55e" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Orange", hex: "#f97316" },
  { name: "Purple", hex: "#a855f7" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Black", hex: "#111827" },
  { name: "White", hex: "#f8fafc", border: true },
  { name: "Gray", hex: "#94a3b8" },
  { name: "Brown", hex: "#92400e" },
  { name: "Teal", hex: "#14b8a6" },
  { name: "Lime", hex: "#84cc16" },
  { name: "Navy", hex: "#1e3a5f" },
  { name: "Maroon", hex: "#7f1d1d" },
  { name: "Coral", hex: "#fb7185" },
  { name: "Gold", hex: "#f59e0b" },
  { name: "Silver", hex: "#94a3b8" },
] as const;

type RouteColor = (typeof ROUTE_COLORS)[number];

function GymOptionLogo({ kind }: { kind: "sessions" | "other" }) {
  if (kind === "sessions") {
    return (
      <div className="inline-flex items-center rounded-2xl border border-ink/10 bg-white px-3 py-2 shadow-sm">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-white">
          <Image
            src="https://1climb.org/wp-content/uploads/2019/09/session-climbing-gym-grayscale-logo.png"
            alt="Sessions Climbing"
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
            unoptimized
          />
        </div>
        <div className="ml-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink/45">Gym</p>
          <p className="text-sm font-black uppercase tracking-[0.12em] text-ink">Sessions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center rounded-2xl border border-ink/10 bg-white px-3 py-2 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sandstone/35 text-lg">
        🧗
      </div>
      <div className="ml-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-ink/45">Gym</p>
        <p className="text-sm font-black uppercase tracking-[0.12em] text-ink">Other</p>
      </div>
    </div>
  );
}

const YDS_GRADES = [
  "5.5","5.6","5.7","5.8","5.9",
  "5.10a","5.10b","5.10c","5.10d",
  "5.11a","5.11b","5.11c","5.11d",
  "5.12a","5.12b","5.12c","5.12d",
  "5.13a","5.13b","5.13c","5.13d",
  "5.14a","5.14b","5.14c","5.14d",
  "5.15a","5.15b","5.15c","5.15d",
] as const;

const V_SCALE_GRADES = [
  "V0","V1","V2","V3","V4","V5","V6","V7","V8",
  "V9","V10","V11","V12","V13","V14","V15","V16","V17",
] as const;

const WALL_ANGLES = ["Slab", "Vertical", "Slight overhang", "Steep overhang", "Cave / Roof"] as const;
const WALL_HEIGHTS = ["Under 5m", "5-10m", "10-20m", "20-35m", "35m+ / Multi-pitch"] as const;

const HOLD_TYPES = [
  "Crimps",
  "Slopers",
  "Pinches",
  "Pockets",
  "Jugs",
  "Underclings",
  "Sidepulls",
  "Gastons",
  "Volumes",
  "Edges",
  "Palming",
  "Monos",
];

const MOVEMENT_STYLES = [
  "Static & precise",
  "Dynamic & powerful",
  "Technical footwork",
  "Power endurance",
  "Compression",
  "Balancy / slab",
  "Sustained crimping",
  "Campus / upper body",
  "Coordination moves",
];

const STRONG_OPTIONS = [
  "Footwork",
  "Body positioning",
  "Reading moves",
  "Hip placement",
  "Lock-offs",
  "Dynamic reaches",
  "Mental composure",
  "Endurance",
  "Explosive power",
  "Breathing / resting",
  "Clipping",
  "Flow",
];

const WEAK_OPTIONS = [
  "Finger strength",
  "Lock-offs",
  "Footwork precision",
  "Hip flexibility",
  "Endurance / pump",
  "Commitment",
  "Body tension",
  "Reading moves",
  "Shoulder strength",
  "Accuracy on small holds",
  "Skin",
  "Core tension",
];

const STYLE_TAGS = [
  "Overhang",
  "Slab",
  "Vertical",
  "Cave",
  "Roof",
  "Crimpy",
  "Slopey",
  "Pinchy",
  "Jugy",
  "Pockets",
  "Gastons",
  "Underclings",
  "Sidepulls",
  "Dynamic",
  "Static",
  "Powerful",
  "Technical",
  "Balancy",
  "Compression",
  "Mantling",
  "High-step",
  "Heel hook",
  "Toe hook",
  "Drop knee",
  "Flag",
  "Cross-through",
  "Deadpoint",
  "Campus",
  "Pump",
  "Power endurance",
  "Sustained",
  "Bouldery",
  "Thin",
  "Polished",
  "Mental",
  "Committing",
  "Exposure",
  "Runout",
];

type DetailLevel = "quick" | "standard" | "deep";

type StepId =
  | "venue"
  | "gym"
  | "type"
  | "sessionsRoute"
  | "name"
  | "grade"
  | "detail"
  | "angle"
  | "height"
  | "holds"
  | "movement"
  | "pump"
  | "crux"
  | "confidence"
  | "style"
  | "strong"
  | "weak"
  | "notes"
  | "video";

const STEP_LABELS: Record<StepId, string> = {
  venue: "Where",
  gym: "Gym",
  type: "Type",
  sessionsRoute: "Zone",
  name: "Color",
  grade: "Grade",
  detail: "Depth",
  angle: "Angle",
  height: "Height",
  holds: "Holds",
  movement: "Movement",
  pump: "Pump",
  crux: "Crux",
  confidence: "Feel",
  style: "Style",
  strong: "Strengths",
  weak: "Weaknesses",
  notes: "Notes",
  video: "Video",
};

type RouteWizardSharedRoute = {
  id: string;
  gymZoneId: string;
  gymZoneLabel: string;
  title: string;
  grade: string;
  gradeScale: GradeScale;
  climbType: ClimbType;
  environment: string;
  wallAngle: string | null;
  wallHeight: string | null;
  holdTypes: string | null;
  movementType: string | null;
  styleTags: string | null;
  notes: string | null;
  routeCount: number;
  submittedBy: string | null;
};

type WizardData = {
  title: string;
  grade: string;
  gradeScale: GradeScale;
  climbType: ClimbType;
  environment: "" | "Indoor" | "Outdoor" | string;
  wallAngle: string;
  wallHeight: string;
  holdTypes: string[];
  movementType: string;
  pumpLevel: number;
  cruxDifficulty: number;
  confidenceLevel: number;
  styleTags: string[];
  feltStrong: string[];
  feltWeak: string[];
  notes: string;
  mainChallenges: string;
  weaknessSummary: string;
  isSessions: boolean | null;
  gymName: string;
  gymZoneId: SessionsZoneId | "";
  gymZoneLabel: string;
  gymRouteId: string;
  detailLevel: DetailLevel;
};

type SessionPrefill = {
  sourceSessionId: string;
  sourceSessionTitle: string;
  sourceSessionType: string;
  sourceDay: string;
  sourceStart: string;
  sourceEnd: string;
  sourceWindow: string;
  sourceCompletedAt: string;
};

const defaultData: WizardData = {
  title: "",
  grade: "",
  gradeScale: GradeScale.YDS,
  climbType: ClimbType.ROUTE,
  environment: "",
  wallAngle: "",
  wallHeight: "",
  holdTypes: [],
  movementType: "",
  pumpLevel: 5,
  cruxDifficulty: 5,
  confidenceLevel: 5,
  styleTags: [],
  feltStrong: [],
  feltWeak: [],
  notes: "",
  mainChallenges: "",
  weaknessSummary: "",
  isSessions: null,
  gymName: "",
  gymZoneId: "",
  gymZoneLabel: "",
  gymRouteId: "",
  detailLevel: "standard",
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function parseStyleTags(raw: string | null | undefined) {
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as string[]).filter(Boolean);
  } catch {
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
}

function parseCommaList(raw: string | null | undefined) {
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function extractFrames(file: File, count = 6): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      reject(new Error("No canvas context"));
      return;
    }

    const frames: string[] = [];
    let current = 0;

    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      const width = Math.min(video.videoWidth, 640);
      canvas.width = width;
      canvas.height = Math.round((width / video.videoWidth) * video.videoHeight);

      function seek() {
        video.currentTime = (video.duration / (count + 1)) * (current + 1);
      }

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL("image/jpeg", 0.72).split(",")[1]);
        current += 1;

        if (current < count) {
          seek();
          return;
        }

        URL.revokeObjectURL(video.src);
        resolve(frames);
      };

      seek();
    };

    video.onerror = reject;
  });
}

function ChipGrid({
  options,
  selected,
  onToggle,
  single = false,
}: {
  options: readonly string[];
  selected: string | string[];
  onToggle: (value: string) => void;
  single?: boolean;
}) {
  const isSelected = (value: string) =>
    single ? selected === value : (selected as string[]).includes(value);

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onToggle(option)}
          className={`rounded-full border px-3.5 py-2 text-sm font-medium transition-all active:scale-95 ${
            isSelected(option)
              ? "border-pine bg-pine text-chalk"
              : "border-ink/10 bg-white text-ink/70 hover:border-pine/40"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function ScalePicker({
  value,
  onChange,
  low,
  high,
}: {
  value: number;
  onChange: (value: number) => void;
  low: string;
  high: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap justify-center gap-2">
        {Array.from({ length: 10 }, (_, index) => index + 1).map((number) => (
          <button
            key={number}
            type="button"
            onClick={() => onChange(number)}
            className={`h-12 w-12 rounded-full text-sm font-semibold transition-all active:scale-95 ${
              number === value
                ? "scale-110 bg-pine text-chalk shadow-md"
                : number < value
                  ? "bg-pine/20 text-pine"
                  : "bg-ink/6 text-ink/50 hover:bg-ink/12"
            }`}
          >
            {number}
          </button>
        ))}
      </div>
      <div className="flex justify-between px-1 text-xs text-ink/40">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

function getSteps(data: WizardData): StepId[] {
  const steps: StepId[] = ["venue"];

  if (data.environment === "Indoor") {
    steps.push("gym");
  }

  if (data.environment) {
    steps.push("type");
  }

  if (data.isSessions && data.environment === "Indoor" && data.climbType) {
    steps.push("sessionsRoute");
  }

  if (!data.gymRouteId && data.environment) {
    steps.push("name", "grade");
  }

  steps.push("detail");

  if (data.detailLevel !== "quick") {
    steps.push("holds", "movement");
  }

  if (data.detailLevel === "deep") {
    steps.push("angle");
    if (!(data.isSessions && data.climbType === ClimbType.ROUTE)) {
      steps.push("height");
    }
    steps.push("style");
  }

  steps.push("pump", "crux", "confidence", "strong", "weak", "notes");

  if (data.detailLevel === "deep") {
    steps.push("video");
  }

  return steps;
}

function stepQuestion(step: StepId, data: WizardData) {
  switch (step) {
    case "venue":
      return "Inside or outside?";
    case "gym":
      return "Which gym?";
    case "type":
      return data.isSessions ? "Ropes or boulder?" : "Boulder or route?";
    case "sessionsRoute":
      return "Which zone did you climb in?";
    case "name":
      return "What color is the route?";
    case "grade":
      return "What was the grade?";
    case "detail":
      return "How much detail do you want to add today?";
    case "angle":
      return "What was the wall angle?";
    case "height":
      return "How tall was the wall?";
    case "holds":
      return "What hold types were on it?";
    case "movement":
      return "What was the movement style?";
    case "pump":
      return "How pumped did you get?";
    case "crux":
      return "How hard was the crux?";
    case "confidence":
      return "How confident did you feel?";
    case "style":
      return "Tag the style of the climb";
    case "strong":
      return "What felt strong?";
    case "weak":
      return "What felt weak or limited you?";
    case "notes":
      return "Any other notes?";
    case "video":
      return "Add a video for AI analysis";
  }
}

function angleEmoji(angle: string) {
  if (angle.includes("Slab")) return "↗";
  if (angle.includes("Vertical")) return "↑";
  if (angle.includes("Slight")) return "↖";
  if (angle.includes("Steep")) return "⬅";
  return "↙";
}

function detailLabel(level: DetailLevel) {
  if (level === "quick") return "Fast log";
  if (level === "deep") return "Full breakdown";
  return "Standard log";
}

function buildSessionNote(prefill?: SessionPrefill) {
  if (!prefill?.sourceSessionTitle) return "";

  const parts = [
    prefill.sourceSessionTitle,
    prefill.sourceWindow || "",
    prefill.sourceStart && prefill.sourceEnd ? `${prefill.sourceStart}-${prefill.sourceEnd}` : "",
  ].filter(Boolean);

  return `Logged after ${parts.join(" • ")}`;
}

export function RouteWizard({
  sessionsRoutes,
  sessionPrefill,
}: {
  sessionsRoutes: RouteWizardSharedRoute[];
  sessionPrefill?: SessionPrefill;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<WizardData>(() => ({
    ...defaultData,
    notes: buildSessionNote(sessionPrefill),
  }));
  const [colorTags, setColorTags] = useState<string[]>([]);
  const [colorInput, setColorInput] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [animKey, setAnimKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const steps = getSteps(data);
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const isDone = stepIndex >= steps.length;
  const progress = steps.length === 0 ? 0 : (stepIndex / steps.length) * 100;

  const zoneCounts = useMemo(() => {
    return sessionsRoutes.reduce<Partial<Record<SessionsZoneId, number>>>((counts, route) => {
      const zoneId = route.gymZoneId as SessionsZoneId;
      counts[zoneId] = (counts[zoneId] ?? 0) + 1;
      return counts;
    }, {});
  }, [sessionsRoutes]);

  const routesInZone = useMemo(
    () => sessionsRoutes.filter((route) => route.gymZoneId === data.gymZoneId),
    [data.gymZoneId, sessionsRoutes],
  );

  const selectedSharedRoute = useMemo(
    () => sessionsRoutes.find((route) => route.id === data.gymRouteId) ?? null,
    [data.gymRouteId, sessionsRoutes],
  );

  const colorSuggestion: RouteColor | null = colorInput.trim()
    ? ROUTE_COLORS.find((color) => normalize(color.name).startsWith(normalize(colorInput))) ?? null
    : null;

  function setField<Key extends keyof WizardData>(key: Key, value: WizardData[Key]) {
    setData((current) => ({ ...current, [key]: value }));
  }

  function resetRouteIdentity() {
    setColorTags([]);
    setColorInput("");
    setData((current) => ({
      ...current,
      gymRouteId: "",
      title: "",
      grade: "",
      gradeScale: GradeScale.YDS,
      climbType: ClimbType.ROUTE,
      wallAngle: "",
      wallHeight: "",
      holdTypes: [],
      movementType: "",
      styleTags: [],
    }));
  }

  function syncTitle(tags: string[]) {
    setColorTags(tags);
    setData((current) => ({ ...current, title: tags.join(" / ") }));
  }

  function addColorTag(name: string) {
    if (colorTags.includes(name)) return;
    syncTitle([...colorTags, name]);
    setColorInput("");
  }

  function removeColorTag(name: string) {
    syncTitle(colorTags.filter((tag) => tag !== name));
  }

  function toggleMulti(key: "holdTypes" | "styleTags" | "feltStrong" | "feltWeak", value: string) {
    setData((current) => {
      const currentValues = current[key] as string[];
      return {
        ...current,
        [key]: currentValues.includes(value)
          ? currentValues.filter((item) => item !== value)
          : [...currentValues, value],
      };
    });
  }

  function advance() {
    setAnimKey((current) => current + 1);
    setStepIndex((current) => current + 1);
  }

  function back() {
    setAnimKey((current) => current + 1);
    setStepIndex((current) => Math.max(current - 1, 0));
  }

  function chooseEnvironment(environment: "Indoor" | "Outdoor") {
    setColorTags([]);
    setColorInput("");
    setData({
      ...defaultData,
      environment,
      isSessions: environment === "Outdoor" ? false : null,
      gymName: "",
      gradeScale: environment === "Outdoor" ? GradeScale.YDS : GradeScale.YDS,
    });
    setStepIndex(1);
    setAnimKey((current) => current + 1);
  }

  function chooseGym(isSessions: boolean) {
    setColorTags([]);
    setColorInput("");
    setData((current) => ({
      ...current,
      isSessions,
      gymName: isSessions ? SESSIONS_GYM_NAME : "",
      gymZoneId: "",
      gymZoneLabel: "",
      gymRouteId: "",
      title: "",
      grade: "",
      gradeScale: current.climbType === ClimbType.BOULDER ? GradeScale.V_SCALE : GradeScale.YDS,
    }));
    setStepIndex(2);
    setAnimKey((current) => current + 1);
  }

  function chooseZone(zoneId: SessionsZoneId) {
    resetRouteIdentity();
    setData((current) => ({
      ...current,
      gymName: SESSIONS_GYM_NAME,
      gymZoneId: zoneId,
      gymZoneLabel: getSessionsZoneLabel(zoneId) ?? zoneId,
      environment: "Indoor",
    }));
  }

  function startNewRouteFromZone() {
    resetRouteIdentity();
    setData((current) => ({
      ...current,
      gymName: SESSIONS_GYM_NAME,
      gymZoneId: current.gymZoneId,
      gymZoneLabel: getSessionsZoneLabel(current.gymZoneId) ?? current.gymZoneLabel,
      environment: "Indoor",
    }));
    advance();
  }

  function chooseSharedRoute(route: RouteWizardSharedRoute) {
    setColorTags([]);
    setColorInput("");
    setData((current) => ({
      ...current,
      gymName: SESSIONS_GYM_NAME,
      gymZoneId: route.gymZoneId as SessionsZoneId,
      gymZoneLabel: route.gymZoneLabel,
      gymRouteId: route.id,
      title: route.title,
      grade: route.grade,
      gradeScale: route.gradeScale,
      climbType: route.climbType,
      environment: route.environment,
      wallAngle: route.wallAngle ?? "",
      wallHeight: route.wallHeight ?? "",
      holdTypes: parseCommaList(route.holdTypes),
      movementType: route.movementType ?? "",
      styleTags: parseStyleTags(route.styleTags),
    }));
    advance();
  }

  function chooseClimbType(type: ClimbType) {
    setData((current) => ({
      ...current,
      climbType: type,
      grade: current.gymRouteId ? current.grade : "",
      gradeScale: type === ClimbType.BOULDER ? GradeScale.V_SCALE : GradeScale.YDS,
    }));
    advance();
  }

  async function analyzeVideo(file: File) {
    setAnalyzing(true);
    setAnalyzeError(null);

    try {
      const frames = await extractFrames(file, 6);
      const response = await fetch("/api/analyze-climb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const analysis = (await response.json()) as ClimbAnalysis;

      setData((current) => ({
        ...current,
        movementType: analysis.movementType || current.movementType,
        holdTypes: analysis.holdTypes ? parseCommaList(analysis.holdTypes) : current.holdTypes,
        styleTags: analysis.styleTags?.length ? analysis.styleTags : current.styleTags,
        feltStrong: analysis.feltStrong ? [analysis.feltStrong] : current.feltStrong,
        feltWeak: analysis.feltWeak ? [analysis.feltWeak] : current.feltWeak,
        mainChallenges: analysis.mainChallenges || current.mainChallenges,
        weaknessSummary: analysis.weaknessSummary || current.weaknessSummary,
      }));

      setVideoReady(true);
    } catch {
      setAnalyzeError("Analysis failed. You can still save the climb manually.");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleSubmit() {
    const formData = new FormData();
    formData.append("gymRouteId", data.gymRouteId);
    formData.append("gymName", data.gymName);
    formData.append("gymZoneId", data.gymZoneId);
    formData.append("gymZoneLabel", data.gymZoneLabel);
    formData.append("title", data.title);
    formData.append("grade", data.grade);
    formData.append("gradeScale", data.gradeScale);
    formData.append("climbType", data.climbType);
    formData.append("environment", data.environment);
    formData.append("wallAngle", data.wallAngle);
    formData.append("wallHeight", data.wallHeight);
    formData.append("holdTypes", data.holdTypes.join(", ") || "Not specified");
    formData.append("movementType", data.movementType || "Not specified");
    formData.append("pumpLevel", String(data.pumpLevel));
    formData.append("cruxDifficulty", String(data.cruxDifficulty));
    formData.append("confidenceLevel", String(data.confidenceLevel));
    formData.append("styleTags", JSON.stringify(data.styleTags));
    formData.append("feltStrong", data.feltStrong.join(", ") || "Not specified");
    formData.append("feltWeak", data.feltWeak.join(", ") || "Not specified");
    formData.append("mainChallenges", data.mainChallenges || data.notes || "Not specified");
    formData.append("fallReason", data.notes || "Not specified");
    formData.append("weaknessSummary", data.weaknessSummary);
    formData.append("freeText", data.notes);

    startTransition(() => {
      saveRouteEntryAction(formData);
    });
  }

  const chips: string[] = [];
  if (data.gymZoneLabel) chips.push(data.gymZoneLabel);
  if (data.title.trim()) chips.push(data.title);
  if (data.grade.trim()) chips.push(`${data.grade} ${data.gradeScale.replace(/_/g, " ")}`);
  if (data.gymRouteId) chips.push("Shared route");
  if (data.isSessions === false) chips.push(data.environment);
  if (data.detailLevel) chips.push(detailLabel(data.detailLevel));
  if (data.movementType) chips.push(data.movementType.split(" ")[0]);
  if (data.pumpLevel) chips.push(`Pump ${data.pumpLevel}`);

  const gradeOptions = data.climbType === ClimbType.BOULDER ? V_SCALE_GRADES : YDS_GRADES;

  useEffect(() => {
    const note = buildSessionNote(sessionPrefill);
    if (!note) return;
    setData((current) => (current.notes ? current : { ...current, notes: note }));
  }, [sessionPrefill]);

  const canNext = (() => {
    if (!currentStep) return false;
    switch (currentStep) {
      case "grade":
        return data.grade.trim().length > 0;
      default:
        return true;
    }
  })();

  const showNextButton = currentStep ? ["holds", "style", "strong", "weak", "notes"].includes(currentStep) : false;

  if (isDone) {
    return (
      <div className="animate-slide-up space-y-4">
        {sessionPrefill?.sourceSessionTitle && (
          <div className="rounded-[20px] border border-pine/15 bg-pine/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">From session</p>
            <p className="mt-2 text-sm leading-6 text-ink">
              {sessionPrefill.sourceSessionTitle}
              {sessionPrefill.sourceWindow ? ` • ${sessionPrefill.sourceWindow}` : ""}
              {sessionPrefill.sourceStart && sessionPrefill.sourceEnd ? ` • ${sessionPrefill.sourceStart}-${sessionPrefill.sourceEnd}` : ""}
            </p>
            <p className="mt-1 text-xs text-ink/55">Your route log already includes this session context so input is faster.</p>
          </div>
        )}
        <div className="space-y-3 rounded-[20px] border border-ink/10 bg-white/85 p-4">
          <p className="text-sm font-semibold text-ink">Ready to save</p>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <span key={chip} className="rounded-full bg-pine/10 px-2.5 py-1 text-xs font-semibold text-pine">
                {chip}
              </span>
            ))}
          </div>
          {selectedSharedRoute && (
            <p className="text-sm text-ink/65">
              Reusing saved route details for <span className="font-semibold text-ink">{selectedSharedRoute.title}</span>.
            </p>
          )}
          {data.feltStrong.length > 0 && (
            <p className="text-sm text-ink/70">
              <span className="font-medium text-ink">Strong:</span> {data.feltStrong.join(", ")}
            </p>
          )}
          {data.feltWeak.length > 0 && (
            <p className="text-sm text-ink/70">
              <span className="font-medium text-ink">Weak:</span> {data.feltWeak.join(", ")}
            </p>
          )}
          {videoReady && <p className="text-xs font-medium text-pine">AI video analysis applied</p>}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              setAnimKey((current) => current + 1);
              setStepIndex(Math.max(steps.length - 1, 0));
            }}
            className="rounded-full border border-ink/10 px-5 py-3 text-sm font-semibold text-ink/50 transition-colors hover:text-ink"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 rounded-full bg-pine px-5 py-3 text-sm font-semibold text-chalk transition hover:bg-ink disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save climb"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sessionPrefill?.sourceSessionTitle && (
        <div className="rounded-[20px] border border-pine/15 bg-pine/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">Logging after session</p>
          <p className="mt-2 text-sm leading-6 text-ink">
            {sessionPrefill.sourceSessionTitle}
            {sessionPrefill.sourceWindow ? ` • ${sessionPrefill.sourceWindow}` : ""}
            {sessionPrefill.sourceStart && sessionPrefill.sourceEnd ? ` • ${sessionPrefill.sourceStart}-${sessionPrefill.sourceEnd}` : ""}
          </p>
        </div>
      )}
      <div className="h-1 w-full overflow-hidden rounded-full bg-ink/8">
        <div className="h-full rounded-full bg-pine transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((chip) => (
            <span key={chip} className="rounded-full bg-ink/6 px-2.5 py-1 text-xs font-medium text-ink/55">
              {chip}
            </span>
          ))}
        </div>
      )}

      <div key={animKey} className="animate-slide-up space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine/70">
            {Math.min(stepIndex + 1, steps.length)} / {steps.length} · {currentStep ? STEP_LABELS[currentStep] : "Save"}
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">{currentStep ? stepQuestion(currentStep, data) : "Ready to save?"}</p>
        </div>

        {currentStep === "venue" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => chooseEnvironment("Indoor")}
              className="rounded-[24px] border border-pine/20 bg-[linear-gradient(180deg,#f5faf8_0%,#eef6f3_100%)] px-5 py-7 text-left transition-all hover:border-pine/45 hover:shadow-lg active:scale-[0.99]"
            >
              <p className="text-3xl mb-2">🏋️</p>
              <p className="text-base font-semibold text-ink">Inside</p>
              <p className="mt-1 text-sm text-ink/60">Gym, training center, or board session.</p>
            </button>
            <button
              type="button"
              onClick={() => chooseEnvironment("Outdoor")}
              className="rounded-[24px] border border-ink/10 bg-white px-5 py-7 text-left transition-all hover:border-pine/35 hover:shadow-lg active:scale-[0.99]"
            >
              <p className="text-3xl mb-2">🌲</p>
              <p className="text-base font-semibold text-ink">Outside</p>
              <p className="mt-1 text-sm text-ink/60">Crag, rope route, or outdoor boulder.</p>
            </button>
          </div>
        )}

        {currentStep === "gym" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => chooseGym(true)}
              className="rounded-[24px] border border-pine/20 bg-[linear-gradient(180deg,#f5faf8_0%,#eef6f3_100%)] px-5 py-7 text-left transition-all hover:border-pine/45 hover:shadow-lg active:scale-[0.99]"
            >
              <div className="mb-4">
                <GymOptionLogo kind="sessions" />
              </div>
              <p className="text-base font-semibold text-ink">Sessions</p>
              <p className="mt-1 text-sm text-ink/60">Use the zone map and reuse routes people already logged.</p>
            </button>
            <button
              type="button"
              onClick={() => chooseGym(false)}
              className="rounded-[24px] border border-ink/10 bg-white px-5 py-7 text-left transition-all hover:border-pine/35 hover:shadow-lg active:scale-[0.99]"
            >
              <div className="mb-4">
                <GymOptionLogo kind="other" />
              </div>
              <p className="text-base font-semibold text-ink">Other gym</p>
              <p className="mt-1 text-sm text-ink/60">Keep the same fast flow without the Sessions map.</p>
            </button>
          </div>
        )}

        {currentStep === "sessionsRoute" && (
          <div className="space-y-4">
            <div className="space-y-3 rounded-[24px] border border-ink/10 bg-white/70 p-3 sm:p-4">
              <p className="px-1 text-sm text-ink/60">
                Tap the zone. If somebody has already logged the route, you can reuse it instead of typing everything again.
              </p>
              <SessionsGymMap
                selectedZoneId={data.gymZoneId}
                onSelect={chooseZone}
                zoneCounts={zoneCounts}
              />
            </div>

            {data.gymZoneId && (
              <div className="space-y-3 rounded-[24px] border border-ink/10 bg-white/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">{data.gymZoneLabel}</p>
                    <p className="text-xs text-ink/50">
                      {routesInZone.length > 0
                        ? `${routesInZone.length} saved ${routesInZone.length === 1 ? "route" : "routes"} ready to reuse`
                        : "No saved routes here yet"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={startNewRouteFromZone}
                    className="rounded-full border border-pine/20 bg-pine/5 px-4 py-2 text-sm font-semibold text-pine transition-colors hover:bg-pine hover:text-chalk"
                  >
                    New route in {data.gymZoneLabel}
                  </button>
                </div>

                {routesInZone.length > 0 ? (
                  <div className="space-y-2">
                    {routesInZone.map((route) => (
                      <button
                        key={route.id}
                        type="button"
                        onClick={() => chooseSharedRoute(route)}
                        className="w-full rounded-[18px] border border-ink/10 bg-white px-4 py-3 text-left transition-all hover:border-pine/35 hover:shadow-md active:scale-[0.99]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-ink">{route.title}</p>
                            <p className="mt-0.5 text-sm text-ink/55">
                              {route.grade} · {route.climbType === ClimbType.ROUTE ? "Route" : "Boulder"}
                              {route.submittedBy ? ` · first saved by ${route.submittedBy}` : ""}
                            </p>
                          </div>
                          <span className="rounded-full bg-mist px-2.5 py-1 text-xs font-semibold text-pine">
                            {route.routeCount} {route.routeCount === 1 ? "log" : "logs"}
                          </span>
                        </div>
                        {(route.notes || route.styleTags) && (
                          <p className="mt-2 text-sm text-ink/60">
                            {route.notes || parseStyleTags(route.styleTags).slice(0, 4).join(", ")}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-[18px] bg-mist px-4 py-3 text-sm text-ink/60">
                    Be the first to save a route in {data.gymZoneLabel}. The next person will be able to tap it instead of re-entering everything.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {currentStep === "name" && (
          <div className="space-y-3">
            {/* Horizontal color slider — single select, auto-advance */}
            <div
              className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
              style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
            >
              {ROUTE_COLORS.map((color) => {
                const active = data.title === color.name;
                return (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => {
                      setColorTags([color.name]);
                      setData((cur) => ({ ...cur, title: color.name }));
                      setTimeout(advance, 260);
                    }}
                    className={`snap-center flex-shrink-0 flex flex-col items-center gap-2 rounded-2xl px-3 py-3 border-2 transition-all active:scale-95 ${
                      active ? "border-ink shadow-lg scale-105" : "border-transparent hover:border-ink/20"
                    }`}
                    style={{ minWidth: 76 }}
                  >
                    <span
                      className="h-14 w-14 rounded-xl block shadow-sm"
                      style={{
                        backgroundColor: color.hex,
                        border: "border" in color ? "1px solid #e2e8f0" : undefined,
                      }}
                    />
                    <span className={`text-xs font-semibold ${active ? "text-ink" : "text-ink/50"}`}>{color.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-ink/35 text-center">Swipe to see all colors · tap to select</p>
          </div>
        )}

        {currentStep === "grade" && (
          <div className="space-y-3">
            <div
              className="flex gap-2 overflow-x-auto pb-2 snap-x snap-mandatory"
              style={{ WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}
            >
              {gradeOptions.map((grade) => (
                <button
                  key={grade}
                  type="button"
                  onClick={() => {
                    setData((current) => ({
                      ...current,
                      grade,
                      gradeScale: current.climbType === ClimbType.BOULDER ? GradeScale.V_SCALE : GradeScale.YDS,
                    }));
                    setTimeout(advance, 220);
                  }}
                  className={`snap-center shrink-0 rounded-full border px-4 py-2.5 text-sm font-semibold transition-all ${
                    data.grade === grade
                      ? "border-pine bg-pine text-chalk shadow-md"
                      : "border-ink/10 bg-white text-ink/60 hover:border-pine/40"
                  }`}
                >
                  {grade}
                </button>
              ))}
            </div>
            <p className="text-xs text-center text-ink/35">Swipe to see more grades · tap to select</p>
          </div>
        )}

        {currentStep === "type" && (
          <div className="grid grid-cols-2 gap-3">
            {([ClimbType.ROUTE, ClimbType.BOULDER] as ClimbType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => chooseClimbType(type)}
                className={`rounded-[20px] border py-8 text-base font-semibold transition-all active:scale-95 ${
                  data.climbType === type
                    ? "border-pine bg-pine text-chalk shadow-md"
                    : "border-ink/10 bg-white text-ink hover:border-pine/30"
                }`}
              >
                {type === ClimbType.ROUTE ? "Ropes" : "Boulder"}
              </button>
            ))}
          </div>
        )}

        {currentStep === "detail" && (
          <div className="grid gap-3">
            {[
              {
                value: "quick" as const,
                title: "Fast log",
                body: "Just the key effort stuff: pump, crux, confidence, what felt good, what felt bad, and notes.",
              },
              {
                value: "standard" as const,
                title: "Standard log",
                body: "Add route details like hold types and movement so the plan engine can learn more from the climb.",
              },
              {
                value: "deep" as const,
                title: "Full breakdown",
                body: "Include wall geometry, style tags, and optional video analysis for the most useful route data.",
              },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setField("detailLevel", option.value);
                  advance();
                }}
                className={`rounded-[22px] border px-5 py-5 text-left transition-all active:scale-[0.99] ${
                  data.detailLevel === option.value
                    ? "border-pine bg-pine/5 shadow-md"
                    : "border-ink/10 bg-white hover:border-pine/30"
                }`}
              >
                <p className="text-base font-semibold text-ink">{option.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ink/60">{option.body}</p>
              </button>
            ))}
          </div>
        )}

        {currentStep === "angle" && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {WALL_ANGLES.map((angle) => (
              <button
                key={angle}
                type="button"
                onClick={() => {
                  setField("wallAngle", angle);
                  advance();
                }}
                className={`rounded-[16px] border px-3 py-5 text-sm font-semibold transition-all active:scale-95 ${
                  data.wallAngle === angle
                    ? "border-pine bg-pine text-chalk shadow-md"
                    : "border-ink/10 bg-white text-ink hover:border-pine/30"
                }`}
              >
                {angleEmoji(angle)} {angle}
              </button>
            ))}
          </div>
        )}

        {currentStep === "height" && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {WALL_HEIGHTS.map((height) => (
              <button
                key={height}
                type="button"
                onClick={() => {
                  setField("wallHeight", height);
                  advance();
                }}
                className={`rounded-[16px] border px-3 py-5 text-sm font-semibold transition-all active:scale-95 ${
                  data.wallHeight === height
                    ? "border-pine bg-pine text-chalk shadow-md"
                    : "border-ink/10 bg-white text-ink hover:border-pine/30"
                }`}
              >
                {height}
              </button>
            ))}
          </div>
        )}

        {currentStep === "holds" && (
          <ChipGrid options={HOLD_TYPES} selected={data.holdTypes} onToggle={(value) => toggleMulti("holdTypes", value)} />
        )}

        {currentStep === "movement" && (
          <ChipGrid
            options={MOVEMENT_STYLES}
            selected={data.movementType}
            single
            onToggle={(value) => {
              setField("movementType", value);
              setTimeout(advance, 220);
            }}
          />
        )}

        {currentStep === "pump" && (
          <ScalePicker
            value={data.pumpLevel}
            onChange={(value) => {
              setField("pumpLevel", value);
              setTimeout(advance, 240);
            }}
            low="Not pumped"
            high="Completely boxed"
          />
        )}

        {currentStep === "crux" && (
          <ScalePicker
            value={data.cruxDifficulty}
            onChange={(value) => {
              setField("cruxDifficulty", value);
              setTimeout(advance, 240);
            }}
            low="Comfortable"
            high="At my limit"
          />
        )}

        {currentStep === "confidence" && (
          <ScalePicker
            value={data.confidenceLevel}
            onChange={(value) => {
              setField("confidenceLevel", value);
              setTimeout(advance, 240);
            }}
            low="Shaky"
            high="Totally dialed"
          />
        )}

        {currentStep === "style" && (
          <ChipGrid options={STYLE_TAGS} selected={data.styleTags} onToggle={(value) => toggleMulti("styleTags", value)} />
        )}

        {currentStep === "strong" && (
          <ChipGrid options={STRONG_OPTIONS} selected={data.feltStrong} onToggle={(value) => toggleMulti("feltStrong", value)} />
        )}

        {currentStep === "weak" && (
          <ChipGrid options={WEAK_OPTIONS} selected={data.feltWeak} onToggle={(value) => toggleMulti("feltWeak", value)} />
        )}

        {currentStep === "notes" && (
          <textarea
            autoFocus
            value={data.notes}
            onChange={(event) => setField("notes", event.target.value)}
            placeholder="Beta, where you fell, what part of the wall it was on, what to fix next time..."
            rows={4}
            className="w-full resize-none rounded-2xl border border-ink/10 bg-white px-4 py-4 text-base outline-none placeholder:text-ink/30 focus:border-pine focus:ring-2 focus:ring-pine/15"
          />
        )}

        {currentStep === "video" && (
          <div className="space-y-3">
            <div
              onClick={() => !analyzing && fileRef.current?.click()}
              className={`cursor-pointer rounded-[20px] border-2 border-dashed p-8 text-center transition-colors ${
                analyzing ? "border-pine/30 bg-pine/5" : "border-ink/15 bg-white/50 hover:border-pine/40"
              }`}
            >
              {analyzing ? (
                <div className="space-y-2">
                  <div className="flex justify-center gap-2">
                    {[0, 0.15, 0.3].map((delay) => (
                      <span
                        key={delay}
                        className="h-2.5 w-2.5 animate-bounce rounded-full bg-pine"
                        style={{ animationDelay: `${delay}s` }}
                      />
                    ))}
                  </div>
                  <p className="text-sm font-medium text-pine">Analyzing your climb...</p>
                  <p className="text-xs text-ink/50">Using video to backfill movement, holds, strengths, and weaknesses.</p>
                </div>
              ) : videoReady ? (
                <div className="space-y-1">
                  <p className="text-2xl">✓</p>
                  <p className="text-sm font-semibold text-pine">Analysis applied</p>
                  <p className="text-xs text-ink/50">Tap to replace video</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-2xl">📹</p>
                  <p className="text-sm font-semibold text-ink">Tap to add video</p>
                  <p className="text-xs text-ink/50">Optional, but it helps the route log fill itself in.</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              capture="environment"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) analyzeVideo(file);
              }}
            />
            {analyzeError && <p className="rounded-xl bg-clay/5 px-3 py-2 text-sm text-clay">{analyzeError}</p>}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={back}
            disabled={stepIndex === 0}
            className="rounded-full border border-ink/10 px-4 py-2.5 text-sm font-semibold text-ink/50 transition-colors hover:text-ink disabled:opacity-30"
          >
            ← Back
          </button>

          {currentStep === "video" ? (
            <button
              type="button"
              onClick={() => setStepIndex(steps.length)}
              className="rounded-full bg-pine px-6 py-2.5 text-sm font-semibold text-chalk transition hover:bg-ink"
            >
              {videoReady ? "Save →" : "Skip & save →"}
            </button>
          ) : showNextButton ? (
            <button
              type="button"
              onClick={advance}
              disabled={!canNext}
              className="rounded-full bg-pine px-6 py-2.5 text-sm font-semibold text-chalk transition hover:bg-ink disabled:opacity-40"
            >
              Next →
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
