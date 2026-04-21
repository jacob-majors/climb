"use client";

import { useState } from "react";

const YDS = [
  "5.5","5.6","5.7","5.8","5.9",
  "5.10a","5.10b","5.10c","5.10d",
  "5.11a","5.11b","5.11c","5.11d",
  "5.12a","5.12b","5.12c","5.12d",
  "5.13a","5.13b","5.13c","5.13d",
  "5.14a","5.14b","5.14c","5.14d",
];

const V_SCALE = ["V0","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10","V11","V12","V13","V14"];

function gradeIdx(grade: string, isV: boolean): number {
  const list = isV ? V_SCALE : YDS;
  const idx = list.findIndex((g) => g.toLowerCase() === grade.toLowerCase());
  return idx;
}

export type GradeEntry = {
  grade: string;
  gradeScale: "YDS" | "V_SCALE";
  createdAt: string; // ISO string
};

type Tab = "routes" | "boulders";

export function GradeChart({ entries }: { entries: GradeEntry[] }) {
  const [tab, setTab] = useState<Tab>("routes");

  const isV = tab === "boulders";
  const list = isV ? V_SCALE : YDS;

  const filtered = entries
    .filter((e) => isV ? e.gradeScale === "V_SCALE" : e.gradeScale === "YDS")
    .map((e) => ({ idx: gradeIdx(e.grade, isV), grade: e.grade, date: new Date(e.createdAt) }))
    .filter((e) => e.idx >= 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const routeEntries = entries.filter((e) => e.gradeScale === "YDS");
  const boulderEntries = entries.filter((e) => e.gradeScale === "V_SCALE");

  if (routeEntries.length === 0 && boulderEntries.length === 0) return null;

  const W = 320;
  const H = 120;
  const PAD = { top: 12, right: 16, bottom: 24, left: 40 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  if (filtered.length === 0) {
    return (
      <div className="rounded-[24px] border border-ink/10 bg-white/80 p-4">
        <div className="flex gap-2 mb-4">
          {(["routes","boulders"] as Tab[]).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${tab === t ? "bg-pine text-chalk" : "border border-ink/10 text-ink/50 hover:text-ink"}`}>
              {t === "routes" ? "Routes" : "Boulders"}
            </button>
          ))}
        </div>
        <p className="text-xs text-ink/40 text-center py-4">No {tab} logged yet.</p>
      </div>
    );
  }

  const minIdx = Math.max(0, Math.min(...filtered.map((e) => e.idx)) - 1);
  const maxIdx = Math.min(list.length - 1, Math.max(...filtered.map((e) => e.idx)) + 1);
  const idxRange = maxIdx - minIdx || 1;

  const minTime = filtered[0].date.getTime();
  const maxTime = filtered[filtered.length - 1].date.getTime();
  const timeRange = maxTime - minTime || 1;

  function toX(date: Date) {
    return PAD.left + ((date.getTime() - minTime) / timeRange) * plotW;
  }
  function toY(idx: number) {
    return PAD.top + plotH - ((idx - minIdx) / idxRange) * plotH;
  }

  // Rolling max line
  const maxLine: { x: number; y: number }[] = [];
  let runningMax = -1;
  filtered.forEach((e) => {
    if (e.idx > runningMax) runningMax = e.idx;
    maxLine.push({ x: toX(e.date), y: toY(runningMax) });
  });

  const pathD = maxLine.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

  // Y-axis ticks (every 2 grades in the visible range)
  const yTicks: number[] = [];
  for (let i = minIdx; i <= maxIdx; i += Math.max(1, Math.floor(idxRange / 4))) {
    yTicks.push(i);
  }

  // Format date label
  function fmtDate(d: Date) {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return (
    <div className="rounded-[24px] border border-ink/10 bg-white/80 p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink/50">Grade progression</p>
        <div className="flex gap-1.5">
          {([["routes", routeEntries.length > 0], ["boulders", boulderEntries.length > 0]] as [Tab, boolean][])
            .filter(([, has]) => has)
            .map(([t]) => (
              <button key={t} type="button" onClick={() => setTab(t)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${tab === t ? "bg-pine text-chalk" : "border border-ink/10 text-ink/50 hover:text-ink"}`}>
                {t === "routes" ? "Routes" : "Boulders"}
              </button>
            ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        {/* Grid lines */}
        {yTicks.map((idx) => (
          <g key={idx}>
            <line x1={PAD.left} y1={toY(idx)} x2={W - PAD.right} y2={toY(idx)}
              stroke="currentColor" strokeOpacity={0.06} strokeWidth={1} />
            <text x={PAD.left - 6} y={toY(idx) + 4} textAnchor="end"
              fontSize={9} fill="currentColor" fillOpacity={0.4}>
              {list[idx]}
            </text>
          </g>
        ))}

        {/* Max line */}
        {maxLine.length > 1 && (
          <path d={pathD} fill="none" stroke="#274E45" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        )}

        {/* Dots */}
        {filtered.map((e, i) => (
          <circle key={i} cx={toX(e.date)} cy={toY(e.idx)} r={3}
            fill="#274E45" fillOpacity={0.7} />
        ))}

        {/* X axis labels */}
        {[filtered[0], filtered[filtered.length - 1]].filter((v, i, a) => a.indexOf(v) === i).map((e, i) => (
          <text key={i} x={toX(e.date)} y={H - 4} textAnchor={i === 0 ? "start" : "end"}
            fontSize={9} fill="currentColor" fillOpacity={0.4}>
            {fmtDate(e.date)}
          </text>
        ))}
      </svg>

      {/* Summary */}
      <div className="mt-2 flex items-center justify-between">
        <p className="text-xs text-ink/40">{filtered.length} climb{filtered.length !== 1 ? "s" : ""} logged</p>
        <p className="text-xs font-semibold text-pine">
          Best: {list[Math.max(...filtered.map((e) => e.idx))]}
        </p>
      </div>
    </div>
  );
}
