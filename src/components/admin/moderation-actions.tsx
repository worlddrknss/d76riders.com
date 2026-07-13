"use client";

import { useActionState, useState } from "react";

import { approveNewsPostAction, rejectNewsPostAction, type RejectFormState } from "@/app/admin/news/moderation/actions";

const initialRejectState: RejectFormState = { error: null };

export function ModerationActions({ postId }: { postId: string }) {
  const [showReject, setShowReject] = useState(false);

  const boundReject = rejectNewsPostAction.bind(null, postId);
  const [rejectState, rejectAction] = useActionState(boundReject, initialRejectState);

  return (
    <div className="flex flex-wrap items-start gap-3">
      <form action={approveNewsPostAction.bind(null, postId)}>
        <button type="submit" className="rounded-lg bg-forest px-4 py-2 text-sm font-semibold text-white hover:bg-forest/80">
          Approve & Publish
        </button>
      </form>

      {!showReject ? (
        <button type="button" onClick={() => setShowReject(true)} className="rounded-lg border border-red-400/50 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10">
          Reject
        </button>
      ) : (
        <form action={rejectAction} className="flex flex-1 flex-wrap items-end gap-2">
          <label className="grid flex-1 gap-1">
            <span className="text-xs text-slate-400">Rejection reason</span>
            <input name="reason" required className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sunset/70 focus:outline-none" placeholder="Why is this being rejected?" />
          </label>
          <button type="submit" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
            Confirm Reject
          </button>
          <button type="button" onClick={() => setShowReject(false)} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-slate-300 hover:bg-white/5">
            Cancel
          </button>
          {rejectState.error ? <p className="w-full text-sm text-red-300">{rejectState.error}</p> : null}
        </form>
      )}
    </div>
  );
}
