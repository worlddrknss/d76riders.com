import Link from "next/link";
import { CheckCircle2, Shield, Users } from "lucide-react";
import { guidelines, joinBenefits } from "@/data/community";
import { siteImages } from "@/data/images";
import { PageHero } from "@/components/layout/page-hero";

export default function JoinPage() {
  return (
    <div>
      <PageHero
        image={siteImages.pageHeroes.join}
        eyebrow="Join District 76"
        title="Ride With a Local Crew That Actually Rides"
        description="District 76 is for riders in and around Clarksville who want consistent routes, strong community standards, and people they can count on."
      />

      {/* EXPECTATIONS + BENEFITS */}
      <section className="w-full bg-canvas">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <article className="rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-asphalt">Community Expectations</h2>
            <ul className="mt-4 space-y-3 text-muted">
              {guidelines.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <Shield className="mt-0.5 h-4 w-4 shrink-0 text-sunset" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-asphalt">Benefits of Joining</h2>
            <div className="mt-4 space-y-3">
              {joinBenefits.map((benefit) => (
                <div key={benefit.title} className="rounded-xl border border-border bg-canvas/60 p-4">
                  <h3 className="font-semibold text-asphalt">{benefit.title}</h3>
                  <p className="mt-1 text-sm text-muted">{benefit.description}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      {/* CTA BAND */}
      <section className="relative w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${siteImages.ctaRoad})` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-asphalt/85" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-16 text-white sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Ready to Join?</h2>
          <p className="mt-3 max-w-2xl text-slate-200">
            Join District 76 to stay connected to local rides, event updates, and a welcoming network of riders across Clarksville and Middle Tennessee.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="#" className="rounded-md bg-sunset px-6 py-3 text-sm font-semibold text-white hover:bg-[#cf5a26]">
              Join District 76
            </Link>
            <Link href="/events" className="rounded-md border border-white/40 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur hover:bg-white/10">
              Browse Upcoming Rides
            </Link>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-4 rounded-2xl border border-border bg-surface p-6 text-sm text-muted shadow-soft sm:grid-cols-3 sm:p-8">
            <p className="flex items-center gap-2"><Users className="h-4 w-4 text-sunset" />Meet local riders faster</p>
            <p className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sunset" />Know what to expect before every ride</p>
            <p className="flex items-center gap-2"><Shield className="h-4 w-4 text-sunset" />Ride in a respectful, safety-first community</p>
          </div>
        </div>
      </section>
    </div>
  );
}
