import Link from "next/link";
import { FileCheck2, Plus } from "lucide-react";

import { PolicyDeleteButton } from "@/components/admin/policy-delete-button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPoliciesPage() {
  const [policies, riderCount] = await Promise.all([
    prisma.policy.findMany({ orderBy: [{ active: "desc" }, { publishedAt: "desc" }] }),
    prisma.rider.count(),
  ]);

  // Acknowledgment counts are per current version, so a version bump correctly
  // shows coverage dropping back toward zero.
  const coverage = await Promise.all(
    policies.map(async (policy) => ({
      policyId: policy.id,
      accepted: await prisma.policyAcknowledgment.count({
        where: { policyId: policy.id, version: policy.version },
      }),
    })),
  );
  const acceptedByPolicy = new Map(coverage.map((row) => [row.policyId, row.accepted]));

  return (
    <div className="space-y-6">
      <section className="route-lines rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Governance</p>
            <h1 className="mt-2 font-display text-4xl text-white">Policies</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300">
              Community guidelines and safety waivers members must accept. Bumping a version re-prompts every
              member, since acceptance is recorded per version.
            </p>
          </div>
          <Link
            href="/admin/policies/new"
            className="inline-flex items-center gap-1.5 rounded-lg border border-sunset/40 bg-sunset/15 px-4 py-2 text-sm font-semibold text-orange-100 transition hover:bg-sunset/25"
          >
            <Plus className="h-4 w-4" />
            New Policy
          </Link>
        </div>
      </section>

      {policies.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/3 p-12 text-center shadow-lg">
          <FileCheck2 className="mx-auto h-8 w-8 text-slate-500" />
          <p className="mt-3 text-sm text-slate-400">No policies published yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {policies.map((policy) => {
            const accepted = acceptedByPolicy.get(policy.id) ?? 0;
            const pct = riderCount > 0 ? Math.round((accepted / riderCount) * 100) : 0;

            return (
              <article key={policy.id} className="rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-slate-300">
                        {policy.type.replaceAll("_", " ")}
                      </span>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-xs text-slate-300">
                        v{policy.version}
                      </span>
                      {policy.required ? (
                        <span className="rounded-full border border-sunset/40 bg-sunset/15 px-2.5 py-0.5 text-xs font-semibold text-orange-200">
                          Required
                        </span>
                      ) : null}
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                          policy.active
                            ? "border-forest/40 bg-forest/15 text-emerald-200"
                            : "border-white/15 bg-white/5 text-slate-400"
                        }`}
                      >
                        {policy.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <p className="mt-2 font-display text-lg text-white">{policy.title}</p>
                    {policy.summary ? (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-300">{policy.summary}</p>
                    ) : null}

                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>
                          {accepted} of {riderCount} riders accepted v{policy.version}
                        </span>
                        <span className="font-semibold text-slate-300">{pct}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full bg-sunset" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col gap-2">
                    <Link
                      href={`/policies/${policy.slug}`}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-xs font-semibold text-slate-300 hover:border-white/25 hover:text-white"
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/policies/${policy.id}/edit`}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-xs font-semibold text-slate-300 hover:border-white/25 hover:text-white"
                    >
                      Edit
                    </Link>
                    <PolicyDeleteButton policyId={policy.id} title={policy.title} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
