import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/og";
import Link from "next/link";
import { ArrowRight, Info } from "lucide-react";
import { siteImages } from "@/data/images";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { FadeUp, ScaleIn } from "@/components/ui/motion";

export const metadata: Metadata = {
  title: "About — Community Over Club",
  description:
    "All bikes, all riders, one community. District 76 Riders was founded in Clarksville, TN and built for all riders. No patches, no hierarchy, no drama.",
  alternates: { canonical: "/about" },
  openGraph: {
    images: OG_IMAGE,
    title: "About — District 76 Riders",
    description: "All bikes, all riders, one community. Founded in Clarksville, TN and built for all riders.",
  },
};

export default function AboutPage() {
  return (
    <AppShell>
      <div>
        <PageHeader
          icon={Info}
          title="Motorcycles Bring People Together"
          subtitle="Everything else is optional."
        />

      {/* BELIEF */}
      <section className="py-10">
        <div>
          <FadeUp>
            <p className="text-lg leading-relaxed text-muted sm:text-xl">
              District 76 Riders exists for people who love to ride. Sport bike, cruiser, Harley, Grom, adventure bike, or your first motorcycle. Doesn&apos;t matter. You&apos;re welcome here.
            </p>
            <p className="mt-6 text-lg leading-relaxed text-muted sm:text-xl">
              No politics. No pretending. Good people and good rides.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* THE STORY — DARK */}
      <section className="rounded-2xl bg-asphalt px-6 py-10 text-white sm:px-8">
        <div>
          <FadeUp>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">The Story</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              We wanted something different.
            </h2>
          </FadeUp>

          <FadeUp>
            <div className="mt-12 space-y-6 text-lg leading-relaxed text-slate-300">
              <p>
                After moving to Tennessee, finding a relaxed riding community was harder than expected. Most groups felt exclusive, focused on one type of bike, or buried in club politics that had nothing to do with riding.
              </p>
              <p>
                Too many revolved around patches and ranks. Too many centered on a single brand. Too much drama, not enough road. Too much Facebook, not enough showing up.
              </p>
              <p>
                So we built something else.
              </p>
            </div>
          </FadeUp>

          <FadeUp>
            <blockquote className="mt-12 border-l-4 border-sunset pl-6 font-display text-2xl font-semibold italic leading-snug text-white sm:text-3xl">
              &ldquo;A place where someone on a Grom could ride beside someone on a Road Glide and nobody cared what badge was on the tank.&rdquo;
            </blockquote>
          </FadeUp>

          <FadeUp>
            <div className="mt-12 space-y-6 text-lg leading-relaxed text-slate-300">
              <p>
                This is still early. The site is live, the tools are built, and the first rides are being planned. Right now it&apos;s one rider with a vision and a platform ready for the people who get it.
              </p>
              <p>
                If you&apos;ve been looking for something like this, you found it before the crowd did.
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* WHAT YOU'LL FIND */}
      <section className="py-10">
        <div>
          <FadeUp>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">What You&apos;ll Find Here</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-asphalt sm:text-4xl">
              Built by Riders, for Riders
            </h2>
          </FadeUp>

          <FadeUp>
            <div className="mx-auto mt-12 grid max-w-2xl gap-3">
              {[
                "Weekend rides that anyone can join.",
                "Local bike nights and meetups.",
                "Events created by members, not admins.",
                "A place to show off your bike and your build.",
                "Ride stories, photos, and videos from the community.",
                "Riders helping riders. Wrenching, routes, gear advice.",
                "New friendships built one ride at a time.",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-sunset" />
                  <p className="text-sm leading-relaxed text-muted sm:text-base">{item}</p>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* WHAT WE AREN'T — DARK */}
      <section className="rounded-2xl bg-asphalt px-6 py-10 text-white sm:px-8">
        <div>
          <FadeUp>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">What We Aren&apos;t</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              District 76 Riders is not a motorcycle club.
            </h2>
          </FadeUp>

          <FadeUp>
            <div className="mt-12 space-y-4 font-display text-xl font-semibold leading-relaxed sm:text-2xl">
              <p>There are no prospects.</p>
              <p>No ranks.</p>
              <p>No mandatory patches.</p>
              <p>No pressure to ride a certain brand.</p>
              <p>No attendance requirements.</p>
              <p>No dues.</p>
            </div>
          </FadeUp>

          <FadeUp>
            <p className="mt-12 text-lg leading-relaxed text-slate-300">
              Motorcycles are what bring us together, not what divides us. You don&apos;t have to prove anything to anyone. Just ride.
            </p>
          </FadeUp>
        </div>
      </section>

      {/* THE PLATFORM */}
      <section className="py-10">
        <div>
          <FadeUp>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">The Platform</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-asphalt sm:text-4xl">
              More Than a Facebook Group
            </h2>
            <p className="mt-4 max-w-xl text-lg text-muted">
              We built our own platform because the community deserves better than algorithm-buried Facebook posts.
            </p>
          </FadeUp>

          <FadeUp>
            <div className="mx-auto mt-12 grid max-w-lg gap-4 sm:grid-cols-2">
              {[
                "Build a rider profile",
                "Add bikes to your garage",
                "Create and join events",
                "Share ride reports",
                "Upload photos and videos",
                "Connect with local riders",
                "Track your favorite roads",
                "Show off your gear and mods",
              ].map((item) => (
                <div key={item} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-asphalt shadow-soft">
                  {item}
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* CTA */}
      <section className="py-10">
        <div>
          <ScaleIn>
            <div className="relative overflow-hidden rounded-3xl">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${siteImages.history.culture})` }}
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-linear-to-br from-asphalt/95 via-asphalt/85 to-asphalt/70" aria-hidden="true" />
              <div className="relative flex flex-col items-center gap-6 px-6 py-20 text-center text-white sm:px-12 sm:py-24">
                <FadeUp>
                  <p className="font-display text-2xl font-bold leading-snug tracking-tight sm:text-3xl">
                    Every ride starts somewhere.
                  </p>
                  <p className="mt-2 font-display text-2xl font-bold leading-snug tracking-tight sm:text-3xl">
                    Maybe yours starts here.
                  </p>
                  <p className="mt-8 text-lg text-slate-300">
                    Welcome to District 76 Riders.
                  </p>
                  <Link
                    href="/join"
                    className="group mt-8 inline-flex items-center gap-2 rounded-full bg-sunset px-10 py-4 text-sm font-semibold text-white shadow-lg transition hover:bg-[#cf5a26]"
                  >
                    Join the Community
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </FadeUp>
              </div>
            </div>
          </ScaleIn>
        </div>
      </section>
      </div>
    </AppShell>
  );
}
