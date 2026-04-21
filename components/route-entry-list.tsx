"use client";

import { useState } from "react";
import { deleteRouteEntryAction } from "@/app/actions";

type RouteEntry = {
  id: string;
  title: string;
  grade: string;
  gymZoneLabel: string | null;
  environment: string;
  climbType: string;
  pumpLevel: number;
  cruxDifficulty: number;
  weaknessSummary: string | null;
  mainChallenges: string | null;
  styleTags: string | null;
};

function parseStyleTags(raw: string) {
  try {
    return (JSON.parse(raw) as string[]).join(", ");
  } catch {
    return raw;
  }
}

export function RouteEntryList({ entries }: { entries: RouteEntry[] }) {
  const [confirmId, setConfirmId] = useState<string | null>(null);

  function handleContextMenu(e: React.MouseEvent, id: string) {
    e.preventDefault();
    setConfirmId(id);
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => {
        if (confirmId === entry.id) {
          return (
            <div
              key={entry.id}
              className="rounded-[20px] border border-clay/25 bg-clay/5 p-4 animate-slide-up"
            >
              <p className="text-sm font-semibold text-ink">Delete &ldquo;{entry.title}&rdquo;?</p>
              <p className="mt-1 text-xs text-ink/55">This can&rsquo;t be undone.</p>
              <div className="mt-3 flex items-center gap-2">
                <form action={deleteRouteEntryAction}>
                  <input type="hidden" name="entryId" value={entry.id} />
                  <button
                    type="submit"
                    className="rounded-full bg-clay px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600"
                  >
                    Yes, delete
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => setConfirmId(null)}
                  className="rounded-full border border-ink/10 px-4 py-1.5 text-xs font-semibold text-ink/60 transition hover:border-ink/25 hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            </div>
          );
        }

        return (
          <div
            key={entry.id}
            onContextMenu={(e) => handleContextMenu(e, entry.id)}
            className="rounded-[20px] border border-ink/10 bg-white/70 p-4 select-none cursor-default"
            title="Right-click to delete"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{entry.title}</p>
                <p className="text-sm text-ink/55 mt-0.5">
                  {entry.grade}
                  {entry.gymZoneLabel ? ` · ${entry.gymZoneLabel}` : ` · ${entry.environment}`}
                  {` · ${entry.climbType.toLowerCase()}`}
                </p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <span className="rounded-full bg-mist px-2.5 py-1 text-xs font-semibold text-pine">
                  pump {entry.pumpLevel}
                </span>
                <span className="rounded-full bg-mist px-2.5 py-1 text-xs font-semibold text-ink/60">
                  crux {entry.cruxDifficulty}
                </span>
              </div>
            </div>
            {(entry.weaknessSummary || entry.mainChallenges) && (
              <p className="mt-2 text-sm text-ink/65 leading-relaxed">
                {entry.weaknessSummary || entry.mainChallenges}
              </p>
            )}
            {entry.styleTags && (
              <p className="mt-1.5 text-xs text-ink/40">{parseStyleTags(entry.styleTags)}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
