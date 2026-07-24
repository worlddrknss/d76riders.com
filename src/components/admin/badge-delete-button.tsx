"use client";

import { Trash2 } from "lucide-react";

import { deleteBadgeAction } from "@/app/admin/badges/actions";
import { AdminConfirm } from "@/components/admin/ui/admin-confirm";

export function BadgeDeleteButton({ badgeId, name }: { badgeId: string; name: string }) {
  return (
    <AdminConfirm
      title="Delete this badge?"
      body={
        <>
          Every rider holding <span className="font-semibold text-white">{name}</span> loses it, and the
          record of them having earned it goes too.
        </>
      }
      onConfirm={() => deleteBadgeAction(badgeId)}
      trigger={(open, pending) => (
        <button
          type="button"
          disabled={pending}
          onClick={open}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:border-red-500/50 hover:bg-red-500/20 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {pending ? "Deleting…" : "Delete"}
        </button>
      )}
    />
  );
}
