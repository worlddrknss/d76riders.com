import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, FileText } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Policies | District 76 Riders",
  description: "Community guidelines and safety waivers for District 76 Riders.",
};

export const dynamic = "force-dynamic";

export default async function PoliciesPage() {
  const currentUser = await getCurrentUser();

  const rider = currentUser?.id
    ? await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } })
    : null;

  const policies = await prisma.policy.findMany({
    where: { active: true },
    orderBy: [{ required: "desc" }, { publishedAt: "asc" }],
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      type: true,
      version: true,
      required: true,
      acknowledgments: rider ? { where: { riderId: rider.id }, select: { version: true } } : false,
    },
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Governance</p>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink">Policies</h1>
        <p className="mt-2 text-sm text-muted">
          How we ride together. Required policies must be accepted to take part in group rides.
        </p>
      </header>

      {policies.length === 0 ? (
        <div className="mt-8 rounded-xl border border-border bg-canvas p-12 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-3 text-sm text-muted">No policies published yet.</p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {policies.map((policy) => {
            const accepted =
              rider && Array.isArray(policy.acknowledgments)
                ? policy.acknowledgments.some((ack) => ack.version === policy.version)
                : false;

            return (
              <Link
                key={policy.id}
                href={`/policies/${policy.slug}`}
                className="block rounded-xl border border-border bg-canvas p-5 transition hover:border-ink/30"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-muted">
                    {policy.type.replaceAll("_", " ")}
                  </span>
                  {policy.required ? (
                    <span className="rounded-full border border-sunset/40 bg-sunset/10 px-2.5 py-0.5 text-xs font-semibold text-sunset">
                      Required
                    </span>
                  ) : null}
                  {accepted ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-green-500/40 bg-green-500/10 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                      <CheckCircle2 className="h-3 w-3" />
                      Accepted
                    </span>
                  ) : rider && policy.required ? (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                      Action needed
                    </span>
                  ) : null}
                </div>

                <p className="mt-2 font-display text-lg font-semibold text-ink">{policy.title}</p>
                {policy.summary ? <p className="mt-1 text-sm text-muted">{policy.summary}</p> : null}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
