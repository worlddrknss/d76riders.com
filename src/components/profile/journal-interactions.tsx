"use client";

import { useRef, useState, useTransition } from "react";
import { MessageCircle, Share2 } from "lucide-react";

import { toggleJournalLikeAction, addJournalCommentAction } from "@/app/(site)/r/journal-actions";
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
  isAuthenticated: boolean;
  comments: CommentData[];
  entryUrl: string;
};

export function JournalInteractions({
  entryId,
  likeCount,
  commentCount,
  isLiked,
  isAuthenticated,
  comments,
  entryUrl,
}: JournalInteractionsProps) {
  const [showComments, setShowComments] = useState(false);
  const [likePending, startLikeTransition] = useTransition();
  const [commentPending, startCommentTransition] = useTransition();
  const [shared, setShared] = useState(false);
  const commentFormRef = useRef<HTMLFormElement>(null);

  function handleLike() {
    if (!isAuthenticated) return;
    startLikeTransition(async () => {
      await toggleJournalLikeAction(entryId);
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
            isLiked ? "text-forest" : "text-muted hover:text-forest"
          } disabled:opacity-50`}
        >
          <TwoWheelsDownIcon className="h-4 w-4" filled={isLiked} />
          {likeCount > 0 ? likeCount : "Two down"}
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
