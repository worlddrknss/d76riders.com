"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";

import { loadFeedAction } from "@/app/(site)/feed-actions";
import { JournalGrid, type JournalGridEntry } from "@/components/profile/journal-grid";
import type { FeedMode } from "@/lib/feed";

/** The feed's post list with infinite scroll — appends pages as you reach the end. */
export function FeedList({
  initial,
  mode,
  pageSize,
}: {
  initial: JournalGridEntry[];
  mode: FeedMode;
  pageSize: number;
}) {
  const [entries, setEntries] = useState(initial);
  const [done, setDone] = useState(initial.length < pageSize);
  const [pending, start] = useTransition();
  const offsetRef = useRef(initial.length);
  const sentinel = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (pending || done) return;
    start(async () => {
      const more = await loadFeedAction(mode, offsetRef.current);
      setEntries((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        return [...prev, ...more.filter((e) => !seen.has(e.id))];
      });
      offsetRef.current += more.length;
      if (more.length < pageSize) setDone(true);
    });
  }, [mode, pending, done, pageSize]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || done) return;
    const obs = new IntersectionObserver(
      (ents) => {
        if (ents[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore, done]);

  return (
    <>
      <JournalGrid entries={entries} isOwner={false} isAuthenticated layout="feed" />
      {!done && (
        <div ref={sentinel} className="py-6 text-center text-sm text-muted">
          {pending ? "Loading…" : ""}
        </div>
      )}
    </>
  );
}
