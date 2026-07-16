"use client";

import { useState, useTransition } from "react";
import { Flag } from "lucide-react";

import { reportContentAction, type ReportFormState } from "@/app/(site)/report/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const reasons = [
  { value: "SPAM", label: "Spam" },
  { value: "HARASSMENT", label: "Harassment" },
  { value: "INAPPROPRIATE", label: "Inappropriate Content" },
  { value: "MISINFORMATION", label: "Misinformation" },
  { value: "OTHER", label: "Other" },
] as const;

export type ReportSubject =
  | "JOURNAL_ENTRY"
  | "COMMENT"
  | "EVENT"
  | "GALLERY_ITEM"
  | "RIDER"
  | "NEWS_POST";

type ReportButtonProps = {
  subjectType: ReportSubject;
  subjectId: string;
  /** What the dialog calls the reported thing, e.g. "Photo", "Comment". */
  label?: string;
  className?: string;
};

export function ReportButton({ subjectType, subjectId, label = "Content", className }: ReportButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [result, setResult] = useState<ReportFormState | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    if (!reason) return;
    startTransition(async () => {
      const res = await reportContentAction(subjectType, subjectId, reason, details);
      setResult(res);
      if (res.success) {
        setTimeout(() => setOpen(false), 1500);
      }
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setResult(null);
          setReason("");
          setDetails("");
          setOpen(true);
        }}
        className={className ?? "h-7 w-7 text-muted hover:text-red-600"}
        title={`Report this ${label.toLowerCase()}`}
      >
        <Flag className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Report {label}</DialogTitle>
          </DialogHeader>

          {result?.success ? (
            <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {result.success}
            </p>
          ) : (
            <div className="mt-3 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">Reason</label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm text-ink"
                >
                  <option value="">Select a reason…</option>
                  {reasons.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Details (optional)
                </label>
                <Textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  placeholder="Any additional context…"
                  className="mt-1"
                />
              </div>

              {result?.error && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {result.error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button variant="accent" size="sm" onClick={handleSubmit} disabled={pending || !reason}>
                  {pending ? "Submitting…" : "Submit Report"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
