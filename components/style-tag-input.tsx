"use client";

import { useState, useRef, useEffect } from "react";

const STYLE_TAGS = [
  "Overhang", "Slab", "Vertical", "Cave", "Roof",
  "Crimpy", "Slopey", "Pinchy", "Jugy", "Pockets",
  "Gastons", "Underclings", "Sidepulls",
  "Dynamic", "Static", "Powerful", "Technical", "Balancy",
  "Compression", "Mantling", "High-step", "Heel hook", "Toe hook",
  "Drop knee", "Flag", "Cross-through", "Deadpoint", "Campus",
  "Pump", "Power endurance", "Sustained", "Bouldery",
  "Thin", "Wide", "Polished", "Sharp",
  "Mental", "Committing", "Exposure", "Runout",
];

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z]/g, "");
}

type Props = {
  name: string;
  className?: string;
};

export function StyleTagInput({ name, className }: Props) {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = query.trim()
    ? STYLE_TAGS.filter(
        (t) =>
          !selected.includes(t) &&
          normalize(t).includes(normalize(query))
      ).slice(0, 8)
    : [];

  function addTag(tag: string) {
    if (!selected.includes(tag)) {
      setSelected((s) => [...s, tag]);
    }
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function removeTag(tag: string) {
    setSelected((s) => s.filter((t) => t !== tag));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && suggestions.length > 0) {
      e.preventDefault();
      addTag(suggestions[0]);
    } else if (e.key === "Backspace" && !query && selected.length > 0) {
      removeTag(selected[selected.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const hiddenValue = JSON.stringify(selected);

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={hiddenValue} />

      <div
        className={`flex flex-wrap gap-1.5 min-h-[38px] cursor-text rounded-xl border border-ink/10 bg-mist/30 px-3 py-2 focus-within:border-pine focus-within:ring-2 focus-within:ring-pine/15 ${className ?? ""}`}
        onClick={() => inputRef.current?.focus()}
      >
        {selected.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-pine/10 px-2 py-0.5 text-xs font-semibold text-pine"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
              className="leading-none text-pine/50 hover:text-pine transition-colors"
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? "Overhang, Crimpy, Dynamic…" : ""}
          className="min-w-[120px] flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35"
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-ink/10 bg-chalk shadow-[0_8px_24px_rgba(15,36,32,0.12)] overflow-hidden">
          {suggestions.map((tag) => (
            <li key={tag}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); addTag(tag); }}
                className="w-full px-3 py-2 text-left text-sm text-ink hover:bg-pine/8 transition-colors"
              >
                {tag}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
