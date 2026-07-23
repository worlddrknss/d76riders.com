"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Trash2, X } from "lucide-react";

import { deleteStoryAction } from "@/app/(site)/stories/actions";

export type StoryItem = { id: string; url: string; caption: string | null; createdAt: string };
export type StoryGroup = {
  rider: { id: string; name: string; handle: string; avatarUrl: string | null };
  stories: StoryItem[];
};

const STORY_MS = 5000;

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export function StoryViewer({
  groups,
  startIndex,
  currentRiderId,
  onClose,
}: {
  groups: StoryGroup[];
  startIndex: number;
  currentRiderId: string | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [gi, setGi] = useState(startIndex);
  const [si, setSi] = useState(0);
  const [deletePending, startDelete] = useTransition();

  const group = groups[gi];
  const story = group?.stories[si];

  const next = useCallback(() => {
    if (group && si + 1 < group.stories.length) {
      setSi(si + 1);
    } else if (gi + 1 < groups.length) {
      setGi(gi + 1);
      setSi(0);
    } else {
      onClose();
    }
  }, [gi, si, group, groups, onClose]);

  const prev = useCallback(() => {
    if (si > 0) {
      setSi(si - 1);
    } else if (gi > 0) {
      const pg = gi - 1;
      setGi(pg);
      setSi(groups[pg].stories.length - 1);
    }
  }, [gi, si, groups]);

  // Auto-advance; the effect restarts whenever the visible story changes.
  useEffect(() => {
    if (!story) return;
    const t = setTimeout(next, STORY_MS);
    return () => clearTimeout(t);
  }, [gi, si, story, next]);

  // Keyboard controls.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  if (!group || !story) return null;

  const isOwn = currentRiderId === group.rider.id;

  function handleDelete() {
    startDelete(async () => {
      await deleteStoryAction(story!.id);
      router.refresh();
      // Drop the deleted story from view: if it was the last one, close.
      if (group!.stories.length <= 1) onClose();
      else next();
    });
  }

  return (
    <div className="safe-pt safe-pb fixed inset-0 z-[80] flex items-center justify-center bg-black">
      {/* progress segments */}
      <div className="absolute inset-x-0 top-0 z-10 flex gap-1 p-3">
        {group.stories.map((s, idx) => (
          <span key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
            <span
              className="block h-full bg-white"
              style={
                idx < si
                  ? { width: "100%" }
                  : idx === si
                    ? { animation: `storyfill ${STORY_MS}ms linear forwards` }
                    : { width: "0%" }
              }
              key={`${gi}-${si}-${idx}`}
            />
          </span>
        ))}
      </div>
      <style>{`@keyframes storyfill { from { width: 0% } to { width: 100% } }`}</style>

      {/* header */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-3 px-4 pt-6">
        <Link href={`/r/${group.rider.handle}`} onClick={onClose} className="flex items-center gap-2">
          {group.rider.avatarUrl ? (
            <img src={group.rider.avatarUrl} alt="" className="h-9 w-9 rounded-full border border-white/30 object-cover" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
              {group.rider.name.charAt(0)}
            </span>
          )}
          <span className="text-sm font-semibold text-white drop-shadow">{group.rider.name}</span>
          <span className="text-xs text-white/70">{timeAgo(story.createdAt)}</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {isOwn && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deletePending}
              className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50"
              aria-label="Delete story"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* image */}
      <img src={story.url} alt={story.caption ?? "Story"} className="max-h-full max-w-full object-contain" />

      {/* caption */}
      {story.caption && (
        <div className="absolute inset-x-0 bottom-0 z-10 bg-linear-to-t from-black/70 to-transparent px-6 pb-10 pt-16">
          <p className="mx-auto max-w-lg text-center text-sm text-white drop-shadow">{story.caption}</p>
        </div>
      )}

      {/* tap zones */}
      <button type="button" onClick={prev} className="absolute inset-y-0 left-0 z-0 w-1/3" aria-label="Previous" />
      <button type="button" onClick={next} className="absolute inset-y-0 right-0 z-0 w-2/3" aria-label="Next" />
    </div>
  );
}
