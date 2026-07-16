"use client";

import { useState } from "react";

import { WysiwygEditor } from "@/components/admin/wysiwyg-editor";

/**
 * Body field for the policy form.
 *
 * Isolated as a client component so PolicyForm can stay a server component and
 * keep submitting through a server action — the editor only needs to own the
 * HTML string and mirror it into a hidden input, exactly as the news composer does.
 */
export function PolicyBodyEditor({ defaultValue }: { defaultValue?: string }) {
  const [bodyHtml, setBodyHtml] = useState(defaultValue ?? "");

  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Body</span>
      <div className="mt-1">
        <WysiwygEditor
          value={bodyHtml}
          onChange={setBodyHtml}
          placeholder="Write the policy — headings for each rule, and plain language under them…"
        />
      </div>
      <input type="hidden" name="bodyHtml" value={bodyHtml} />
      <p className="mt-1 text-xs text-slate-500">
        Sanitized on save — scripts, iframes, and inline styles are stripped.
      </p>
    </div>
  );
}
