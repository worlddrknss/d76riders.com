"use client";

import type { ReactNode } from "react";
import { Trash2 } from "lucide-react";

import { deleteChallengeAction, deleteCrewAction, deleteSponsorAction } from "@/app/admin/community/actions";
import { AdminConfirm } from "@/components/admin/ui/admin-confirm";

type CommunityDeleteButtonProps = {
  kind: "crew" | "sponsor" | "challenge";
  id: string;
  name: string;
  /** Icon-only, for sitting alongside the other actions in a table row. */
  compact?: boolean;
};

/**
 * Copy per kind, because "are you sure?" is not information.
 *
 * These used to go through the browser's own confirm(), which is unstyled,
 * illegible on the dark shell, blocks the tab, and gave the same flat line
 * whichever of the three you were deleting. What matters is what goes with it,
 * and that differs a lot: a sub-community takes its membership, a challenge
 * takes everyone's progress.
 */
const COPY: Record<CommunityDeleteButtonProps["kind"], { title: string; body: (name: ReactNode) => ReactNode }> = {
  crew: {
    title: "Delete this sub-community?",
    body: (name) => (
      <>
        Its members lose {name}, and every ride linked to it is unlinked. The rides themselves stay.
      </>
    ),
  },
  sponsor: {
    title: "Remove this business?",
    body: (name) => (
      <>
        {name} comes off the public directory and any ride it sponsors loses the credit. To take it out of
        the directory without losing the record, hide it instead.
      </>
    ),
  },
  challenge: {
    title: "Delete this challenge?",
    body: (name) => (
      <>
        Every rider&apos;s entry and progress in {name} goes with it. Riders who finished it lose the record
        that they did.
      </>
    ),
  },
};

export function CommunityDeleteButton({ kind, id, name, compact = false }: CommunityDeleteButtonProps) {
  const copy = COPY[kind];
  const strongName = <span className="font-semibold text-white">{name}</span>;

  return (
    <AdminConfirm
      title={copy.title}
      confirmLabel={kind === "sponsor" ? "Remove business" : "Delete"}
      body={copy.body(strongName)}
      onConfirm={() => {
        if (kind === "crew") return deleteCrewAction(id);
        if (kind === "challenge") return deleteChallengeAction(id);
        return deleteSponsorAction(id);
      }}
      trigger={(open, pending) => (
        <button
          type="button"
          disabled={pending}
          onClick={open}
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
      )}
    />
  );
}
