import Link from "next/link";
import { notFound } from "next/navigation";

import { escalateReportToIncidentAction } from "@/app/admin/triage/actions";
import { prisma } from "@/lib/prisma";
import { SUBJECT_LABEL } from "@/lib/triage";

export const dynamic = "force-dynamic";

export default async function EscalateReportPage(props: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await props.params;

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      reporter: { select: { handle: true } },
      subjectRider: { select: { handle: true, name: true } },
      event: { select: { title: true } },
    },
  });

  if (!report) {
    notFound();
  }

  const escalate = escalateReportToIncidentAction.bind(null, report.id);
  const suggestedTitle = `${report.reason.replaceAll("_", " ")} — ${SUBJECT_LABEL[report.subjectType]}`;

  return (
    <div className="space-y-6">
      <section className="route-lines rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Moderation</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">Escalate to Incident</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Opens a private case file for follow-up. The report is marked reviewed and linked to the incident.
        </p>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
        <h2 className="font-display text-lg font-semibold text-white">Report</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Type</dt>
            <dd className="text-slate-200">{SUBJECT_LABEL[report.subjectType]}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Reason</dt>
            <dd className="text-slate-200">{report.reason.replaceAll("_", " ")}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Reported by</dt>
            <dd className="text-slate-200">@{report.reporter.handle}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-slate-500">Filed</dt>
            <dd className="text-slate-200">{report.createdAt.toLocaleString("en-US")}</dd>
          </div>
        </dl>
        {report.details ? (
          <p className="mt-3 rounded-lg border border-white/5 bg-white/5 p-3 text-sm italic text-slate-300">
            &ldquo;{report.details}&rdquo;
          </p>
        ) : null}
      </section>

      <form action={escalate} className="space-y-4 rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
        <div>
          <label htmlFor="title" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Incident title
          </label>
          <input
            id="title"
            name="title"
            defaultValue={suggestedTitle}
            maxLength={200}
            required
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
        </div>

        <div>
          <label htmlFor="severity" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Severity
          </label>
          <select
            id="severity"
            name="severity"
            defaultValue={report.priority === "URGENT" ? "HIGH" : "NORMAL"}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <Link
            href="/admin/triage"
            className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-white/25 hover:text-white"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="rounded-lg border border-amber-400/40 bg-amber-400/15 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-400/25"
          >
            Open Incident
          </button>
        </div>
      </form>
    </div>
  );
}
