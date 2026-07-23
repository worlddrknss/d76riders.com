"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";

export type ProfileTab = {
  id: string;
  label: string;
  count?: number | null;
  content: ReactNode;
};

/**
 * Profile sections, addressable by URL.
 *
 * The tab lives in ?tab= rather than only in component state, because plenty of
 * things need to send a rider to a specific section: the onboarding quests want
 * the emergency card, and a rider sharing "look at my garage" expects the link to
 * open the garage. Local state alone meant every one of those landed on Overview.
 *
 * State is kept alongside the URL rather than read from it on every render, so a
 * click paints immediately instead of waiting for the router. The URL is updated
 * without scrolling, since the tab rail is already under the reader's eye.
 */
export function ProfileTabs({ tabs }: { tabs: ProfileTab[] }) {
  const router = useRouter();
  const searchParams = useSearchParams() ?? new URLSearchParams();

  const requested = searchParams.get("tab");
  const resolved = tabs.some((tab) => tab.id === requested) ? requested : tabs[0]?.id;

  const [active, setActive] = useState(resolved);

  // Follow the URL when it changes underneath us — e.g. the nav dropdown links
  // to ?tab=gear while the rider is already on their profile. Adjusted at render
  // (not an effect) so it stays in step without a flash. Clicks still paint
  // instantly via select() below; this only reconciles external URL changes.
  const [seenRequested, setSeenRequested] = useState(requested);
  if (requested !== seenRequested) {
    setSeenRequested(requested);
    setActive(resolved);
  }

  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  function select(id: string) {
    setActive(id);

    const next = new URLSearchParams(searchParams.toString());
    if (id === tabs[0]?.id) {
      // The default section doesn't need saying, and a bare URL shares better.
      next.delete("tab");
    } else {
      next.set("tab", id);
    }
    const query = next.toString();
    router.replace(query ? `?${query}` : "?", { scroll: false });
  }

  return (
    <div>
      {/* Rendered as the bottom rail of the profile header card above it, so it
          carries the card's side/bottom borders and rounding rather than a
          plain underline.

          It scrolls only where it has to: five short tabs never overflow a
          desktop card, but overflow-x-auto still made this a scroll container
          at every width, which macOS draws scrollbar chrome on. Below sm it can
          genuinely run out of room, so it scrolls there with the bar hidden. */}
      <div
        role="tablist"
        aria-label="Profile sections"
        className="flex gap-1 overflow-x-auto rounded-b-2xl border border-border bg-surface px-2 shadow-soft scrollbar-none sm:overflow-x-visible sm:px-4"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === current?.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => select(tab.id)}
              className={`relative -mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors ${
                isActive
                  ? "border-sunset text-sunset"
                  : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {tab.label}
              {tab.count != null && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold tabular-nums ${
                    isActive ? "bg-sunset/10 text-sunset" : "bg-canvas text-muted"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-6">{current?.content}</div>
    </div>
  );
}
