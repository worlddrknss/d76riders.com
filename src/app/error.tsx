"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Home, RotateCcw, TriangleAlert } from "lucide-react";

/**
 * App-wide error boundary. Catches uncaught render/RSC errors in any route and
 * shows a branded recovery screen instead of the raw framework crash page.
 */
export default function Error({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces in server/pod logs for diagnosis.
    console.error("[error-boundary]", error);
  }, [error]);

  // A full reload (not reset()) so recovery also survives deployment skew and
  // stale chunks: reset() re-renders with the same cached bundle — which still
  // references the old build's Server Action IDs after a redeploy — whereas a
  // reload fetches the fresh bundle. We ship often, so open tabs go stale.
  const retry = () => window.location.reload();

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-sunset/10 text-sunset">
        <TriangleAlert className="h-7 w-7" />
      </div>
      <h1 className="mt-5 font-display text-2xl font-bold uppercase tracking-tight text-ink">
        Something threw a chain
      </h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        We hit a snag loading this page. Give it another kick, or head back to the garage.
      </p>
      {error.digest ? <p className="mt-2 text-xs text-muted/60">Ref: {error.digest}</p> : null}

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={retry}
          className="inline-flex items-center gap-2 rounded-lg bg-sunset px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#cf5a26]"
        >
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-ink/30"
        >
          <Home className="h-4 w-4" /> Home
        </Link>
      </div>
    </div>
  );
}
