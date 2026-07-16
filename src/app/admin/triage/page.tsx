import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import type { Prisma, ReportPriority, ReportSubjectType } from "@prisma/client";

import { TriageActions } from "@/components/admin/triage-actions";
import { prisma } from "@/lib/prisma";
import { PRIORITY_LABEL, PRIORITY_RANK, SUBJECT_LABEL, slaState } from "@/lib/triage";

export const dynamic = "force-dynamic";

const PRIORITY_STYLES: Record<ReportPriority, string> = {
  URGENT: "border-red-400/40 bg-red-500/15 text-red-200",
  NORMAL: "border-sunset/40 bg-sunset/15 text-orange-200",
  LOW: "border-white/15 bg-white/5 text-slate-300",
};

type ReportWithSubject = Prisma.ReportGetPayload<{
  include: {
    reporter: { select: { name: true; handle: true } };
    journalEntry: { select: { id: true; title: true; body: true; author: { select: { handle: true } } } };
    comment: { select: { id: true; body: true; author: { select: { handle: true } } } };
    event: { select: { id: true; slug: true; title: true; status: true } };
    galleryItem: { select: { id: true; url: true; caption: true } };
    subjectRider: { select: { id: true; handle: true; name: true } };
    newsPost: { select: { id: true; slug: true; title: true; status: true } };
  };
}>;

// One shape for the card body regardless of what was reported.
type SubjectView = { author: string | null; heading: string | null; body: string | null; href: string | null };

function subjectView(report: ReportWithSubject): SubjectView {
  switch (report.subjectType) {
    case "JOURNAL_ENTRY":
      return {
        author: report.journalEntry?.author.handle ?? null,
        heading: report.journalEntry?.title ?? null,
        body: report.journalEntry?.body ?? null,
        href: report.journalEntry ? `/r/${report.journalEntry.author.handle}` : null,
      };
    case "COMMENT":
      return {
        author: report.comment?.author.handle ?? null,
        heading: null,
        body: report.comment?.body ?? null,
        href: null,
      };
    case "EVENT":
      return {
        author: null,
        heading: report.event?.title ?? null,
        body: report.event ? `Status: ${report.event.status}` : null,
        href: report.event ? `/events/${report.event.slug}` : null,
      };
    case "GALLERY_ITEM":
      return {
        author: null,
        heading: report.galleryItem?.caption ?? "Photo",
        body: report.galleryItem?.url ?? null,
        href: report.galleryItem?.url ?? null,
      };
    case "RIDER":
      return {
        author: report.subjectRider?.handle ?? null,
        heading: report.subjectRider?.name ?? null,
        body: "Reported rider profile — review and escalate if action is needed.",
        href: report.subjectRider ? `/r/${report.subjectRider.handle}` : null,
      };
    case "NEWS_POST":
      return {
        author: null,
        heading: report.newsPost?.title ?? null,
        body: report.newsPost ? `Status: ${report.newsPost.status}` : null,
        href: report.newsPost ? `/news/${report.newsPost.slug}` : null,
      };
    default:
      return { author: null, heading: null, body: null, href: null };
  }
}

export default async function AdminTriagePage(props: {
  searchParams: Promise<{ priority?: string; type?: string }>;
}) {
  const searchParams = await props.searchParams;
  const priorityFilter = searchParams.priority?.toUpperCase();
  const typeFilter = searchParams.type?.toUpperCase();

  const where: Prisma.ReportWhereInput = { status: "PENDING" };
  if (priorityFilter && priorityFilter in PRIORITY_RANK) {
    where.priority = priorityFilter as ReportPriority;
  }
  if (typeFilter && typeFilter in SUBJECT_LABEL) {
    where.subjectType = typeFilter as ReportSubjectType;
  }

  const [reports, resolvedCount] = await Promise.all([
    prisma.report.findMany({
      where,
      // Urgent first, then oldest — the row closest to breaching leads its tier.
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      take: 100,
      include: {
        reporter: { select: { name: true, handle: true } },
        journalEntry: { select: { id: true, title: true, body: true, author: { select: { handle: true } } } },
        comment: { select: { id: true, body: true, author: { select: { handle: true } } } },
        event: { select: { id: true, slug: true, title: true, status: true } },
        galleryItem: { select: { id: true, url: true, caption: true } },
        subjectRider: { select: { id: true, handle: true, name: true } },
        newsPost: { select: { id: true, slug: true, title: true, status: true } },
      },
    }),
    prisma.report.count({ where: { status: { not: "PENDING" } } }),
  ]);

  // Prisma orders enums by their declared position, which is exactly the SLA
  // ranking we want (URGENT, NORMAL, LOW) — no re-sort needed.
  const now = new Date();
  const overdueCount = reports.filter((r) => slaState(r.createdAt, r.priority, now).overdue).length;

  const filters: { label: string; href: string; active: boolean }[] = [
    { label: "All", href: "/admin/triage", active: !priorityFilter && !typeFilter },
    ...(Object.keys(PRIORITY_LABEL) as ReportPriority[]).map((p) => ({
      label: PRIORITY_LABEL[p],
      href: `/admin/triage?priority=${p}`,
      active: priorityFilter === p && !typeFilter,
    })),
    ...(Object.keys(SUBJECT_LABEL) as ReportSubjectType[]).map((t) => ({
      label: SUBJECT_LABEL[t],
      href: `/admin/triage?type=${t}`,
      active: typeFilter === t && !priorityFilter,
    })),
  ];

  return (
    <div className="space-y-6">
      <section className="route-lines rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Moderation</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">Content Triage</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Every reported item across journals, comments, events, photos, profiles, and news — in one queue,
          ordered by SLA. Urgent reports are due within 4 hours, normal within 24, low within 72.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full border border-sunset/40 bg-sunset/15 px-3 py-1 font-semibold text-orange-200">
            {reports.length} pending
          </span>
          {overdueCount > 0 ? (
            <span className="rounded-full border border-red-400/40 bg-red-500/15 px-3 py-1 font-semibold text-red-200">
              {overdueCount} overdue
            </span>
          ) : null}
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-400">
            {resolvedCount} resolved
          </span>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2" aria-label="Triage filters">
        {filters.map((filter) => (
          <Link
            key={filter.href + filter.label}
            href={filter.href}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              filter.active
                ? "border-sunset/50 bg-sunset/15 text-white"
                : "border-white/10 bg-white/3 text-slate-300 hover:border-white/30 hover:text-white"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </nav>

      {reports.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/3 p-12 text-center shadow-lg">
          <ShieldCheck className="mx-auto h-8 w-8 text-slate-500" />
          <p className="mt-3 text-sm text-slate-400">Nothing in the queue. The community is clean.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const sla = slaState(report.createdAt, report.priority, now);
            const view = subjectView(report);

            return (
              <article
                key={report.id}
                className={`rounded-xl border bg-white/3 p-5 shadow-lg ${
                  sla.overdue ? "border-red-400/40" : "border-white/10"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ${
                          PRIORITY_STYLES[report.priority]
                        }`}
                      >
                        {PRIORITY_LABEL[report.priority]}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                        {SUBJECT_LABEL[report.subjectType]}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-300">
                        {report.reason.replaceAll("_", " ")}
                      </span>
                      <span
                        className={`text-xs font-semibold ${sla.overdue ? "text-red-300" : "text-slate-500"}`}
                      >
                        {sla.label}
                      </span>
                    </div>

                    <p className="mt-3 text-xs text-slate-400">
                      Reported by <span className="font-semibold text-slate-200">@{report.reporter.handle}</span>{" "}
                      on{" "}
                      {report.createdAt.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    {report.details ? (
                      <p className="mt-1 text-sm italic text-slate-400">&ldquo;{report.details}&rdquo;</p>
                    ) : null}

                    <div className="mt-4 rounded-lg border border-white/5 bg-white/5 p-4">
                      {view.author ? (
                        <p className="text-xs text-slate-500">
                          By{" "}
                          <Link href={`/r/${view.author}`} className="font-semibold text-slate-300 hover:text-white">
                            @{view.author}
                          </Link>
                        </p>
                      ) : null}
                      {view.heading ? <p className="mt-1 font-semibold text-white">{view.heading}</p> : null}
                      {view.body ? (
                        <p className="mt-1 line-clamp-3 break-words text-sm text-slate-300">{view.body}</p>
                      ) : (
                        <p className="mt-1 text-sm italic text-slate-500">Subject no longer exists.</p>
                      )}
                      {view.href ? (
                        <Link
                          href={view.href}
                          className="mt-2 inline-block text-xs font-semibold text-sunset hover:text-orange-300"
                        >
                          View in context →
                        </Link>
                      ) : null}
                    </div>
                  </div>

                  <TriageActions
                    reportId={report.id}
                    priority={report.priority}
                    subjectType={report.subjectType}
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
