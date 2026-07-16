"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";

import { acknowledgePolicyAction, type AcknowledgeState } from "@/app/(site)/policies/actions";
import { Button } from "@/components/ui/button";

type PolicyAcknowledgeFormProps = {
  slug: string;
  title: string;
  version: string;
  /** ISO timestamp of a prior acceptance of this exact version, if any. */
  acknowledgedAt: string | null;
};

export function PolicyAcknowledgeForm({
  slug,
  title,
  version,
  acknowledgedAt,
}: PolicyAcknowledgeFormProps) {
  const [checked, setChecked] = useState(false);
  const [result, setResult] = useState<AcknowledgeState | null>(null);
  const [pending, start] = useTransition();

  // Server-rendered acceptance, or one recorded during this session.
  const accepted = acknowledgedAt !== null || Boolean(result?.success);

  if (accepted) {
    const when = acknowledgedAt ? new Date(acknowledgedAt).toLocaleString("en-US") : "just now";
    return (
      <div className="flex items-start gap-3 rounded-xl border border-green-500/40 bg-green-500/10 p-4">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-700" />
        <div>
          <p className="text-sm font-semibold text-green-800">You accepted v{version} of {title}.</p>
          <p className="mt-0.5 text-xs text-green-700">Recorded {when}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-canvas p-4">
      <label className="flex items-start gap-3 text-sm text-ink">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-border"
        />
        <span>
          I have read and agree to <span className="font-semibold">{title}</span> (v{version}).
        </span>
      </label>

      {result?.error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {result.error}
        </p>
      ) : null}

      <div className="mt-4 flex justify-end">
        <Button
          variant="accent"
          size="sm"
          disabled={!checked || pending}
          onClick={() =>
            start(async () => {
              setResult(await acknowledgePolicyAction(slug));
            })
          }
        >
          {pending ? "Recording…" : "Accept"}
        </Button>
      </div>
    </div>
  );
}
