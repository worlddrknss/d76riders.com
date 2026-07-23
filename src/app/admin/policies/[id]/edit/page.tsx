import { notFound } from "next/navigation";

import { updatePolicyAction } from "@/app/admin/policies/actions";
import { PolicyForm } from "@/components/admin/policy-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditPolicyPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const policy = await prisma.policy.findUnique({ where: { id } });

  if (!policy) {
    notFound();
  }

  const accepted = await prisma.policyAcknowledgment.count({
    where: { policyId: policy.id, version: policy.version },
  });

  const update = updatePolicyAction.bind(null, policy.id);

  return (
    <div className="space-y-6">
      <section className="route-lines rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Governance</p>
        <h1 className="mt-2 font-display text-3xl text-white">Edit Policy</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          {accepted} rider{accepted === 1 ? " has" : "s have"} accepted v{policy.version}. Bumping the version
          clears that coverage and re-prompts everyone.
        </p>
      </section>

      <PolicyForm action={update} policy={policy} submitLabel="Save Policy" />
    </div>
  );
}
