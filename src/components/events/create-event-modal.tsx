"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/**
 * Full-page modal shell for the intercepted `/events/new` route. Renders over
 * whatever page the organizer was on; closing returns them there via router.back
 * (the URL was masked to /events/new by the interception). A hard refresh or a
 * direct visit skips this entirely and loads the real page.
 *
 * Deliberately no backdrop-click-to-close: the create form is long, and a stray
 * click shouldn't wipe it. Close is the X or Escape only.
 */
export function CreateEventModal({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const close = useCallback(() => router.back(), [router]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    // Freeze the page behind the modal.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [close]);

  return (
    <div
      className="fixed inset-0 z-[60] overflow-y-auto bg-ink/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-event-modal-title"
    >
      <div className="mx-auto my-6 w-full max-w-4xl px-4">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-lift">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Rider Tools</p>
              <h1 id="create-event-modal-title" className="mt-0.5 font-display text-2xl font-semibold text-ink">
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
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
