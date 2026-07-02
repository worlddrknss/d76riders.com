"use client";

import { useTransition, useState } from "react";
import { Star } from "lucide-react";

import { rateRoadAction } from "@/app/(site)/roads/actions";

type StarRatingProps = {
  roadId: string;
  initialAverage: number | null;
  initialTotal: number;
  initialUserRating: number | null;
  isAuthenticated: boolean;
};

export function StarRating({ roadId, initialAverage, initialTotal, initialUserRating, isAuthenticated }: StarRatingProps) {
  const [average, setAverage] = useState(initialAverage);
  const [total, setTotal] = useState(initialTotal);
  const [userRating, setUserRating] = useState(initialUserRating);
  const [hovered, setHovered] = useState(0);
  const [isPending, startTransition] = useTransition();

  function handleRate(score: number) {
    if (!isAuthenticated || isPending) return;
    startTransition(async () => {
      const result = await rateRoadAction(roadId, score);
      if (!result.error) {
        setAverage(result.averageRating);
        setTotal(result.totalRatings);
        setUserRating(result.userRating);
      }
    });
  }

  const displayRating = hovered || userRating || 0;

  return (
    <div className="rounded-lg border border-border bg-canvas p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-sunset">
        <Star className="h-3.5 w-3.5" />Scenic Rating
      </div>
      <p className="mt-1.5 text-sm font-medium text-ink">
        {average ? `${average.toFixed(1)} / 5.0` : "Not yet rated"}
      </p>
      <p className="text-xs text-muted">
        {total > 0 ? `${total} ${total === 1 ? "rating" : "ratings"}` : "Be the first to rate"}
      </p>

      {isAuthenticated ? (
        <div className="mt-3 flex items-center gap-0.5" onMouseLeave={() => setHovered(0)}>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              disabled={isPending}
              className="p-0.5 transition disabled:opacity-50"
              onMouseEnter={() => setHovered(star)}
              onClick={() => handleRate(star)}
              aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
            >
              <Star
                className={`h-5 w-5 transition ${
                  star <= displayRating
                    ? "fill-sunset text-sunset"
                    : "fill-none text-border"
                }`}
              />
            </button>
          ))}
          {userRating && (
            <span className="ml-2 text-xs text-muted">Your rating: {userRating}/5</span>
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted">Log in to rate this road</p>
      )}
    </div>
  );
}
