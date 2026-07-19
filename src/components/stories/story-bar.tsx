"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { StoryComposer } from "./story-composer";
import { StoryViewer, type StoryGroup } from "./story-viewer";

export function StoryBar({
  groups,
  currentRiderId,
  canPost,
  currentAvatarUrl,
}: {
  groups: StoryGroup[];
  currentRiderId: string | null;
  canPost: boolean;
  currentAvatarUrl: string | null;
}) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  if (!canPost && groups.length === 0) return null;

  return (
    <>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {/* Create story tile */}
        {canPost && (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="group relative flex h-48 w-28 shrink-0 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition hover:shadow-lift"
          >
            <div className="h-32 w-full overflow-hidden bg-asphalt">
              {currentAvatarUrl ? (
                <img
                  src={currentAvatarUrl}
                  alt=""
                  className="h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : null}
            </div>
            <div className="relative flex flex-1 items-end justify-center pb-2">
              <span className="absolute -top-4 flex h-9 w-9 items-center justify-center rounded-full border-4 border-surface bg-sunset text-white">
                <Plus className="h-4 w-4" />
              </span>
              <span className="text-xs font-semibold text-ink">Create story</span>
            </div>
          </button>
        )}

        {/* Rider story tiles */}
        {groups.map((g, i) => {
          const cover = g.stories[g.stories.length - 1]?.url;
          return (
            <button
              key={g.rider.id}
              type="button"
              onClick={() => setViewerIndex(i)}
              className="group relative h-48 w-28 shrink-0 overflow-hidden rounded-xl bg-asphalt shadow-soft transition hover:shadow-lift"
            >
              {cover ? (
                <img
                  src={cover}
                  alt={g.rider.name}
                  className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-105"
                />
              ) : null}
              <div className="absolute inset-0 bg-linear-to-b from-black/10 via-transparent to-black/70" />

              <span className="absolute left-2 top-2 rounded-full p-0.5 ring-2 ring-sunset">
                {g.rider.avatarUrl ? (
                  <img
                    src={g.rider.avatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full border-2 border-surface object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-surface bg-sunset text-xs font-bold text-white">
                    {g.rider.name.charAt(0)}
                  </span>
                )}
              </span>

              <span className="absolute inset-x-2 bottom-2 line-clamp-2 text-left text-xs font-semibold leading-tight text-white drop-shadow">
                {g.rider.name}
              </span>
            </button>
          );
        })}
      </div>

      {composerOpen && <StoryComposer onClose={() => setComposerOpen(false)} />}
      {viewerIndex !== null && (
        <StoryViewer
          groups={groups}
          startIndex={viewerIndex}
          currentRiderId={currentRiderId}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </>
  );
}
