"use client";

import { useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

/**
 * Shared full-screen modal shell for intercepted "create" routes (new event, new
 * article). A header bar with an eyebrow + title on top, then the content fills
 * the rest of the viewport. Closing returns the user to the page they were on via
 * router.back (the URL was masked to the real route by the interception); a hard
 * refresh or direct visit skips this and loads the real page.
 *
 * Close is the X or Escape only — these forms are long, so no stray-click dismiss.
 */
export function FullPageModal({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
}) {
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
      className="safe-pb fixed inset-0 z-[60] flex flex-col bg-surface"
      role="dialog"
      aria-modal="true"
      aria-labelledby="full-page-modal-title"
    >
      <header className="safe-pt flex shrink-0 items-center justify-between gap-3 border-b border-border px-5 py-3.5 sm:px-8">
        <div>
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">{eyebrow}</p>
          ) : null}
          <h1 id="full-page-modal-title" className="font-display text-xl text-ink sm:text-2xl">
            {title}
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
