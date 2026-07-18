"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";

import { voteRideOfMonthAction } from "@/app/(site)/ride-of-the-month/actions";

export function VoteButton({ eventId, voted }: { eventId: string; voted: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await voteRideOfMonthAction(eventId);
          router.refresh();
        })
      }
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition disabled:opacity-60 ${
        voted
          ? "bg-sunset text-white hover:bg-sunset/85"
          : "border border-border bg-surface text-ink hover:border-sunset/50"
      }`}
    >
      <Trophy className="h-4 w-4" />
      {voted ? "Voted" : "Vote"}
    </button>
  );
}
