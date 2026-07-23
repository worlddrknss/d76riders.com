"use client";

import { useRef, useState, useTransition } from "react";
import { Bookmark, MessageCircle, Share2 } from "lucide-react";

import {
  toggleJournalLikeAction,
  toggleJournalSaveAction,
  addJournalCommentAction,
} from "@/app/(site)/r/journal-actions";
import { JournalText } from "@/components/ui/journal-text";
import { TwoWheelsDownIcon } from "@/components/ui/two-wheels-down-icon";

type CommentData = {
  id: string;
  body: string;
  authorName: string;
  authorHandle: string;
  createdAt: string;
};

type JournalInteractionsProps = {
  entryId: string;
  likeCount: number;
  commentCount: number;
  isLiked: boolean;
  isSaved: boolean;
  isAuthenticated: boolean;
  comments: CommentData[];
  entryUrl: string;
};

export function JournalInteractions({
  entryId,
  likeCount,
  commentCount,
  isLiked,
  isSaved,
  isAuthenticated,
  comments,
  entryUrl,
}: JournalInteractionsProps) {
  const [showComments, setShowComments] = useState(false);
  // Like and save paint immediately rather than waiting on the server.
  //
  // Relying on revalidation alone never worked in the feed: FeedList re-seeds
  // only when the first page's `${id}:${length}` signature changes, and a like
  // changes neither an id nor the count — so the client kept its stale copy and
  // the reaction only appeared after a manual reload.
  const [liked, setLiked] = useState(isLiked);
  const [count, setCount] = useState(likeCount);
  const [saved, setSaved] = useState(isSaved);

  // Re-sync when the server does send new values, adjusted at render rather
  // than in an effect, matching the reset pattern used elsewhere.
  const [fromServer, setFromServer] = useState({ isLiked, likeCount, isSaved });
  if (
    fromServer.isLiked !== isLiked ||
    fromServer.likeCount !== likeCount ||
    fromServer.isSaved !== isSaved
  ) {
    setFromServer({ isLiked, likeCount, isSaved });
    setLiked(isLiked);
    setCount(likeCount);
    setSaved(isSaved);
  }
  const [likePending, startLikeTransition] = useTransition();
  const [savePending, startSaveTransition] = useTransition();
  const [commentPending, startCommentTransition] = useTransition();
  const [shared, setShared] = useState(false);
  const commentFormRef = useRef<HTMLFormElement>(null);

  function handleLike() {
    if (!isAuthenticated) return;
    const next = !liked;
    setLiked(next);
    setCount((c) => Math.max(0, c + (next ? 1 : -1)));
    startLikeTransition(async () => {
      try {
        await toggleJournalLikeAction(entryId);
      } catch {
        // Put it back rather than leaving a reaction the server never recorded.
        setLiked(!next);
        setCount((c) => Math.max(0, c + (next ? -1 : 1)));
      }
    });
  }

  function handleSave() {
    if (!isAuthenticated) return;
    const next = !saved;
    setSaved(next);
    startSaveTransition(async () => {
      try {
        await toggleJournalSaveAction(entryId);
      } catch {
        setSaved(!next);
      }
    });
  }

  function handleComment(formData: FormData) {
    startCommentTransition(async () => {
      await addJournalCommentAction(entryId, formData);
      commentFormRef.current?.reset();
    });
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ url: entryUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.origin + entryUrl).then(() => {
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }).catch(() => {});
    }
  }

  return (
    <div className="border-t border-border">
      {/* Action bar */}
      <div className="flex items-center gap-4 px-5 py-2.5">
        <button
          type="button"
          onClick={handleLike}
          disabled={likePending || !isAuthenticated}
          title="Two wheels down — keep it rubber-side down, ride safe"
          className={`inline-flex items-center gap-1.5 text-sm font-medium transition ${
            liked ? "text-forest" : "text-muted hover:text-forest"
          } disabled:opacity-50`}
        >
          <TwoWheelsDownIcon className="h-4.5 w-4.5" filled={liked} />
          {count > 0 ? count : "Two down"}
        </button>

        <button
          type="button"
          onClick={() => setShowComments((v) => !v)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-sunset"
        >
          <MessageCircle className="h-4 w-4" />
          {commentCount > 0 ? commentCount : "Comment"}
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-sunset"
        >
          <Share2 className="h-4 w-4" />
          {shared ? "Copied!" : "Share"}
        </button>

        {isAuthenticated && (
          <button
            type="button"
            onClick={handleSave}
            disabled={savePending}
            title={saved ? "Saved — tap to remove" : "Save this post"}
            className={`ml-auto inline-flex items-center gap-1.5 text-sm font-medium transition ${
              saved ? "text-ink" : "text-muted hover:text-ink"
            } disabled:opacity-50`}
          >
            <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
            {saved ? "Saved" : "Save"}
          </button>
        )}
      </div>

      {/* Comments section */}
      {showComments && (
        <div className="border-t border-border px-5 py-3">
          {comments.length > 0 && (
            <div className="space-y-2.5">
              {comments.map((comment) => (
                <div key={comment.id} className="text-sm">
                  <span className="font-semibold text-ink">{comment.authorName}</span>{" "}
                  <span className="text-muted"><JournalText text={comment.body} /></span>
                </div>
              ))}
            </div>
          )}

          {isAuthenticated && (
            <form ref={commentFormRef} action={handleComment} className="mt-3 flex gap-2">
              <input
                name="body"
                required
                placeholder="Write a comment…"
                className="flex-1 rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus:border-sunset/50 focus:outline-none"
              />
              <button
                type="submit"
                disabled={commentPending}
                className="rounded-lg bg-sunset px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#cf5a26] disabled:opacity-50"
              >
                {commentPending ? "…" : "Post"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
