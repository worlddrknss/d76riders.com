"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";

import {
  moderateDeleteReviewAction,
  submitSponsorReviewAction,
  type ReviewState,
} from "@/app/(site)/shops/review-actions";

export type ShopReview = {
  id: string;
  rating: number;
  body: string | null;
  createdAt: string; // ISO
  riderName: string;
  riderHandle: string;
  isMine: boolean;
};

const initial: ReviewState = { error: null, success: false };

/** Read-only star row. */
export function Stars({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex ${className}`} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-4 w-4 ${n <= Math.round(value) ? "fill-sunset text-sunset" : "text-border"}`}
        />
      ))}
    </span>
  );
}

/** Interactive star picker used inside the review form. */
function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          aria-checked={value === n}
          role="radio"
          className="p-0.5"
        >
          <Star className={`h-6 w-6 transition ${n <= shown ? "fill-sunset text-sunset" : "text-border hover:text-sunset/50"}`} />
        </button>
      ))}
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function ShopReviews({
  sponsorId,
  reviews,
  average,
  canReview,
  canModerate = false,
  myReview,
}: {
  sponsorId: string;
  reviews: ShopReview[];
  average: number;
  canReview: boolean;
  canModerate?: boolean;
  myReview: { rating: number; body: string | null } | null;
}) {
  const [state, submit, pending] = useActionState(
    async (_p: ReviewState, fd: FormData) => submitSponsorReviewAction(_p, fd),
    initial,
  );
  const [rating, setRating] = useState(myReview?.rating ?? 0);

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="font-display text-xl text-ink">Reviews</h2>
        {reviews.length > 0 && (
          <span className="inline-flex items-center gap-2 text-sm text-muted">
            <Stars value={average} />
            <span className="font-semibold text-ink">{average.toFixed(1)}</span>
            <span>({reviews.length})</span>
          </span>
        )}
      </div>

      {canReview ? (
        <form action={submit} className="rounded-xl border border-border bg-surface p-5 shadow-soft">
          <input type="hidden" name="sponsorId" value={sponsorId} />
          <input type="hidden" name="rating" value={rating} />
          <p className="text-sm font-medium text-ink">{myReview ? "Update your review" : "Leave a review"}</p>
          <div className="mt-2">
            <StarInput value={rating} onChange={setRating} />
          </div>
          <textarea
            name="body"
            rows={3}
            defaultValue={myReview?.body ?? ""}
            maxLength={2000}
            placeholder="Share your experience with this shop (optional)…"
            className="mt-3 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink focus:border-sunset focus:outline-none"
          />
          <div className="mt-3 flex items-center gap-3">
            <button
              type="submit"
              disabled={pending || rating === 0}
              className="rounded-lg bg-sunset px-4 py-2 text-sm font-semibold text-white hover:bg-sunset/85 disabled:opacity-60"
            >
              {pending ? "Saving…" : myReview ? "Update review" : "Post review"}
            </button>
            {state.success && <span className="text-sm text-forest">Thanks — your review is saved.</span>}
            {state.error && <span className="text-sm text-red-600">{state.error}</span>}
          </div>
        </form>
      ) : (
        <p className="rounded-xl border border-dashed border-border bg-canvas px-4 py-3 text-sm text-muted">
          Log in as a rider to leave a review.
        </p>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-muted">No reviews yet. Be the first.</p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-surface p-4 shadow-soft">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-ink">{r.riderName}</span>
                  {r.isMine && <span className="rounded-full bg-sunset/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase text-sunset">You</span>}
                </div>
                <Stars value={r.rating} />
              </div>
              {r.body && <p className="mt-2 text-sm leading-relaxed text-ink/80">{r.body}</p>}
              <div className="mt-1 flex items-center gap-3">
                <p className="text-xs text-muted">{formatDate(r.createdAt)}</p>
                {canModerate && (
                  <form action={moderateDeleteReviewAction.bind(null, r.id)}>
                    <button type="submit" className="text-xs font-semibold text-red-600 hover:underline">
                      Remove (mod)
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
