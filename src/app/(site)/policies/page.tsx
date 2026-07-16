import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2, FileText } from "lucide-react";

import { PageHero } from "@/components/layout/page-hero";
import { StaggerList, StaggerItem } from "@/components/ui/motion";
import { siteImages } from "@/data/images";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Policies",
  description:
    "Community guidelines and safety waivers for District 76 Riders — how we ride together in Clarksville and Middle Tennessee.",
  alternates: { canonical: "/policies" },
  openGraph: {
    title: "Policies — District 76 Riders",
    description: "How we ride together. The standards every rider accepts.",
  },
};

export const dynamic = "force-dynamic";

export default async function PoliciesPage() {
  const currentUser = await getCurrentUser();

  const rider = currentUser?.id
    ? await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } })
    : null;

  // Only staff get the "nothing here — go publish one" nudge.
  const isAdmin = currentUser?.roles.includes("ADMINISTRATOR") ?? false;

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
    <div>
      <PageHero
        image={siteImages.pageHeroes.policies}
        eyebrow="Governance"
        title="How We Ride Together"
        description="The standards every rider agrees to. Required policies must be accepted before you ride with the group."
      />

      <section className="page-shell">
        <div className="content-wrap space-y-6">
          {policies.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center shadow-soft">
              <FileText className="mx-auto h-8 w-8 text-muted/50" />
              <p className="mt-3 text-sm text-muted">No policies published yet.</p>
              {isAdmin ? (
                <Link
                  href="/admin/policies/new"
                  className="mt-4 inline-block rounded-md bg-sunset px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-[#cf5a26]"
                >
                  Publish a policy
                </Link>
              ) : null}
            </div>
          ) : (
            <StaggerList className="space-y-3">
              {policies.map((policy) => {
                const accepted =
                  rider && Array.isArray(policy.acknowledgments)
                    ? policy.acknowledgments.some((ack) => ack.version === policy.version)
                    : false;

                return (
                  <StaggerItem key={policy.id}>
                    <Link
                      href={`/policies/${policy.slug}`}
                      className="block rounded-xl border border-border bg-surface p-5 shadow-soft transition hover:border-sunset/40"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-muted">
                          {policy.type.replaceAll("_", " ")}
                        </span>
                        {policy.required ? (
                          <span className="rounded-full border border-sunset/40 bg-sunset/10 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-sunset">
                            Required
                          </span>
                        ) : null}
                        {accepted ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-forest/40 bg-forest/10 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-forest">
                            <CheckCircle2 className="h-3 w-3" />
                            Accepted
                          </span>
                        ) : rider && policy.required ? (
                          <span className="rounded-full border border-sunset/40 bg-sunset/10 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-sunset">
                            Action needed
                          </span>
                        ) : null}
                      </div>

                      <h2 className="mt-2 font-display text-lg font-semibold text-ink">{policy.title}</h2>
                      {policy.summary ? <p className="mt-1 text-sm text-muted">{policy.summary}</p> : null}
                    </Link>
                  </StaggerItem>
                );
              })}
            </StaggerList>
          )}
        </div>
      </section>
    </div>
  );
}
