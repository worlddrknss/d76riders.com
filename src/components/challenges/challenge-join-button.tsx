"use client";

import { useState, useTransition } from "react";

import {
  joinChallengeAction,
  leaveChallengeAction,
  type ChallengeActionState,
} from "@/app/(site)/challenges/actions";
import { Button } from "@/components/ui/button";

type ChallengeJoinButtonProps = {
  slug: string;
  joined: boolean;
  /** Ended challenges can't be joined or left — the result is history. */
  ended: boolean;
};

export function ChallengeJoinButton({ slug, joined, ended }: ChallengeJoinButtonProps) {
  const [isIn, setIsIn] = useState(joined);
  const [result, setResult] = useState<ChallengeActionState | null>(null);
  const [pending, start] = useTransition();

  if (ended) {
    return <p className="text-xs text-muted">This challenge has finished.</p>;
  }

  return (
    <div className="text-right">
      <Button
        variant={isIn ? "outline" : "accent"}
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = isIn ? await leaveChallengeAction(slug) : await joinChallengeAction(slug);
            setResult(res);
            if (!res.error) setIsIn(!isIn);
          })
        }
      >
        {pending ? "…" : isIn ? "Leave Challenge" : "Join Challenge"}
      </Button>
      {result?.error ? <p className="mt-1 max-w-56 text-xs text-red-600">{result.error}</p> : null}
    </div>
  );
}
