"use client";

import { useState, useTransition } from "react";
import { Download } from "lucide-react";

import { exportMyDataAction } from "@/app/(site)/account/actions";

/**
 * "Download my data" — the GDPR right of access, self-service. Builds the JSON
 * on the server, then hands it to the browser as a file; nothing is stored.
 */
export function DataExportCard() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function download() {
    setError(null);
    start(async () => {
      const result = await exportMyDataAction();
      if (result.error || !result.json) {
        setError(result.error ?? "Could not build your export.");
        return;
      }
      const blob = new Blob([result.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "district76-my-data.json";
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
      <h2 className="font-display text-xl text-ink">Your data</h2>
      <p className="mt-1 text-sm text-muted">
        Download everything on your account as a JSON file — your profile and the rides, posts, bikes,
        gear and other content you&apos;ve created. Your encrypted emergency-card details aren&apos;t
        included.
      </p>
      <button
        type="button"
        onClick={download}
        disabled={pending}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-ink transition hover:border-sunset/50 hover:text-sunset disabled:opacity-60"
      >
        <Download className="h-4 w-4" />
        {pending ? "Preparing…" : "Download my data"}
      </button>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
