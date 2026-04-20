"use client";

import { useState, useRef, useTransition } from "react";
import { ClimbType, GradeScale } from "@prisma/client";
import { saveRouteEntryAction } from "@/app/actions";
import type { ClimbAnalysis } from "@/app/api/analyze-climb/route";

// ── Option lists ──────────────────────────────────────────────────────────────

const GRADE_SCALES = Object.values(GradeScale);

const WALL_ANGLES = ["Slab", "Vertical", "Slight overhang", "Steep overhang", "Cave / Roof"] as const;
const WALL_HEIGHTS = ["Under 5m", "5–10m", "10–20m", "20–35m", "35m+ / Multi-pitch"] as const;

const HOLD_TYPES = [
  "Crimps", "Slopers", "Pinches", "Pockets", "Jugs",
  "Underclings", "Sidepulls", "Gastons", "Volumes",
  "Edges", "Palming", "Monos",
];

const MOVEMENT_STYLES = [
  "Static & precise", "Dynamic & powerful", "Technical footwork",
  "Power endurance", "Compression", "Balancy / slab",
  "Sustained crimping", "Campus / upper body", "Coordination moves",
];

const STRONG_OPTIONS = [
  "Footwork", "Body positioning", "Reading moves", "Hip placement",
  "Lock-offs", "Dynamic reaches", "Mental composure", "Endurance",
  "Explosive power", "Breathing / resting", "Clipping", "Flow",
];

const WEAK_OPTIONS = [
  "Finger strength", "Lock-offs", "Footwork precision", "Hip flexibility",
  "Endurance / pump", "Commitment", "Body tension", "Reading moves",
  "Shoulder strength", "Accuracy on small holds", "Skin", "Core tension",
];

const STYLE_TAGS = [
  "Overhang","Slab","Vertical","Cave","Roof",
  "Crimpy","Slopey","Pinchy","Jugy","Pockets",
  "Gastons","Underclings","Sidepulls",
  "Dynamic","Static","Powerful","Technical","Balancy",
  "Compression","Mantling","High-step","Heel hook","Toe hook",
  "Drop knee","Flag","Cross-through","Deadpoint","Campus",
  "Pump","Power endurance","Sustained","Bouldery",
  "Thin","Polished","Mental","Committing","Exposure","Runout",
];

// ── Step list ─────────────────────────────────────────────────────────────────

const STEPS = [
  "name", "grade", "type", "env", "angle", "height",
  "holds", "movement", "pump", "crux", "confidence",
  "style", "strong", "weak", "notes", "video",
] as const;

type StepId = (typeof STEPS)[number];

const STEP_LABELS: Record<StepId, string> = {
  name: "Name", grade: "Grade", type: "Type", env: "Where",
  angle: "Angle", height: "Height", holds: "Holds", movement: "Movement",
  pump: "Pump", crux: "Crux", confidence: "Feel", style: "Style",
  strong: "Strengths", weak: "Weaknesses", notes: "Notes", video: "Video",
};

// ── State ─────────────────────────────────────────────────────────────────────

type WizardData = {
  title: string;
  grade: string;
  gradeScale: GradeScale;
  climbType: ClimbType;
  environment: string;
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
};

const defaultData: WizardData = {
  title: "", grade: "", gradeScale: GradeScale.V_SCALE,
  climbType: ClimbType.BOULDER, environment: "Indoor",
  wallAngle: "", wallHeight: "", holdTypes: [], movementType: "",
  pumpLevel: 5, cruxDifficulty: 5, confidenceLevel: 5,
  styleTags: [], feltStrong: [], feltWeak: [],
  notes: "", mainChallenges: "", weaknessSummary: "",
};

// ── Frame extractor ───────────────────────────────────────────────────────────

async function extractFrames(file: File, count = 6): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return reject(new Error("no canvas ctx"));
    const frames: string[] = [];
    let current = 0;
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);
    video.onloadedmetadata = () => {
      const w = Math.min(video.videoWidth, 640);
      canvas.width = w;
      canvas.height = Math.round((w / video.videoWidth) * video.videoHeight);
      function seek() { video.currentTime = (video.duration / (count + 1)) * (current + 1); }
      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL("image/jpeg", 0.7).split(",")[1]);
        current++;
        if (current < count) seek(); else { URL.revokeObjectURL(video.src); resolve(frames); }
      };
      seek();
    };
    video.onerror = reject;
  });
}

// ── Chip grid helper ──────────────────────────────────────────────────────────

function ChipGrid({
  options,
  selected,
  onToggle,
  single = false,
}: {
  options: readonly string[];
  selected: string | string[];
  onToggle: (v: string) => void;
  single?: boolean;
}) {
  const isSelected = (v: string) =>
    single ? selected === v : (selected as string[]).includes(v);

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onToggle(opt)}
          className={`rounded-full px-3.5 py-2 text-sm font-medium border transition-all active:scale-95 ${
            isSelected(opt)
              ? "bg-pine text-chalk border-pine"
              : "bg-white border-ink/10 text-ink/70 hover:border-pine/40"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// ── Scale picker ──────────────────────────────────────────────────────────────

function ScalePicker({
  value, onChange, low, high,
}: { value: number; onChange: (v: number) => void; low: string; high: string }) {
  return (
    <div className="space-y-3">
      <div className="flex gap-2 justify-center flex-wrap">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button key={n} type="button" onClick={() => onChange(n)}
            className={`h-12 w-12 rounded-full text-sm font-semibold transition-all active:scale-95 ${
              n === value ? "bg-pine text-chalk scale-110 shadow-md"
              : n < value ? "bg-pine/20 text-pine"
              : "bg-ink/6 text-ink/50 hover:bg-ink/12"
            }`}>
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-ink/40 px-1">
        <span>{low}</span><span>{high}</span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function RouteWizard() {
  const [stepIndex, setStepIndex] = useState(0);
  const [data, setData] = useState<WizardData>(defaultData);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [animKey, setAnimKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentStep = STEPS[stepIndex];
  const progress = (stepIndex / STEPS.length) * 100;
  const isDone = stepIndex >= STEPS.length;

  function set<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function toggleMulti(key: "holdTypes" | "styleTags" | "feltStrong" | "feltWeak", value: string) {
    setData((d) => {
      const arr = d[key] as string[];
      return { ...d, [key]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value] };
    });
  }

  function advance() {
    setAnimKey((k) => k + 1);
    setStepIndex((i) => i + 1);
  }

  function back() {
    setAnimKey((k) => k + 1);
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function analyzeVideo(file: File) {
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      const frames = await extractFrames(file, 6);
      const res = await fetch("/api/analyze-climb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const a = (await res.json()) as ClimbAnalysis;
      setData((d) => ({
        ...d,
        movementType: a.movementType || d.movementType,
        holdTypes: a.holdTypes ? a.holdTypes.split(",").map((s) => s.trim()).filter(Boolean) : d.holdTypes,
        styleTags: a.styleTags?.length ? a.styleTags : d.styleTags,
        feltStrong: a.feltStrong ? [a.feltStrong] : d.feltStrong,
        feltWeak: a.feltWeak ? [a.feltWeak] : d.feltWeak,
        mainChallenges: a.mainChallenges || d.mainChallenges,
        weaknessSummary: a.weaknessSummary || d.weaknessSummary,
      }));
      setVideoReady(true);
    } catch {
      setAnalyzeError("Analysis failed — you can still fill in details manually.");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleSubmit() {
    const fd = new FormData();
    fd.append("title", data.title);
    fd.append("grade", data.grade);
    fd.append("gradeScale", data.gradeScale);
    fd.append("climbType", data.climbType);
    fd.append("environment", data.environment);
    fd.append("wallAngle", data.wallAngle);
    fd.append("wallHeight", data.wallHeight);
    fd.append("holdTypes", data.holdTypes.join(", ") || "Not specified");
    fd.append("movementType", data.movementType || "Not specified");
    fd.append("pumpLevel", String(data.pumpLevel));
    fd.append("cruxDifficulty", String(data.cruxDifficulty));
    fd.append("confidenceLevel", String(data.confidenceLevel));
    fd.append("styleTags", JSON.stringify(data.styleTags));
    fd.append("feltStrong", data.feltStrong.join(", ") || "Not specified");
    fd.append("feltWeak", data.feltWeak.join(", ") || "Not specified");
    fd.append("mainChallenges", data.mainChallenges || data.notes || "Not specified");
    fd.append("fallReason", data.notes || "Not specified");
    fd.append("weaknessSummary", data.weaknessSummary);
    fd.append("freeText", data.notes);
    startTransition(() => { saveRouteEntryAction(fd); });
  }

  // Summary chips for answered steps
  const chips: string[] = [];
  if (stepIndex > 0 && data.title) chips.push(data.title);
  if (stepIndex > 1 && data.grade) chips.push(`${data.grade} ${data.gradeScale.replace(/_/g, " ")}`);
  if (stepIndex > 2) chips.push(data.climbType === ClimbType.BOULDER ? "Boulder" : "Route");
  if (stepIndex > 3) chips.push(data.environment);
  if (stepIndex > 4 && data.wallAngle) chips.push(data.wallAngle);
  if (stepIndex > 5 && data.wallHeight) chips.push(data.wallHeight);
  if (stepIndex > 7 && data.movementType) chips.push(data.movementType.split(" ")[0]);
  if (stepIndex > 8) chips.push(`Pump ${data.pumpLevel}`);

  // ── Done ────────────────────────────────────────────────────────────────────
  if (isDone) {
    return (
      <div className="space-y-4 animate-slide-up">
        <div className="rounded-[20px] border border-ink/10 bg-white/80 p-4 space-y-3">
          <p className="text-sm font-semibold text-ink">Ready to save</p>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((c) => (
              <span key={c} className="rounded-full bg-pine/10 px-2.5 py-1 text-xs font-semibold text-pine">{c}</span>
            ))}
          </div>
          {data.feltStrong.length > 0 && (
            <p className="text-sm text-ink/70"><span className="font-medium text-ink">Strong: </span>{data.feltStrong.join(", ")}</p>
          )}
          {data.feltWeak.length > 0 && (
            <p className="text-sm text-ink/70"><span className="font-medium text-ink">Weak: </span>{data.feltWeak.join(", ")}</p>
          )}
          {videoReady && <p className="text-xs text-pine font-medium">✓ AI analysis applied</p>}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => { setAnimKey(k => k + 1); setStepIndex(STEPS.length - 1); }}
            className="rounded-full border border-ink/10 px-5 py-3 text-sm font-semibold text-ink/50 hover:text-ink transition-colors">
            ← Back
          </button>
          <button type="button" onClick={handleSubmit} disabled={isPending}
            className="flex-1 rounded-full bg-pine px-5 py-3 text-sm font-semibold text-chalk transition hover:bg-ink disabled:opacity-50">
            {isPending ? "Saving…" : "Save climb"}
          </button>
        </div>
      </div>
    );
  }

  // ── Step renderer ─────────────────────────────────────────────────────────

  const showNextBtn = ["name", "grade", "holds", "style", "strong", "weak", "notes"].includes(currentStep);
  const canNext = currentStep === "name" ? data.title.trim().length > 0
    : currentStep === "grade" ? data.grade.trim().length > 0
    : true;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="h-1 w-full rounded-full bg-ink/8 overflow-hidden">
        <div className="h-full rounded-full bg-pine transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {/* Summary chips */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c} className="rounded-full bg-ink/6 px-2.5 py-1 text-xs font-medium text-ink/55">{c}</span>
          ))}
        </div>
      )}

      {/* Active step */}
      <div key={animKey} className="animate-slide-up space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine/70">
            {stepIndex + 1} / {STEPS.length} · {STEP_LABELS[currentStep]}
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">{stepQuestion(currentStep)}</p>
        </div>

        {/* ── name ── */}
        {currentStep === "name" && (
          <input autoFocus value={data.title} onChange={(e) => set("title", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && data.title.trim() && advance()}
            placeholder="Route or problem name"
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-4 text-base outline-none focus:border-pine focus:ring-2 focus:ring-pine/15 placeholder:text-ink/30" />
        )}

        {/* ── grade ── */}
        {currentStep === "grade" && (
          <div className="space-y-3">
            <input autoFocus value={data.grade} onChange={(e) => set("grade", e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && data.grade.trim() && advance()}
              placeholder="e.g. V5, 5.11c, 7a"
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-4 text-base outline-none focus:border-pine focus:ring-2 focus:ring-pine/15 placeholder:text-ink/30" />
            <div className="flex gap-2 flex-wrap">
              {GRADE_SCALES.map((scale) => (
                <button key={scale} type="button" onClick={() => set("gradeScale", scale)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-all ${
                    data.gradeScale === scale ? "bg-pine text-chalk border-pine" : "bg-white border-ink/10 text-ink/60 hover:border-pine/40"
                  }`}>
                  {scale.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── type ── */}
        {currentStep === "type" && (
          <div className="grid grid-cols-2 gap-3">
            {([ClimbType.BOULDER, ClimbType.ROUTE] as ClimbType[]).map((t) => (
              <button key={t} type="button" onClick={() => { set("climbType", t); advance(); }}
                className={`rounded-[20px] border py-8 text-base font-semibold transition-all active:scale-95 ${
                  data.climbType === t ? "border-pine bg-pine text-chalk shadow-md" : "border-ink/10 bg-white text-ink hover:border-pine/30"
                }`}>
                {t === ClimbType.BOULDER ? "🪨  Boulder" : "🧗  Route"}
              </button>
            ))}
          </div>
        )}

        {/* ── env ── */}
        {currentStep === "env" && (
          <div className="grid grid-cols-2 gap-3">
            {["Indoor", "Outdoor"].map((env) => (
              <button key={env} type="button" onClick={() => { set("environment", env); advance(); }}
                className={`rounded-[20px] border py-8 text-base font-semibold transition-all active:scale-95 ${
                  data.environment === env ? "border-pine bg-pine text-chalk shadow-md" : "border-ink/10 bg-white text-ink hover:border-pine/30"
                }`}>
                {env === "Indoor" ? "🏋️  Indoor" : "⛰️  Outdoor"}
              </button>
            ))}
          </div>
        )}

        {/* ── angle ── */}
        {currentStep === "angle" && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {WALL_ANGLES.map((angle) => (
              <button key={angle} type="button" onClick={() => { set("wallAngle", angle); advance(); }}
                className={`rounded-[16px] border px-3 py-5 text-sm font-semibold transition-all active:scale-95 ${
                  data.wallAngle === angle ? "border-pine bg-pine text-chalk shadow-md" : "border-ink/10 bg-white text-ink hover:border-pine/30"
                }`}>
                {angleEmoji(angle)} {angle}
              </button>
            ))}
          </div>
        )}

        {/* ── height ── */}
        {currentStep === "height" && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {WALL_HEIGHTS.map((h) => (
              <button key={h} type="button" onClick={() => { set("wallHeight", h); advance(); }}
                className={`rounded-[16px] border px-3 py-5 text-sm font-semibold transition-all active:scale-95 ${
                  data.wallHeight === h ? "border-pine bg-pine text-chalk shadow-md" : "border-ink/10 bg-white text-ink hover:border-pine/30"
                }`}>
                {h}
              </button>
            ))}
          </div>
        )}

        {/* ── holds ── */}
        {currentStep === "holds" && (
          <ChipGrid options={HOLD_TYPES} selected={data.holdTypes} onToggle={(v) => toggleMulti("holdTypes", v)} />
        )}

        {/* ── movement ── */}
        {currentStep === "movement" && (
          <ChipGrid options={MOVEMENT_STYLES} selected={data.movementType} single
            onToggle={(v) => { set("movementType", v); setTimeout(advance, 250); }} />
        )}

        {/* ── pump / crux / confidence ── */}
        {currentStep === "pump" && (
          <ScalePicker value={data.pumpLevel} onChange={(v) => { set("pumpLevel", v); setTimeout(advance, 300); }}
            low="Not pumped" high="Forearms on fire" />
        )}
        {currentStep === "crux" && (
          <ScalePicker value={data.cruxDifficulty} onChange={(v) => { set("cruxDifficulty", v); setTimeout(advance, 300); }}
            low="Comfortable" high="At my limit" />
        )}
        {currentStep === "confidence" && (
          <ScalePicker value={data.confidenceLevel} onChange={(v) => { set("confidenceLevel", v); setTimeout(advance, 300); }}
            low="Scared" high="Totally dialed" />
        )}

        {/* ── style ── */}
        {currentStep === "style" && (
          <ChipGrid options={STYLE_TAGS} selected={data.styleTags} onToggle={(v) => toggleMulti("styleTags", v)} />
        )}

        {/* ── strong ── */}
        {currentStep === "strong" && (
          <ChipGrid options={STRONG_OPTIONS} selected={data.feltStrong} onToggle={(v) => toggleMulti("feltStrong", v)} />
        )}

        {/* ── weak ── */}
        {currentStep === "weak" && (
          <ChipGrid options={WEAK_OPTIONS} selected={data.feltWeak} onToggle={(v) => toggleMulti("feltWeak", v)} />
        )}

        {/* ── notes ── */}
        {currentStep === "notes" && (
          <textarea autoFocus value={data.notes} onChange={(e) => set("notes", e.target.value)}
            placeholder="Anything else worth remembering — beta, conditions, how the session felt, what to work next…"
            rows={4}
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-4 text-base outline-none resize-none focus:border-pine focus:ring-2 focus:ring-pine/15 placeholder:text-ink/30" />
        )}

        {/* ── video ── */}
        {currentStep === "video" && (
          <div className="space-y-3">
            <div onClick={() => !analyzing && fileRef.current?.click()}
              className={`rounded-[20px] border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                analyzing ? "border-pine/30 bg-pine/5" : "border-ink/15 hover:border-pine/40 bg-white/50"
              }`}>
              {analyzing ? (
                <div className="space-y-2">
                  <div className="flex justify-center gap-2">
                    {[0, 0.15, 0.3].map((d) => (
                      <span key={d} className="h-2.5 w-2.5 rounded-full bg-pine animate-bounce"
                        style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                  <p className="text-sm font-medium text-pine">Analyzing your climb…</p>
                  <p className="text-xs text-ink/50">Claude is reading your technique from the video</p>
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
                  <p className="text-xs text-ink/50">Claude analyzes your technique and fills in the details</p>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="video/*" capture="environment" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) analyzeVideo(f); }} />
            {analyzeError && (
              <p className="text-sm text-clay rounded-xl bg-clay/5 px-3 py-2">{analyzeError}</p>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <button type="button" onClick={back} disabled={stepIndex === 0}
            className="rounded-full border border-ink/10 px-4 py-2.5 text-sm font-semibold text-ink/50 hover:text-ink transition-colors disabled:opacity-30">
            ← Back
          </button>

          {currentStep === "video" ? (
            <button type="button" onClick={() => setStepIndex(STEPS.length)}
              className="rounded-full bg-pine px-6 py-2.5 text-sm font-semibold text-chalk transition hover:bg-ink">
              {videoReady ? "Save →" : "Skip & save →"}
            </button>
          ) : showNextBtn ? (
            <button type="button" onClick={advance} disabled={!canNext}
              className="rounded-full bg-pine px-6 py-2.5 text-sm font-semibold text-chalk transition hover:bg-ink disabled:opacity-40">
              Next →
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function stepQuestion(step: StepId): string {
  switch (step) {
    case "name":       return "What did you climb?";
    case "grade":      return "What was the grade?";
    case "type":       return "Boulder or route?";
    case "env":        return "Indoor or outdoor?";
    case "angle":      return "What was the wall angle?";
    case "height":     return "How tall was the wall?";
    case "holds":      return "What hold types were on it?";
    case "movement":   return "What was the movement style?";
    case "pump":       return "How pumped did you get?";
    case "crux":       return "How hard was the crux?";
    case "confidence": return "How confident did you feel?";
    case "style":      return "Tag the style of the climb";
    case "strong":     return "What felt strong?";
    case "weak":       return "What felt weak or limited you?";
    case "notes":      return "Any other notes?";
    case "video":      return "Add a video for AI analysis";
  }
}

function angleEmoji(angle: string): string {
  if (angle.includes("Slab")) return "↗";
  if (angle.includes("Vertical")) return "↑";
  if (angle.includes("Slight")) return "↖";
  if (angle.includes("Steep")) return "⬅";
  return "↙";
}
