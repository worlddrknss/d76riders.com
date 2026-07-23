import Link from "next/link";
import { Home, Route as RouteIcon } from "lucide-react";

/** Branded 404 — shown for unknown URLs and any notFound() call. */
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-6xl leading-none text-sunset">404</p>
      <h1 className="mt-3 font-display text-2xl uppercase tracking-tight text-ink">Off the map</h1>
      <p className="mt-2 max-w-md text-sm text-muted">
        This road doesn&apos;t exist, or it moved. Let&apos;s get you back on route.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg bg-sunset px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#cf5a26]"
        >
          <Home className="h-4 w-4" /> Home
        </Link>
        <Link
          href="/roads"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-semibold text-ink transition hover:border-ink/30"
        >
          <RouteIcon className="h-4 w-4" /> Browse roads
        </Link>
      </div>
    </div>
  );
}
