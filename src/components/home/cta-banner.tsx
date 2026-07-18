import Link from "next/link";

export function CtaBanner() {
  return (
    <section className="grid gap-6 rounded-[2rem] border border-border bg-surface p-8 shadow-lift sm:p-10 lg:grid-cols-[1.2fr_0.8fr]">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Join District 76</p>
        <h2 className="mt-2 font-display text-3xl tracking-tight text-asphalt sm:text-4xl">Clarksville&apos;s rider community is open to you.</h2>
        <p className="mt-3 max-w-3xl text-muted">
          Whether you are on your first season or your twentieth, District 76 is where local riders find routes, friendships, and a better riding week.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/join" className="rounded-full bg-asphalt px-6 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            Join the Community
          </Link>
          <Link href="/events" className="rounded-full border border-border px-6 py-3 text-sm font-semibold text-asphalt hover:border-asphalt">
            View Upcoming Rides
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-ridge p-5">
        <p className="text-xs uppercase tracking-[0.12em] text-asphalt/80">Member Snapshot</p>
        <p className="mt-3 text-sm text-asphalt">&ldquo;I moved to Clarksville last year. District 76 made this city feel like home on two wheels in the first month.&rdquo;</p>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.08em] text-asphalt/75">- Emily, Sportster S</p>
      </div>
    </section>
  );
}
