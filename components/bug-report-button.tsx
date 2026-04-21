"use client";

import { useRef, useState, useTransition } from "react";
import { Bug, X } from "lucide-react";
import { submitBugReportAction } from "@/app/actions";

export function BugReportButton() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  function openModal() {
    setDone(false);
    setError("");
    setOpen(true);
    dialogRef.current?.showModal();
  }

  function closeModal() {
    setOpen(false);
    dialogRef.current?.close();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    // Capture the current page URL
    fd.set("url", window.location.href);
    setError("");
    startTransition(async () => {
      const result = await submitBugReportAction(fd);
      if (result?.ok) {
        setDone(true);
      } else {
        setError(result?.error ?? "Something went wrong.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        title="Report a bug"
        className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/10 bg-chalk/90 text-ink/50 shadow-[0_4px_12px_rgba(15,36,32,0.08)] backdrop-blur transition hover:border-clay/30 hover:text-clay"
      >
        <Bug className="h-3.5 w-3.5" />
      </button>

      {/* Native dialog for accessibility + backdrop */}
      <dialog
        ref={dialogRef}
        onClose={closeModal}
        className="m-auto w-full max-w-md rounded-[28px] border border-ink/10 bg-chalk p-0 shadow-[0_24px_60px_rgba(15,36,32,0.22)] backdrop:bg-ink/40 backdrop:backdrop-blur-sm open:flex open:flex-col"
      >
        <div className="flex items-center justify-between border-b border-ink/8 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-ink">Report a bug</p>
            <p className="text-xs text-ink/45 mt-0.5">We read every report — thanks for helping.</p>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/10 text-ink/40 transition hover:border-ink/25 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="px-5 py-8 text-center space-y-2">
            <p className="text-2xl">✓</p>
            <p className="text-sm font-semibold text-ink">Got it — thanks!</p>
            <p className="text-xs text-ink/50">We'll look into it.</p>
            <button
              type="button"
              onClick={closeModal}
              className="mt-4 rounded-full bg-pine px-6 py-2.5 text-sm font-semibold text-chalk transition hover:bg-ink"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink/55">Short title</label>
              <input
                name="title"
                required
                placeholder="e.g. Schedule edit crashes on iOS"
                className="w-full rounded-xl border border-ink/10 bg-mist/30 px-3 py-2.5 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/15"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-ink/55">What happened?</label>
              <textarea
                name="description"
                required
                rows={4}
                placeholder="Describe what you were doing and what went wrong. Screenshots or steps to reproduce are super helpful."
                className="w-full resize-none rounded-xl border border-ink/10 bg-mist/30 px-3 py-2.5 text-sm outline-none focus:border-pine focus:ring-2 focus:ring-pine/15 placeholder:text-ink/30"
              />
            </div>

            {error && (
              <p className="rounded-xl border border-clay/20 bg-clay/5 px-3 py-2 text-xs font-semibold text-clay">{error}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={closeModal}
                className="flex-1 rounded-full border border-ink/10 py-2.5 text-sm font-semibold text-ink/55 transition hover:border-ink/25 hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 rounded-full bg-pine py-2.5 text-sm font-semibold text-chalk transition hover:bg-ink disabled:opacity-50"
              >
                {isPending ? "Sending…" : "Send report"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
