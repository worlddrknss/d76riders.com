"use client";

import { useTransition } from "react";
import type { ReportPriority, ReportSubjectType } from "@prisma/client";
import { Ban, ShieldAlert, Trash2 } from "lucide-react";

import {
  dismissReportAction,
  removeReportedContentAction,
  setReportPriorityAction,
} from "@/app/admin/triage/actions";
import { AdminConfirm } from "@/components/admin/ui/admin-confirm";

/**
 * What the destructive button does per subject type — mirrors the switch in
 * removeReportedContentAction. Rider reports have no takedown path.
 *
 * Note these are not all equally severe, which the old shared confirm() prompt
 * flattened: unpublishing an article returns it to its author and can be undone,
 * while removing a photo destroys the file.
 */
const REMOVE_COPY: Record<
  ReportSubjectType,
  { label: string; title: string; body: string } | null
> = {
  JOURNAL_ENTRY: {
    label: "Remove Post",
    title: "Remove this journal entry?",
    body: "The entry and its comments are deleted for good. The rider is not told which report caused it.",
  },
  COMMENT: {
    label: "Remove Comment",
    title: "Remove this comment?",
    body: "The comment is deleted for good, and any replies to it lose their context.",
  },
  GALLERY_ITEM: {
    label: "Remove Photo",
    title: "Remove this photo?",
    body: "The photo is deleted from the gallery and the file is removed from storage. There is no copy to restore from.",
  },
  EVENT: {
    label: "Cancel Event",
    title: "Cancel this ride?",
    body: "Everyone going to or tracking it is notified by push and email. The ride stays on the site marked cancelled, and its host can reopen it.",
  },
  NEWS_POST: {
    label: "Unpublish Post",
    title: "Unpublish this article?",
    body: "It goes back to its author as a draft and comes off the magazine. Nothing is deleted — they can revise and resubmit it.",
  },
  RIDER: null,
};

type TriageActionsProps = {
  reportId: string;
  priority: ReportPriority;
  subjectType: ReportSubjectType;
};

export function TriageActions({ reportId, priority, subjectType }: TriageActionsProps) {
  const [pending, start] = useTransition();
  const removeCopy = REMOVE_COPY[subjectType];

  return (
    <div className="flex w-full shrink-0 flex-col gap-2 sm:w-44">
      <label className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
        Priority
        <select
          value={priority}
          disabled={pending}
          onChange={(event) => {
            const next = event.target.value;
            start(() => setReportPriorityAction(reportId, next));
          }}
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs font-semibold text-slate-200 disabled:opacity-50"
        >
          <option value="URGENT">Urgent — 4h</option>
          <option value="NORMAL">Normal — 24h</option>
          <option value="LOW">Low — 72h</option>
        </select>
      </label>

      <button
        type="button"
        onClick={() => start(() => dismissReportAction(reportId))}
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
      >
        <Ban className="h-3.5 w-3.5" />
        Dismiss
      </button>

      <form action={`/admin/triage/${reportId}/escalate`} method="get">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex w-full items-center gap-1.5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200 transition hover:border-amber-400/50 hover:bg-amber-400/20 disabled:opacity-50"
        >
          <ShieldAlert className="h-3.5 w-3.5" />
          Escalate
        </button>
      </form>

      {removeCopy ? (
        <AdminConfirm
          title={removeCopy.title}
          confirmLabel={removeCopy.label}
          body={removeCopy.body}
          onConfirm={() => removeReportedContentAction(reportId)}
          trigger={(open, confirmPending) => (
            <button
              type="button"
              onClick={open}
              disabled={pending || confirmPending}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:border-red-500/50 hover:bg-red-500/20 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {removeCopy.label}
            </button>
          )}
        />
      ) : null}
    </div>
  );
}
