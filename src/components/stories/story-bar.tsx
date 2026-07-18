"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { StoryComposer } from "./story-composer";
import { StoryViewer, type StoryGroup } from "./story-viewer";

function firstName(name: string): string {
  return name.split(" ")[0] ?? name;
}

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

  // Nothing to show and nothing to post — render nothing.
  if (!canPost && groups.length === 0) return null;

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-1">
        {canPost && (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="flex w-16 shrink-0 flex-col items-center gap-1.5"
          >
            <span className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border bg-canvas">
              {currentAvatarUrl ? (
                <img src={currentAvatarUrl} alt="" className="h-full w-full rounded-full object-cover opacity-90" />
              ) : null}
              <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-sunset text-white">
                <Plus className="h-3.5 w-3.5" />
              </span>
            </span>
            <span className="w-full truncate text-center text-xs text-muted">Your story</span>
          </button>
        )}

        {groups.map((g, i) => (
          <button
            key={g.rider.id}
            type="button"
            onClick={() => setViewerIndex(i)}
            className="flex w-16 shrink-0 flex-col items-center gap-1.5"
          >
            <span className="rounded-full bg-linear-to-br from-sunset to-[#cf5a26] p-[2.5px]">
              <span className="block rounded-full border-2 border-surface">
                {g.rider.avatarUrl ? (
                  <img src={g.rider.avatarUrl} alt={g.rider.name} className="h-[52px] w-[52px] rounded-full object-cover" />
                ) : (
                  <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-asphalt text-lg font-bold text-white">
                    {g.rider.name.charAt(0)}
                  </span>
                )}
              </span>
            </span>
            <span className="w-full truncate text-center text-xs text-ink">{firstName(g.rider.name)}</span>
          </button>
        ))}
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
