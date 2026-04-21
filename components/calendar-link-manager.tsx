"use client";

import { useState } from "react";
import { importCalendarAction } from "@/app/actions";

type Props = {
  userId: string;
  initialUrls: string[];
  hasCalendar: boolean;
};

export function CalendarLinkManager({ userId, initialUrls, hasCalendar }: Props) {
  const [links, setLinks] = useState<string[]>(
    initialUrls.length ? initialUrls : [""],
  );

  function updateLink(index: number, value: string) {
    setLinks((cur) => cur.map((l, i) => (i === index ? value : l)));
  }

  function addLink() {
    setLinks((cur) => [...cur, ""]);
  }

  function removeLink(index: number) {
    setLinks((cur) => cur.length === 1 ? [""] : cur.filter((_, i) => i !== index));
  }

  // Join non-empty links for the hidden field
  const joined = links.filter((l) => l.trim()).join("\n");

  return (
    <form action={importCalendarAction} className="space-y-3">
      <input type="hidden" name="userId" value={userId} />
      {/* Single hidden field with all links newline-joined */}
      <input type="hidden" name="calendarUrls" value={joined} />

      <div className="space-y-2">
        {links.map((link, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              value={link}
              onChange={(e) => updateLink(index, e.target.value)}
              placeholder="https:// or webcal:// calendar URL"
              className="flex-1 rounded-xl border border-ink/10 bg-mist/30 px-3 py-2 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/15"
            />
            <button
              type="button"
              onClick={() => removeLink(index)}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-ink/10 text-ink/40 hover:border-clay/40 hover:text-clay transition-colors"
              title="Remove link"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={addLink}
          className="flex items-center gap-1.5 rounded-full border border-ink/10 px-3 py-1.5 text-xs font-semibold text-ink/60 hover:border-pine/40 hover:text-pine transition-colors"
        >
          <span className="text-base leading-none">+</span> Add link
        </button>

        <button
          type="submit"
          disabled={!joined}
          className="rounded-full bg-pine px-4 py-1.5 text-xs font-semibold text-chalk disabled:opacity-40 hover:bg-pine/85 transition-colors"
        >
          {hasCalendar ? "Save and sync" : "Connect calendar"}
        </button>
      </div>

      <p className="text-xs leading-5 text-ink/45">
        Paste an ICS link — both <span className="font-mono">https://</span> and <span className="font-mono">webcal://</span> work. In Apple Calendar, right-click a calendar and choose &ldquo;Get Info&rdquo;; in Google Calendar, go to Settings → your calendar → &ldquo;Secret address in iCal format.&rdquo;
      </p>
    </form>
  );
}
