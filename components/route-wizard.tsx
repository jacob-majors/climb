"use client";

import { useState, useRef, useTransition } from "react";
import { ClimbType, GradeScale } from "@prisma/client";
import { saveRouteEntryAction } from "@/app/actions";
import type { ClimbAnalysis } from "@/app/api/analyze-climb/route";

// ── Constants ────────────────────────────────────────────────────────────────

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

const GRADE_SCALES = Object.values(GradeScale);

type WizardData = {
  title: string;
  grade: string;
  gradeScale: GradeScale;
  climbType: ClimbType;
  environment: string;
  pumpLevel: number;
  cruxDifficulty: number;
  confidenceLevel: number;
  styleTags: string[];
  feltStrong: string;
  feltWeak: string;
  mainChallenges: string;
  movementType: string;
  holdTypes: string;
  fallReason: string;
  weaknessSummary: string;
};

const defaultData: WizardData = {
  title: "",
  grade: "",
  gradeScale: GradeScale.V_SCALE,
  climbType: ClimbType.BOULDER,
  environment: "Indoor",
  pumpLevel: 5,
  cruxDifficulty: 5,
  confidenceLevel: 5,
  styleTags: [],
  feltStrong: "",
  feltWeak: "",
  mainChallenges: "",
  movementType: "",
  holdTypes: "",
  fallReason: "",
  weaknessSummary: "",
};

// ── Step IDs ─────────────────────────────────────────────────────────────────

const STEPS = [
  "name",
  "grade",
  "type",
  "env",
  "pump",
  "crux",
  "confidence",
  "style",
  "strong",
  "weak",
  "video",
] as const;

type StepId = (typeof STEPS)[number];

const STEP_LABELS: Record<StepId, string> = {
  name: "Name",
  grade: "Grade",
  type: "Type",
  env: "Where",
  pump: "Pump",
  crux: "Crux",
  confidence: "Feel",
  style: "Style",
  strong: "Strengths",
  weak: "Weaknesses",
  video: "Video",
};

// ── Frame extractor (client-side) ─────────────────────────────────────────────

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

      function seek() {
        video.currentTime = (video.duration / (count + 1)) * (current + 1);
      }

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        frames.push(canvas.toDataURL("image/jpeg", 0.7).split(",")[1]);
        current++;
        if (current < count) {
          seek();
        } else {
          URL.revokeObjectURL(video.src);
          resolve(frames);
        }
      };

      seek();
    };

    video.onerror = reject;
  });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScalePicker({
  value,
  onChange,
  low,
  high,
}: {
  value: number;
  onChange: (v: number) => void;
  low: string;
  high: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 justify-center flex-wrap">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`h-11 w-11 rounded-full text-sm font-semibold transition-all ${
              n === value
                ? "bg-pine text-chalk scale-110 shadow-md"
                : n < value
                ? "bg-pine/20 text-pine"
                : "bg-ink/6 text-ink/50 hover:bg-ink/12"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-ink/40 px-1">
        <span>{low}</span>
        <span>{high}</span>
      </div>
    </div>
  );
}

function TagGrid({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (tag: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {STYLE_TAGS.map((tag) => {
        const on = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            onClick={() => onToggle(tag)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-all ${
              on
                ? "bg-pine text-chalk border-pine"
                : "bg-white border-ink/10 text-ink/70 hover:border-pine/40"
            }`}
          >
            {tag}
          </button>
        );
      })}
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
  const fileRef = useRef<HTMLInputElement>(null);
  const [animKey, setAnimKey] = useState(0);

  const currentStep = STEPS[stepIndex];
  const progress = ((stepIndex) / STEPS.length) * 100;

  function set<K extends keyof WizardData>(key: K, value: WizardData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function next() {
    setAnimKey((k) => k + 1);
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function back() {
    setAnimKey((k) => k + 1);
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function toggleTag(tag: string) {
    set(
      "styleTags",
      data.styleTags.includes(tag)
        ? data.styleTags.filter((t) => t !== tag)
        : [...data.styleTags, tag]
    );
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
      const analysis = (await res.json()) as ClimbAnalysis;
      setData((d) => ({
        ...d,
        movementType: analysis.movementType || d.movementType,
        holdTypes: analysis.holdTypes || d.holdTypes,
        styleTags: analysis.styleTags?.length ? analysis.styleTags : d.styleTags,
        feltStrong: analysis.feltStrong || d.feltStrong,
        feltWeak: analysis.feltWeak || d.feltWeak,
        mainChallenges: analysis.mainChallenges || d.mainChallenges,
        weaknessSummary: analysis.weaknessSummary || d.weaknessSummary,
      }));
      setVideoReady(true);
    } catch {
      setAnalyzeError("Analysis failed — you can still fill in the details manually.");
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
    fd.append("pumpLevel", String(data.pumpLevel));
    fd.append("cruxDifficulty", String(data.cruxDifficulty));
    fd.append("confidenceLevel", String(data.confidenceLevel));
    fd.append("styleTags", JSON.stringify(data.styleTags));
    fd.append("feltStrong", data.feltStrong);
    fd.append("feltWeak", data.feltWeak);
    fd.append("mainChallenges", data.mainChallenges);
    fd.append("movementType", data.movementType || "Not specified");
    fd.append("holdTypes", data.holdTypes || "Not specified");
    fd.append("fallReason", data.fallReason);
    fd.append("weaknessSummary", data.weaknessSummary);
    startTransition(() => {
      saveRouteEntryAction(fd);
    });
  }

  // ── Answered summary chips ───────────────────────────────────────────────

  const summaryChips: string[] = [];
  if (stepIndex > 0 && data.title) summaryChips.push(data.title);
  if (stepIndex > 1 && data.grade) summaryChips.push(`${data.grade} ${data.gradeScale}`);
  if (stepIndex > 2) summaryChips.push(data.climbType === ClimbType.BOULDER ? "Boulder" : "Route");
  if (stepIndex > 3) summaryChips.push(data.environment);
  if (stepIndex > 4) summaryChips.push(`Pump ${data.pumpLevel}`);
  if (stepIndex > 5) summaryChips.push(`Crux ${data.cruxDifficulty}`);
  if (stepIndex > 6) summaryChips.push(`Confidence ${data.confidenceLevel}`);
  if (stepIndex > 7 && data.styleTags.length) summaryChips.push(data.styleTags.slice(0, 2).join(", "));

  // ── Done state ──────────────────────────────────────────────────────────

  if (stepIndex >= STEPS.length) {
    return (
      <div className="space-y-4 animate-slide-up">
        <div className="rounded-[20px] border border-ink/10 bg-white/80 p-5 space-y-3">
          <p className="text-base font-semibold text-ink">Ready to save</p>
          <div className="flex flex-wrap gap-2">
            {summaryChips.map((chip) => (
              <span key={chip} className="rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold text-pine">
                {chip}
              </span>
            ))}
          </div>
          {data.feltStrong && <p className="text-sm text-ink/70"><span className="font-medium text-ink">Strong: </span>{data.feltStrong}</p>}
          {data.feltWeak && <p className="text-sm text-ink/70"><span className="font-medium text-ink">Weak: </span>{data.feltWeak}</p>}
          {videoReady && <p className="text-xs text-pine font-medium">✓ AI analysis applied</p>}
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => { setAnimKey(k => k + 1); setStepIndex(STEPS.length - 1); }}
            className="rounded-full border border-ink/10 px-5 py-3 text-sm font-semibold text-ink/60 hover:text-ink transition-colors">
            Back
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 rounded-full bg-pine px-5 py-3 text-sm font-semibold text-chalk transition hover:bg-ink disabled:opacity-50"
          >
            {isPending ? "Saving…" : "Save climb"}
          </button>
        </div>
      </div>
    );
  }

  // ── Step renderer ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="h-1 w-full rounded-full bg-ink/8 overflow-hidden">
        <div
          className="h-full rounded-full bg-pine transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Summary chips */}
      {summaryChips.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {summaryChips.map((chip) => (
            <span key={chip} className="rounded-full bg-ink/6 px-2.5 py-1 text-xs font-medium text-ink/60">
              {chip}
            </span>
          ))}
        </div>
      )}

      {/* Active step */}
      <div key={animKey} className="animate-slide-up space-y-5">
        {/* Step label */}
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine/70">
            {stepIndex + 1} of {STEPS.length} · {STEP_LABELS[currentStep]}
          </p>
          <p className="mt-1 text-xl font-semibold text-ink">
            {stepQuestion(currentStep)}
          </p>
        </div>

        {/* Step input */}
        <div>
          {currentStep === "name" && (
            <div className="space-y-3">
              <input
                autoFocus
                value={data.title}
                onChange={(e) => set("title", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && data.title.trim() && next()}
                placeholder="Route or problem name"
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-4 text-base outline-none focus:border-pine focus:ring-2 focus:ring-pine/15 placeholder:text-ink/30"
              />
            </div>
          )}

          {currentStep === "grade" && (
            <div className="space-y-3">
              <input
                autoFocus
                value={data.grade}
                onChange={(e) => set("grade", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && data.grade.trim() && next()}
                placeholder="e.g. V5, 5.11c, 7a"
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-4 text-base outline-none focus:border-pine focus:ring-2 focus:ring-pine/15 placeholder:text-ink/30"
              />
              <div className="flex gap-2 flex-wrap">
                {GRADE_SCALES.map((scale) => (
                  <button
                    key={scale}
                    type="button"
                    onClick={() => set("gradeScale", scale)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-all ${
                      data.gradeScale === scale
                        ? "bg-pine text-chalk border-pine"
                        : "bg-white border-ink/10 text-ink/60 hover:border-pine/40"
                    }`}
                  >
                    {scale.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === "type" && (
            <div className="grid grid-cols-2 gap-3">
              {([ClimbType.BOULDER, ClimbType.ROUTE] as ClimbType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { set("climbType", t); next(); }}
                  className={`rounded-[20px] border py-8 text-base font-semibold transition-all ${
                    data.climbType === t
                      ? "border-pine bg-pine text-chalk shadow-md"
                      : "border-ink/10 bg-white text-ink hover:border-pine/40"
                  }`}
                >
                  {t === ClimbType.BOULDER ? "🪨 Boulder" : "🧗 Route"}
                </button>
              ))}
            </div>
          )}

          {currentStep === "env" && (
            <div className="grid grid-cols-2 gap-3">
              {["Indoor", "Outdoor"].map((env) => (
                <button
                  key={env}
                  type="button"
                  onClick={() => { set("environment", env); next(); }}
                  className={`rounded-[20px] border py-8 text-base font-semibold transition-all ${
                    data.environment === env
                      ? "border-pine bg-pine text-chalk shadow-md"
                      : "border-ink/10 bg-white text-ink hover:border-pine/40"
                  }`}
                >
                  {env === "Indoor" ? "🏋️ Indoor" : "⛰️ Outdoor"}
                </button>
              ))}
            </div>
          )}

          {currentStep === "pump" && (
            <ScalePicker
              value={data.pumpLevel}
              onChange={(v) => { set("pumpLevel", v); setTimeout(next, 300); }}
              low="Not pumped"
              high="Forearms on fire"
            />
          )}

          {currentStep === "crux" && (
            <ScalePicker
              value={data.cruxDifficulty}
              onChange={(v) => { set("cruxDifficulty", v); setTimeout(next, 300); }}
              low="Comfortable"
              high="At my limit"
            />
          )}

          {currentStep === "confidence" && (
            <ScalePicker
              value={data.confidenceLevel}
              onChange={(v) => { set("confidenceLevel", v); setTimeout(next, 300); }}
              low="Scared"
              high="Totally dialed"
            />
          )}

          {currentStep === "style" && (
            <TagGrid selected={data.styleTags} onToggle={toggleTag} />
          )}

          {currentStep === "strong" && (
            <textarea
              autoFocus
              value={data.feltStrong}
              onChange={(e) => set("feltStrong", e.target.value)}
              placeholder="e.g. footwork, reading moves, staying calm on the crux"
              rows={3}
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-4 text-base outline-none resize-none focus:border-pine focus:ring-2 focus:ring-pine/15 placeholder:text-ink/30"
            />
          )}

          {currentStep === "weak" && (
            <textarea
              autoFocus
              value={data.feltWeak}
              onChange={(e) => set("feltWeak", e.target.value)}
              placeholder="e.g. lock-offs, pinch strength, committing to dynamic moves"
              rows={3}
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-4 text-base outline-none resize-none focus:border-pine focus:ring-2 focus:ring-pine/15 placeholder:text-ink/30"
            />
          )}

          {currentStep === "video" && (
            <div className="space-y-4">
              <div
                onClick={() => !analyzing && fileRef.current?.click()}
                className={`rounded-[20px] border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
                  analyzing ? "border-pine/30 bg-pine/5" : "border-ink/15 hover:border-pine/40 bg-white/50"
                }`}
              >
                {analyzing ? (
                  <div className="space-y-2">
                    <div className="flex justify-center gap-1.5">
                      {[0, 0.15, 0.3].map((delay) => (
                        <span
                          key={delay}
                          className="h-2.5 w-2.5 rounded-full bg-pine"
                          style={{ animation: `pulse 1s ${delay}s ease-in-out infinite` }}
                        />
                      ))}
                    </div>
                    <p className="text-sm font-medium text-pine">Analyzing your climb…</p>
                    <p className="text-xs text-ink/50">Claude is reading your technique from the video</p>
                  </div>
                ) : videoReady ? (
                  <div className="space-y-1">
                    <p className="text-2xl">✓</p>
                    <p className="text-sm font-semibold text-pine">Analysis applied</p>
                    <p className="text-xs text-ink/50">Fields pre-filled from video</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-2xl">📹</p>
                    <p className="text-sm font-semibold text-ink">Tap to add video</p>
                    <p className="text-xs text-ink/50">Claude will analyze your technique and fill in the details</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="video/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) analyzeVideo(file);
                }}
              />
              {analyzeError && (
                <p className="text-sm text-clay rounded-xl bg-clay/5 px-3 py-2">{analyzeError}</p>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 pt-1">
          <button
            type="button"
            onClick={back}
            disabled={stepIndex === 0}
            className="rounded-full border border-ink/10 px-4 py-2.5 text-sm font-semibold text-ink/50 hover:text-ink transition-colors disabled:opacity-30"
          >
            ← Back
          </button>

          {currentStep === "video" ? (
            <button
              type="button"
              onClick={() => setStepIndex(STEPS.length)}
              className="rounded-full bg-pine px-6 py-2.5 text-sm font-semibold text-chalk transition hover:bg-ink"
            >
              {videoReady ? "Save →" : "Skip & save →"}
            </button>
          ) : needsNextButton(currentStep) ? (
            <button
              type="button"
              onClick={next}
              disabled={!canAdvance(currentStep, data)}
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function stepQuestion(step: StepId): string {
  switch (step) {
    case "name":       return "What did you climb?";
    case "grade":      return "What was the grade?";
    case "type":       return "Boulder or route?";
    case "env":        return "Indoor or outdoor?";
    case "pump":       return "How pumped did you get?";
    case "crux":       return "How hard was the crux?";
    case "confidence": return "How confident did you feel?";
    case "style":      return "What style was it?";
    case "strong":     return "What felt strong?";
    case "weak":       return "What felt weak or limited you?";
    case "video":      return "Add a video for AI analysis";
  }
}

function needsNextButton(step: StepId): boolean {
  return ["name", "grade", "style", "strong", "weak"].includes(step);
}

function canAdvance(step: StepId, data: WizardData): boolean {
  switch (step) {
    case "name":  return data.title.trim().length > 0;
    case "grade": return data.grade.trim().length > 0;
    default:      return true;
  }
}
