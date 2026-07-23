"use client";

import { Bookmark, MessageCircle, Share2 } from "lucide-react";

import { JournalText } from "@/components/ui/journal-text";
import { TwoWheelsDownIcon } from "@/components/ui/two-wheels-down-icon";
import { VideoEmbed } from "@/components/ui/video-embed";

type JournalPreviewProps = {
  authorName: string;
  authorAvatarUrl: string | null;
  title: string;
  body: string;
  /** Object URL of the chosen photo, before upload. */
  photoUrl: string | null;
  videoUrl: string;
};

/**
 * What the entry will look like in the feed, mirroring JournalCard — same
 * header, media, title, and body treatment, so what a rider frames here is what
 * everyone else sees.
 *
 * The interaction row is deliberately inert: it exists because its absence made
 * the preview look like a different, smaller component than the real post.
 */
export function JournalPreview({
  authorName,
  authorAvatarUrl,
  title,
  body,
  photoUrl,
  videoUrl,
}: JournalPreviewProps) {
  const hasVideo = !photoUrl && videoUrl.trim().length > 0;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
      <div className="flex items-center gap-3 px-4 py-3">
        {authorAvatarUrl ? (
          <img
            src={authorAvatarUrl}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sunset/10 text-sm font-bold text-sunset">
            {authorName.charAt(0)}
          </span>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-sm font-semibold text-ink">{authorName}</p>
          <p className="text-xs text-muted">Just now</p>
        </div>
      </div>

      {photoUrl ? (
        <div className="aspect-[4/3] w-full overflow-hidden bg-asphalt">
          <img src={photoUrl} alt="" className="h-full w-full object-cover" />
        </div>
      ) : hasVideo ? (
        <VideoEmbed url={videoUrl} />
      ) : null}

      {title || body ? (
        <div className="px-4 pt-3">
          {title ? <h3 className="font-display text-base text-ink">{title}</h3> : null}
          {body ? (
            <p className="whitespace-pre-wrap text-sm text-muted">
              <JournalText text={body} />
            </p>
          ) : null}
        </div>
      ) : (
        <div className="px-4 pt-3">
          <p className="text-sm italic text-muted/70">Your story will appear here as you write it.</p>
        </div>
      )}

      {/* Inert — a preview shouldn't offer buttons that do nothing on a post
          that doesn't exist yet, but the row is what makes it read as a post. */}
      <div
        aria-hidden
        className="mt-3 flex items-center gap-5 border-t border-border px-4 py-2.5 text-muted/60"
      >
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
          <TwoWheelsDownIcon className="h-4.5 w-4.5" /> Two down
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
          <MessageCircle className="h-4 w-4" /> Comment
        </span>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
          <Share2 className="h-4 w-4" /> Share
        </span>
        <Bookmark className="ml-auto h-4 w-4" />
      </div>
    </article>
  );
}
