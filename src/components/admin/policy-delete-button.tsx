"use client";

import { Trash2 } from "lucide-react";

import { deletePolicyAction } from "@/app/admin/policies/actions";
import { AdminConfirm } from "@/components/admin/ui/admin-confirm";

export function PolicyDeleteButton({ policyId, title }: { policyId: string; title: string }) {
  return (
    <AdminConfirm
      title="Delete this policy?"
      body={
        <>
          <span className="font-semibold text-white">{title}</span> and every recorded acknowledgment of it
          go together — you lose the evidence of who agreed to it and when. If it is merely out of date,
          publish a new version instead.
        </>
      }
      onConfirm={() => deletePolicyAction(policyId)}
      trigger={(open, pending) => (
        <button
          type="button"
          disabled={pending}
          onClick={open}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:border-red-500/50 hover:bg-red-500/20 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {pending ? "Deleting…" : "Delete"}
        </button>
      )}
    />
  );
}
