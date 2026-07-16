"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import { deletePolicyAction } from "@/app/admin/policies/actions";

export function PolicyDeleteButton({ policyId, title }: { policyId: string; title: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (
          confirm(`Delete "${title}"? Every recorded acknowledgment for it is deleted too. This cannot be undone.`)
        ) {
          start(() => deletePolicyAction(policyId));
        }
      }}
      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:border-red-500/50 hover:bg-red-500/20 disabled:opacity-50"
    >
      <Trash2 className="h-3.5 w-3.5" />
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
