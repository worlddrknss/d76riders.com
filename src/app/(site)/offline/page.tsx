import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline — D76 Riders" };

export default function OfflinePage() {
  return (
    <section className="page-shell">
      <div className="content-wrap mx-auto max-w-md py-16 text-center">
        <WifiOff className="mx-auto h-10 w-10 text-muted/60" />
        <h1 className="mt-4 font-display text-2xl text-ink">You&apos;re offline</h1>
        <p className="mt-2 text-sm text-muted">
          District 76 needs a connection to load fresh rides, posts, and the live map. Reconnect and try again.
        </p>
        <Link
          href="/"
          className="mt-5 inline-block rounded-lg bg-sunset px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#cf5a26]"
        >
          Retry
        </Link>
      </div>
    </section>
  );
}
