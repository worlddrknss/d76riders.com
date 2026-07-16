import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PolicyAcknowledgeForm } from "@/components/policies/policy-acknowledge-form";
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
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <Link href="/policies" className="text-xs font-semibold text-muted hover:text-ink">
        ← All policies
      </Link>

      <header className="mt-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border px-2.5 py-0.5 text-xs font-semibold text-muted">
            {policy.type.replaceAll("_", " ")}
          </span>
          <span className="rounded-full border border-border px-2.5 py-0.5 font-mono text-xs text-muted">
            v{policy.version}
          </span>
          {policy.required ? (
            <span className="rounded-full border border-sunset/40 bg-sunset/10 px-2.5 py-0.5 text-xs font-semibold text-sunset">
              Required
            </span>
          ) : null}
        </div>
        <h1 className="mt-2 font-display text-4xl font-bold text-ink">{policy.title}</h1>
        <p className="mt-1 text-xs text-muted">
          Published {policy.publishedAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>
      </header>

      <article
        className="prose prose-slate mt-8 max-w-none text-ink"
        dangerouslySetInnerHTML={{ __html: sanitizeRichText(policy.bodyHtml) }}
      />

      <div className="mt-10 border-t border-border pt-6">
        {!currentUser ? (
          <p className="text-sm text-muted">
            <Link href={`/login?next=/policies/${policy.slug}`} className="font-semibold text-sunset">
              Log in
            </Link>{" "}
            to record your acceptance.
          </p>
        ) : !rider ? (
          <p className="text-sm text-muted">Create a rider profile to accept this policy.</p>
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
  );
}
