import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { ScrollText } from "lucide-react";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

// Renders a before/after snapshot as readable key → value lines. Snapshots are
// arbitrary JSON, so anything non-scalar falls back to compact JSON.
function formatSnapshot(value: Prisma.JsonValue | null): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) return JSON.stringify(value);

  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return null;

  return entries
    .map(([key, val]) => `${key}: ${typeof val === "object" ? JSON.stringify(val) : String(val)}`)
    .join("\n");
}

export default async function AdminAuditPage(props: {
  searchParams: Promise<{ action?: string; entityType?: string; page?: string }>;
}) {
  const searchParams = await props.searchParams;
  const page = Math.max(1, Number.parseInt(searchParams.page ?? "1", 10) || 1);

  const where: Prisma.AuditLogWhereInput = {};
  if (searchParams.action) where.action = searchParams.action;
  if (searchParams.entityType) where.entityType = searchParams.entityType;

  const [logs, total, actionGroups] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { actor: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.groupBy({ by: ["action"], _count: { action: true }, orderBy: { action: "asc" } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <section className="route-lines rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Operations</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-white">Audit Trail</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Append-only record of every privileged action — who did it, when, and what changed. Entries are never
          edited or deleted.
        </p>
        <div className="mt-4 flex gap-3 text-sm">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-slate-300">
            {total} entries
          </span>
        </div>
      </section>

      <nav className="flex flex-wrap gap-2" aria-label="Audit filters">
        <Link
          href="/admin/audit"
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
            !searchParams.action
              ? "border-sunset/50 bg-sunset/15 text-white"
              : "border-white/10 bg-white/3 text-slate-300 hover:border-white/30 hover:text-white"
          }`}
        >
          All
        </Link>
        {actionGroups.map((group) => (
          <Link
            key={group.action}
            href={`/admin/audit?action=${encodeURIComponent(group.action)}`}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              searchParams.action === group.action
                ? "border-sunset/50 bg-sunset/15 text-white"
                : "border-white/10 bg-white/3 text-slate-300 hover:border-white/30 hover:text-white"
            }`}
          >
            {group.action} ({group._count.action})
          </Link>
        ))}
      </nav>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/3 p-12 text-center shadow-lg">
          <ScrollText className="mx-auto h-8 w-8 text-slate-500" />
          <p className="mt-3 text-sm text-slate-400">No audit entries yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const before = formatSnapshot(log.before);
            const after = formatSnapshot(log.after);

            return (
              <article key={log.id} className="rounded-xl border border-white/10 bg-white/3 p-4 shadow-lg">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-xs font-semibold text-sunset">
                    {log.action}
                  </span>
                  <span className="text-xs text-slate-400">
                    {log.actor?.name ?? log.actor?.email ?? "system"}
                  </span>
                  <span className="text-xs text-slate-500">{log.createdAt.toLocaleString("en-US")}</span>
                  {log.ip ? <span className="text-xs text-slate-600">{log.ip}</span> : null}
                </div>

                <p className="mt-2 text-sm text-slate-200">{log.summary}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {log.entityType}
                  {log.entityId ? ` · ${log.entityId}` : ""}
                </p>

                {before || after ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {before ? (
                      <div className="rounded-lg border border-red-400/20 bg-red-500/5 p-3">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-red-300">
                          Before
                        </p>
                        <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-xs text-slate-300">
                          {before}
                        </pre>
                      </div>
                    ) : null}
                    {after ? (
                      <div className="rounded-lg border border-forest/30 bg-forest/5 p-3">
                        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                          After
                        </p>
                        <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-xs text-slate-300">
                          {after}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {totalPages > 1 ? (
        <nav className="flex items-center justify-between" aria-label="Audit pagination">
          <Link
            href={{ pathname: "/admin/audit", query: { ...searchParams, page: page - 1 } }}
            aria-disabled={page <= 1}
            className={`rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 ${
              page <= 1 ? "pointer-events-none opacity-40" : "hover:border-white/25 hover:text-white"
            }`}
          >
            ← Newer
          </Link>
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
          <Link
            href={{ pathname: "/admin/audit", query: { ...searchParams, page: page + 1 } }}
            aria-disabled={page >= totalPages}
            className={`rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 ${
              page >= totalPages ? "pointer-events-none opacity-40" : "hover:border-white/25 hover:text-white"
            }`}
          >
            Older →
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
