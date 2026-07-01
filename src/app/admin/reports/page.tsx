import Link from "next/link";
import { Flag } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { ReportActions } from "@/components/admin/report-actions";

export default async function AdminReportsPage() {
  const reports = await prisma.report.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      reporter: {
        select: { name: true, handle: true },
      },
      journalEntry: {
        select: {
          id: true,
          title: true,
          body: true,
          author: {
            select: { name: true, handle: true },
          },
        },
      },
    },
  });

  const resolvedCount = await prisma.report.count({
    where: { status: { not: "PENDING" } },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-[linear-gradient(120deg,rgba(127,29,29,0.2),rgba(30,64,175,0.2))] p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Moderation</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">Reported Content</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-200">
          Review flagged journal entries. Dismiss false reports or remove content that violates community guidelines.
        </p>
        <div className="mt-4 flex gap-4 text-sm">
          <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 font-semibold text-amber-300">
            {reports.length} pending
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-400">
            {resolvedCount} resolved
          </span>
        </div>
      </section>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-[#020817]/85 p-12 text-center shadow-xl shadow-black/20">
          <Flag className="mx-auto h-8 w-8 text-slate-500" />
          <p className="mt-3 text-sm text-slate-400">No pending reports. The community is clean.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <article
              key={report.id}
              className="rounded-xl border border-white/10 bg-[#020817]/85 p-5 shadow-xl shadow-black/20"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
                      {report.reason.replaceAll("_", " ")}
                    </span>
                    <span className="text-xs text-slate-500">
                      {report.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>

                  <div className="mt-3">
                    <p className="text-xs text-slate-400">
                      Reported by <span className="font-semibold text-slate-200">@{report.reporter.handle}</span>
                    </p>
                    {report.details && (
                      <p className="mt-1 text-sm italic text-slate-400">&ldquo;{report.details}&rdquo;</p>
                    )}
                  </div>

                  <div className="mt-4 rounded-lg border border-white/5 bg-white/5 p-4">
                    <p className="text-xs text-slate-500">
                      Post by{" "}
                      <Link
                        href={`/riders/${report.journalEntry?.author.handle}`}
                        className="font-semibold text-slate-300 hover:text-white"
                      >
                        @{report.journalEntry?.author.handle}
                      </Link>
                    </p>
                    {report.journalEntry?.title && (
                      <p className="mt-1 font-semibold text-white">{report.journalEntry.title}</p>
                    )}
                    <p className="mt-1 line-clamp-3 text-sm text-slate-300">
                      {report.journalEntry?.body}
                    </p>
                  </div>
                </div>

                <ReportActions reportId={report.id} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
