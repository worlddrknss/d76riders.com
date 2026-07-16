import { createPolicyAction } from "@/app/admin/policies/actions";
import { PolicyForm } from "@/components/admin/policy-form";

const ERRORS: Record<string, string> = {
  missing: "A title and body are both required.",
  slug: "A policy with that slug already exists.",
};

export default async function NewPolicyPage(props: { searchParams: Promise<{ error?: string }> }) {
  const searchParams = await props.searchParams;
  const error = searchParams.error ? ERRORS[searchParams.error] : null;

  return (
    <div className="space-y-6">
      <section className="route-lines rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Governance</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">New Policy</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Publish a document members must read and accept.
        </p>
      </section>

      {error ? (
        <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      ) : null}

      <PolicyForm action={createPolicyAction} submitLabel="Publish Policy" />
    </div>
  );
}
