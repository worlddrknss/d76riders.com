"use client";

import { useState, useTransition } from "react";

import { retireChallengeAction, type ChallengeActionState } from "@/app/(site)/challenges/actions";
import { Button } from "@/components/ui/button";

/**
 * Only shown to whoever set the challenge. Retiring deactivates rather than
 * deletes — riders joined and have progress, and wiping that because the setter
 * changed their mind would erase their record.
 */
export function RetireChallengeButton({ slug }: { slug: string }) {
  const [result, setResult] = useState<ChallengeActionState | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="text-right">
      <Button
        variant="outline"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm("Retire this challenge? It stops accepting riders and drops off the list.")) return;
          start(async () => setResult(await retireChallengeAction(slug)));
        }}
      >
        {pending ? "…" : "Retire"}
      </Button>
      {result?.error ? <p className="mt-1 max-w-48 text-xs text-red-600">{result.error}</p> : null}
    </div>
  );
}
