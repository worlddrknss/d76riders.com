"use client";

import { useTransition } from "react";
import type { ReportPriority, ReportSubjectType } from "@prisma/client";
import { Ban, ShieldAlert, Trash2 } from "lucide-react";

import {
  dismissReportAction,
  removeReportedContentAction,
  setReportPriorityAction,
} from "@/app/admin/triage/actions";

// What the destructive button does per subject type — mirrors the switch in
// removeReportedContentAction. Rider reports have no takedown path.
const REMOVE_COPY: Record<ReportSubjectType, { label: string; confirm: string } | null> = {
  JOURNAL_ENTRY: {
    label: "Remove Post",
    confirm: "Remove this journal entry permanently? This cannot be undone.",
  },
  COMMENT: { label: "Remove Comment", confirm: "Remove this comment permanently? This cannot be undone." },
  GALLERY_ITEM: { label: "Remove Photo", confirm: "Remove this photo permanently? This cannot be undone." },
  EVENT: { label: "Cancel Event", confirm: "Cancel this event? Riders who RSVP'd will see it as cancelled." },
  NEWS_POST: { label: "Unpublish Post", confirm: "Unpublish this news post and send it back to the author?" },
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
        <button
          type="button"
          onClick={() => {
            if (confirm(removeCopy.confirm)) {
              start(() => removeReportedContentAction(reportId));
            }
          }}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:border-red-500/50 hover:bg-red-500/20 disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {removeCopy.label}
        </button>
      ) : null}
    </div>
  );
}
