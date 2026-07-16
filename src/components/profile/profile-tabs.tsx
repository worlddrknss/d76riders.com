"use client";

import { useState, type ReactNode } from "react";

export type ProfileTab = {
  id: string;
  label: string;
  count?: number | null;
  content: ReactNode;
};

export function ProfileTabs({ tabs }: { tabs: ProfileTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];

  return (
    <div>
      {/* Rendered as the bottom rail of the profile header card above it, so it
          carries the card's side/bottom borders and rounding rather than a
          plain underline. */}
      <div
        role="tablist"
        aria-label="Profile sections"
        className="flex gap-1 overflow-x-auto rounded-b-2xl border border-t border-border bg-surface px-2 shadow-soft sm:px-4"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === current?.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.id)}
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
