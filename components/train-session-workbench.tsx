"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Pencil, Save } from "lucide-react";

type ExerciseBlock = {
  id: string;
  title: string;
  detail: string;
  section: "main" | "cooldown" | "support";
};

type TrainSessionWorkbenchProps = {
  sessionId: string;
  sessionTitle: string;
  mainWork: string;
  cooldown?: string | null;
  whyChosen?: string | null;
};

type StoredExercise = {
  title: string;
  detail: string;
  fatigue: "light" | "moderate" | "high";
  done: boolean;
};

const FATIGUE_OPTIONS: Array<StoredExercise["fatigue"]> = ["light", "moderate", "high"];

function splitIntoBlocks(text?: string | null) {
  if (!text) return [];

  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildBlocks(mainWork: string, cooldown?: string | null, whyChosen?: string | null): ExerciseBlock[] {
  const main = splitIntoBlocks(mainWork).map((detail, index) => ({
    id: `main-${index}`,
    title: `Exercise ${index + 1}`,
    detail,
    section: "main" as const,
  }));

  const support = splitIntoBlocks(whyChosen).slice(0, 2).map((detail, index) => ({
    id: `support-${index}`,
    title: index === 0 ? "Focus cue" : `Support cue ${index + 1}`,
    detail,
    section: "support" as const,
  }));

  const cooldownBlocks = splitIntoBlocks(cooldown).map((detail, index) => ({
    id: `cooldown-${index}`,
    title: `Cool-down ${index + 1}`,
    detail,
    section: "cooldown" as const,
  }));

  return [...main, ...support, ...cooldownBlocks];
}

function sectionLabel(section: ExerciseBlock["section"]) {
  if (section === "main") return "Main";
  if (section === "cooldown") return "Cool-down";
  return "Cue";
}

export function TrainSessionWorkbench({
  sessionId,
  sessionTitle,
  mainWork,
  cooldown,
  whyChosen,
}: TrainSessionWorkbenchProps) {
  const storageKey = `climb:train-workbench:${sessionId}`;
  const journalKey = `climb:train-journal:${sessionId}`;
  const baseBlocks = useMemo(() => buildBlocks(mainWork, cooldown, whyChosen), [mainWork, cooldown, whyChosen]);
  const [blocks, setBlocks] = useState<Record<string, StoredExercise>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [journal, setJournal] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      const stored = raw ? (JSON.parse(raw) as Record<string, StoredExercise>) : {};
      const next: Record<string, StoredExercise> = {};
      for (const block of baseBlocks) {
        next[block.id] = stored[block.id] ?? {
          title: block.title,
          detail: block.detail,
          fatigue: block.section === "main" ? "moderate" : "light",
          done: false,
        };
      }
      setBlocks(next);
      setJournal(localStorage.getItem(journalKey) ?? "");
    } catch {
      const next: Record<string, StoredExercise> = {};
      for (const block of baseBlocks) {
        next[block.id] = {
          title: block.title,
          detail: block.detail,
          fatigue: block.section === "main" ? "moderate" : "light",
          done: false,
        };
      }
      setBlocks(next);
    }
  }, [baseBlocks, storageKey, journalKey]);

  useEffect(() => {
    if (!Object.keys(blocks).length) return;
    localStorage.setItem(storageKey, JSON.stringify(blocks));
  }, [blocks, storageKey]);

  useEffect(() => {
    localStorage.setItem(journalKey, journal);
  }, [journal, journalKey]);

  function updateBlock(id: string, patch: Partial<StoredExercise>) {
    setBlocks((current) => ({
      ...current,
      [id]: {
        ...current[id],
        ...patch,
      },
    }));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-ink/10 bg-white/80 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-pine">Session blocks</p>
        <p className="mt-1 text-sm text-ink/60">
          {sessionTitle} broken into editable steps. Mark what is done, tweak short labels, and rate how tiring each block feels.
        </p>
      </div>

      <div className="grid gap-3">
        {baseBlocks.map((block, index) => {
          const current = blocks[block.id];
          if (!current) return null;

          return (
            <div key={block.id} className="rounded-[24px] border border-ink/10 bg-white/80 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => updateBlock(block.id, { done: !current.done })}
                    className="mt-0.5 text-pine"
                    aria-label={current.done ? "Mark as not done" : "Mark as done"}
                  >
                    {current.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                  </button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-pine/15 bg-pine/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-pine">
                        {sectionLabel(block.section)}
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/35">Step {index + 1}</span>
                    </div>
                    {editingId === block.id ? (
                      <div className="mt-2 grid gap-2">
                        <input
                          value={current.title}
                          onChange={(event) => updateBlock(block.id, { title: event.target.value })}
                          className="rounded-2xl border border-ink/10 bg-mist/40 px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/15"
                        />
                        <input
                          value={current.detail}
                          onChange={(event) => updateBlock(block.id, { detail: event.target.value })}
                          className="rounded-2xl border border-ink/10 bg-mist/40 px-3 py-2 text-sm text-ink outline-none focus:border-pine focus:ring-2 focus:ring-pine/15"
                        />
                      </div>
                    ) : (
                      <>
                        <p className="mt-2 text-sm font-semibold text-ink">{current.title}</p>
                        <p className="mt-1 text-sm leading-6 text-ink/65">{current.detail}</p>
                      </>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingId((value) => (value === block.id ? null : block.id))}
                  className="inline-flex items-center gap-1 rounded-full border border-ink/10 px-3 py-1.5 text-xs font-semibold text-ink/60 transition hover:border-pine/30 hover:text-pine"
                >
                  {editingId === block.id ? <Save className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                  {editingId === block.id ? "Done" : "Edit"}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {FATIGUE_OPTIONS.map((option) => {
                  const active = current.fatigue === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => updateBlock(block.id, { fatigue: option })}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${
                        active
                          ? option === "high"
                            ? "border-clay/25 bg-clay/10 text-clay"
                            : option === "moderate"
                              ? "border-sandstone/40 bg-sandstone/25 text-clay"
                              : "border-moss/25 bg-moss/10 text-pine"
                          : "border-ink/10 bg-white text-ink/55 hover:border-pine/25 hover:text-pine"
                      }`}
                    >
                      {option} tiring
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-[24px] border border-ink/10 bg-white/80 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-pine">Journal</p>
        <p className="mt-1 text-sm text-ink/55">The one free-write space. Use it for what changed, what felt good, or what to remember next time.</p>
        <textarea
          value={journal}
          onChange={(event) => setJournal(event.target.value)}
          rows={5}
          placeholder="Examples: skin felt thin on third set, left shoulder warmed up slowly, project cue that worked..."
          className="mt-3 w-full rounded-[20px] border border-ink/10 bg-mist/35 px-4 py-3 text-sm text-ink outline-none resize-none focus:border-pine focus:ring-2 focus:ring-pine/15"
        />
      </div>
    </div>
  );
}
