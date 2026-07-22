"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import {
  deleteChallengeAction,
  deleteCrewAction,
  deleteSponsorAction,
} from "@/app/admin/community/actions";

type CommunityDeleteButtonProps = {
  kind: "crew" | "sponsor" | "challenge";
  id: string;
  name: string;
  /** Icon-only, for sitting alongside the other actions in a table row. */
  compact?: boolean;
};

const COPY: Record<CommunityDeleteButtonProps["kind"], string> = {
  crew: "Delete sub-community \"%s\"? Its members lose it and its rides are unlinked. This cannot be undone.",
  sponsor: "Remove sponsor \"%s\"? It is unlinked from every ride it backed. This cannot be undone.",
  challenge:
    "Delete challenge \"%s\"? Every rider's entry and progress in it goes too. This cannot be undone.",
};

export function CommunityDeleteButton({ kind, id, name, compact = false }: CommunityDeleteButtonProps) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(COPY[kind].replace("%s", name))) {
          start(() => {
            if (kind === "crew") return deleteCrewAction(id);
            if (kind === "challenge") return deleteChallengeAction(id);
            return deleteSponsorAction(id);
          });
        }
      }}
      title={compact ? `Delete ${name}` : undefined}
      className={
        compact
          ? "rounded-md p-1.5 text-slate-400 transition hover:bg-red-500/15 hover:text-red-300 disabled:opacity-50"
          : "inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:border-red-500/50 hover:bg-red-500/20 disabled:opacity-50"
      }
    >
      <Trash2 className={compact ? "h-4 w-4" : "h-3.5 w-3.5"} />
      {compact ? null : pending ? "Deleting…" : "Delete"}
    </button>
  );
}
