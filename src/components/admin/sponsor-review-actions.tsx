"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";

import { approveSponsorAction, rejectSponsorAction } from "@/app/admin/community/actions";

/**
 * Approve (with a tier) or reject (with a reason) a submitted business.
 *
 * Both are plain server-action forms — the only client state is which of the two
 * is showing.
 */
export function SponsorReviewActions({ sponsorId, name }: { sponsorId: string; name: string }) {
  const [rejecting, setRejecting] = useState(false);

  const approve = approveSponsorAction.bind(null, sponsorId);
  const reject = rejectSponsorAction.bind(null, sponsorId);

  if (rejecting) {
    return (
      <form action={reject} className="w-full shrink-0 space-y-2 sm:w-64">
        <label htmlFor={`reason-${sponsorId}`} className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Why not {name}?
        </label>
        <textarea
          id={`reason-${sponsorId}`}
          name="reason"
          rows={2}
          maxLength={300}
          placeholder="Kept for the record — not sent to them."
          className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white placeholder:text-slate-600"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRejecting(false)}
            className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:border-white/25"
          >
            Back
          </button>
          <button
            type="submit"
            className="flex-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/20"
          >
            Reject
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="w-full shrink-0 space-y-2 sm:w-48">
      <form action={approve} className="space-y-2">
        <label htmlFor={`tier-${sponsorId}`} className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Tier
          <select
            id={`tier-${sponsorId}`}
            name="tier"
            defaultValue="SUPPORTER"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-slate-200"
          >
            <option value="PARTNER">Partner</option>
            <option value="SUPPORTER">Supporter</option>
            <option value="FRIEND">Friend of the Community</option>
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-forest/40 bg-forest/15 px-3 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-forest/25"
        >
          <Check className="h-3.5 w-3.5" />
          Approve
        </button>
      </form>

      <button
        type="button"
        onClick={() => setRejecting(true)}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-white/25"
      >
        <X className="h-3.5 w-3.5" />
        Reject
      </button>
    </div>
  );
}
