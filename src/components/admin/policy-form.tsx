import Link from "next/link";
import type { Policy } from "@prisma/client";

type PolicyFormProps = {
  action: (formData: FormData) => Promise<void>;
  policy?: Policy;
  submitLabel: string;
};

// Shared by /admin/policies/new and /admin/policies/[id]/edit. The body is
// stored as HTML and sanitized server-side on submit.
export function PolicyForm({ action, policy, submitLabel }: PolicyFormProps) {
  return (
    <form action={action} className="space-y-4 rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="title" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Title
          </label>
          <input
            id="title"
            name="title"
            required
            maxLength={200}
            defaultValue={policy?.title}
            placeholder="Community Guidelines"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
          />
        </div>
        <div>
          <label htmlFor="slug" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Slug
          </label>
          <input
            id="slug"
            name="slug"
            maxLength={100}
            defaultValue={policy?.slug}
            disabled={Boolean(policy)}
            placeholder="community-guidelines"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 disabled:opacity-50"
          />
          <p className="mt-1 text-xs text-slate-500">
            {policy ? "The slug is fixed once published — it's the public URL." : "Defaults to the title."}
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="summary" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          Summary
        </label>
        <input
          id="summary"
          name="summary"
          maxLength={300}
          defaultValue={policy?.summary ?? ""}
          placeholder="One line shown in the policy list."
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="type" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Type
          </label>
          <select
            id="type"
            name="type"
            defaultValue={policy?.type ?? "COMMUNITY_GUIDELINES"}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          >
            <option value="COMMUNITY_GUIDELINES">Community Guidelines</option>
            <option value="SAFETY_WAIVER">Safety Waiver</option>
            <option value="TERMS">Terms</option>
            <option value="PRIVACY">Privacy</option>
          </select>
        </div>
        <div>
          <label htmlFor="version" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
            Version
          </label>
          <input
            id="version"
            name="version"
            maxLength={20}
            defaultValue={policy?.version ?? "1"}
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
          />
          <p className="mt-1 text-xs text-slate-500">Changing this re-prompts every member.</p>
        </div>
        <div className="space-y-2 pt-6">
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              name="required"
              defaultChecked={policy?.required ?? true}
              className="h-4 w-4 rounded border-white/20 bg-white/5"
            />
            Required
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              name="active"
              defaultChecked={policy?.active ?? true}
              className="h-4 w-4 rounded border-white/20 bg-white/5"
            />
            Active
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="bodyHtml" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
          Body (HTML)
        </label>
        <textarea
          id="bodyHtml"
          name="bodyHtml"
          rows={16}
          required
          defaultValue={policy?.bodyHtml}
          placeholder="<h2>Ride with respect</h2><p>…</p>"
          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white placeholder:text-slate-500"
        />
        <p className="mt-1 text-xs text-slate-500">
          Sanitized on save — scripts, iframes, and inline styles are stripped.
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Link
          href="/admin/policies"
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-300 hover:border-white/25 hover:text-white"
        >
          Cancel
        </Link>
        <button
          type="submit"
          className="rounded-lg border border-sunset/40 bg-sunset/15 px-4 py-2 text-sm font-semibold text-orange-100 hover:bg-sunset/25"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
