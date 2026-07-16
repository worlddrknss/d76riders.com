import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHero } from "@/components/layout/page-hero";
import { PolicyAcknowledgeForm } from "@/components/policies/policy-acknowledge-form";
import { siteImages } from "@/data/images";
import { prisma } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/sanitize";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const policy = await prisma.policy.findUnique({
    where: { slug },
    select: { title: true, summary: true },
  });

  if (!policy) {
    return { title: "Policy not found | District 76 Riders" };
  }

  return {
    title: `${policy.title} | District 76 Riders`,
    description: policy.summary ?? undefined,
  };
}

export default async function PolicyDetailPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;

  const policy = await prisma.policy.findUnique({ where: { slug } });

  if (!policy || !policy.active) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const rider = currentUser?.id
    ? await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } })
    : null;

  const acknowledgment = rider
    ? await prisma.policyAcknowledgment.findUnique({
        where: {
          policyId_riderId_version: { policyId: policy.id, riderId: rider.id, version: policy.version },
        },
        select: { createdAt: true },
      })
    : null;

  return (
    <div>
      <PageHero
        image={siteImages.pageHeroes.policies}
        eyebrow={policy.type.replaceAll("_", " ")}
        title={policy.title}
        description={policy.summary ?? undefined}
      />

      <section className="page-shell">
        <div className="content-wrap">
          <div className="mx-auto w-full max-w-3xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link href="/policies" className="text-xs font-semibold text-muted hover:text-ink">
                ← All policies
              </Link>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-[0.65rem] text-muted">
                  v{policy.version}
                </span>
                {policy.required ? (
                  <span className="rounded-full border border-sunset/40 bg-sunset/10 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-sunset">
                    Required
                  </span>
                ) : null}
                <span className="text-[0.65rem] text-muted">
                  Published{" "}
                  {policy.publishedAt.toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
            </div>

            <article className="mt-6 rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
              <div
                className="prose prose-neutral"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(policy.bodyHtml) }}
              />
            </article>

            <div className="mt-6">
              {!currentUser ? (
                <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted shadow-soft">
                  <Link href={`/login?next=/policies/${policy.slug}`} className="font-semibold text-sunset">
                    Log in
                  </Link>{" "}
                  to record your acceptance.
                </p>
              ) : !rider ? (
                <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted shadow-soft">
                  Create a rider profile to accept this policy.
                </p>
              ) : (
                <PolicyAcknowledgeForm
                  slug={policy.slug}
                  title={policy.title}
                  version={policy.version}
                  acknowledgedAt={acknowledgment?.createdAt.toISOString() ?? null}
                />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
