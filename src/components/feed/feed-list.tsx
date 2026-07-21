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
  const [offset, setOffset] = useState(initial.length);
  const [pending, start] = useTransition();
  const sentinel = useRef<HTMLDivElement>(null);

  // Re-seed from the server's first page when it changes — e.g. after a
  // router.refresh() following a publish/delete. Adjusting state during render
  // (React's recommended reset pattern) beats an effect, which would flash and
  // trip the cascading-render lint. useState(initial) alone ignores the new prop.
  const firstPageSig = initial.length > 0 ? `${initial[0].id}:${initial.length}` : `empty`;
  const [seededSig, setSeededSig] = useState(firstPageSig);
  if (seededSig !== firstPageSig) {
    setSeededSig(firstPageSig);
    setEntries(initial);
    setDone(initial.length < pageSize);
    setOffset(initial.length);
  }

  const loadMore = useCallback(() => {
    if (pending || done) return;
    start(async () => {
      const more = await loadFeedAction(mode, offset);
      setEntries((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        return [...prev, ...more.filter((e) => !seen.has(e.id))];
      });
      setOffset((o) => o + more.length);
      if (more.length < pageSize) setDone(true);
    });
  }, [mode, pending, done, pageSize, offset]);

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
