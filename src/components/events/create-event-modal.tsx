"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/**
 * Full-screen modal shell for the intercepted `/events/new` route. Fills the
 * viewport (Facebook-composer style): a header bar on top, then the form, which
 * lays itself out as fields + live preview. Closing returns the organizer to the
 * page they were on via router.back (the URL was masked to /events/new). A hard
 * refresh or direct visit skips this and loads the real page.
 *
 * Close is the X or Escape only — the create form is long, so no stray-click
 * dismiss.
 */
export function CreateEventModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const close = useCallback(() => router.back(), [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [close]);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-surface"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-event-modal-title"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3.5 sm:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Rider Tools</p>
          <h1 id="create-event-modal-title" className="font-display text-xl font-bold text-ink sm:text-2xl">
            Create Event
          </h1>
        </div>
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="-mr-1 rounded-lg p-2 text-muted transition hover:bg-canvas hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-sunset/50"
        >
          <X className="h-5 w-5" />
        </button>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
