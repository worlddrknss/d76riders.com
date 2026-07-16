"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deleteBadgeAction } from "@/app/admin/badges/actions";

export function BadgeDeleteButton({ badgeId, name }: { badgeId: string; name: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`Delete "${name}"? Every rider holding it loses it. This cannot be undone.`)) {
          start(() => deleteBadgeAction(badgeId));
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:border-red-500/50 hover:bg-red-500/20 disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
