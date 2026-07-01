"use client";

import { useTransition } from "react";
import { Ban, Trash2 } from "lucide-react";

import { dismissReportAction, removeContentAction } from "@/app/admin/reports/actions";

export function ReportActions({ reportId }: { reportId: string }) {
  const [dismissPending, startDismiss] = useTransition();
  const [removePending, startRemove] = useTransition();

  return (
    <div className="flex shrink-0 flex-col gap-2">
      <button
        type="button"
        onClick={() => startDismiss(() => dismissReportAction(reportId))}
        disabled={dismissPending || removePending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
      >
        <Ban className="h-3.5 w-3.5" />
        {dismissPending ? "Dismissing…" : "Dismiss"}
      </button>
      <button
        type="button"
        onClick={() => {
          if (confirm("Remove this journal entry permanently? This cannot be undone.")) {
            startRemove(() => removeContentAction(reportId));
          }
        }}
        disabled={dismissPending || removePending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:border-red-500/50 hover:bg-red-500/20 disabled:opacity-50"
      >
        <Trash2 className="h-3.5 w-3.5" />
        {removePending ? "Removing…" : "Remove Post"}
      </button>
    </div>
  );
}
