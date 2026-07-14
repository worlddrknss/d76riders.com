import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { faqs, guidelines, missionValues } from "@/data/community";
import { siteImages } from "@/data/images";
import { PageHero } from "@/components/layout/page-hero";
import { FadeUp, StaggerList, StaggerItem, ScaleIn } from "@/components/ui/motion";

export const metadata: Metadata = {
  title: "Our History — Clarksville Motorcycle Community Since Day One",
  description:
    "Learn about District 76 Riders — how a military town, a love for motorcycles, and the roads of Middle Tennessee brought our community together in Clarksville, TN.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "Our History — District 76 Riders",
    description: "The story of how Clarksville's motorcycle community came together.",
  },
};

export default function AboutPage() {
  return (
    <div>
      <PageHero
        image={siteImages.pageHeroes.about}
        eyebrow="Our History"
        title="From Clarksville Roads to District 76"
        description="The story of how a historic river town, a strong military community, and a love of motorcycles came together to build something that lasts."
      />

      {/* TIMELINE */}
      <section className="relative w-full bg-canvas">
        {/* Vertical timeline line */}
        <div className="absolute inset-y-0 left-1/2 hidden w-px -translate-x-1/2 bg-linear-to-b from-transparent via-sunset/30 to-transparent lg:block" aria-hidden="true" />

        {/* ── CHAPTER 1 ── */}
        <div className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="absolute left-1/2 top-24 hidden h-4 w-4 -translate-x-1/2 rounded-full border-4 border-canvas bg-sunset lg:block" aria-hidden="true" />

          <FadeUp>
            <div className="text-center">
              <span className="font-display text-[8rem] font-bold leading-none tracking-tighter text-asphalt/5 sm:text-[12rem]">1785</span>
            </div>
            <div className="-mt-16 sm:-mt-24">
              <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Chapter One</p>
              <h2 className="mt-2 text-center font-display text-3xl font-bold tracking-tight text-asphalt sm:text-4xl">
                Rooted in Clarksville
              </h2>
            </div>
          </FadeUp>

          <div className="mt-12 grid items-center gap-12 lg:grid-cols-5">
            <FadeUp className="lg:col-span-2">
              <p className="text-lg leading-relaxed text-muted">
                Founded where the Cumberland and Red Rivers meet, Clarksville grew up as a place people passed through, traded in, and eventually called home.
              </p>
              <blockquote className="mt-6 border-l-4 border-sunset pl-5 font-display text-xl font-semibold italic leading-snug text-asphalt">
                &ldquo;It has always been a town shaped by movement.&rdquo;
              </blockquote>
              <p className="mt-6 leading-relaxed text-muted">
                The river bluffs, country backroads, and ridgelines that once carried wagons and rail lines are the same roads we ride today. When you ride through Montgomery County, you are riding through a lot of history.
              </p>
            </FadeUp>
            <FadeUp delay={0.15} className="lg:col-span-3">
              <div
                className="aspect-4/3 w-full rounded-2xl bg-cover bg-center shadow-lift"
                style={{ backgroundImage: `url(${siteImages.history.clarksville})` }}
                role="img"
                aria-label="Historic Clarksville, Tennessee"
              />
            </FadeUp>
          </div>
        </div>

        {/* ── CHAPTER 2 — FULL BLEED DARK WITH PARALLAX ── */}
        <div className="relative w-full overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-fixed bg-center"
            style={{ backgroundImage: `url(${siteImages.history.culture})` }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-asphalt/90" aria-hidden="true" />

          <div className="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="absolute left-1/2 top-24 hidden h-4 w-4 -translate-x-1/2 rounded-full border-4 border-asphalt bg-sunset lg:block" aria-hidden="true" />

            <div className="py-24">
              <FadeUp>
                <div className="text-center">
                  <span className="font-display text-[8rem] font-bold leading-none tracking-tighter text-white/5 sm:text-[12rem]">101st</span>
                </div>
                <div className="-mt-16 sm:-mt-24">
                  <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Chapter Two</p>
                  <h2 className="mt-2 text-center font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    A Military Town That Rides
                  </h2>
                </div>
              </FadeUp>

              <FadeUp className="mx-auto mt-12 max-w-3xl">
                <p className="text-center text-lg leading-relaxed text-slate-300">
                  Clarksville sits right next to Fort Campbell, home of the 101st Airborne Division. Soldiers, veterans, and military families have always been a big part of who this town is — and a lot of them ride.
                </p>

                <div className="my-12 flex items-center gap-6">
                  <span className="h-px flex-1 bg-white/10" />
                  <span className="font-display text-sm font-bold uppercase tracking-[0.2em] text-sunset">Freedom</span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>

                <blockquote className="text-center font-display text-2xl font-semibold italic leading-snug text-white sm:text-3xl">
                  &ldquo;For many of them a motorcycle is the feeling of freedom after a deployment, the quiet of an open road, and the kind of brotherhood that carries straight over from service.&rdquo;
                </blockquote>
              </FadeUp>
            </div>
          </div>
        </div>

        {/* ── CHAPTER 3 ── */}
        <div className="relative mx-auto w-full max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="absolute left-1/2 top-24 hidden h-4 w-4 -translate-x-1/2 rounded-full border-4 border-canvas bg-sunset lg:block" aria-hidden="true" />

          <FadeUp>
            <div className="text-center">
              <span className="font-display text-[8rem] font-bold leading-none tracking-tighter text-asphalt/5 sm:text-[12rem]">D76</span>
            </div>
            <div className="-mt-16 sm:-mt-24">
              <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Chapter Three</p>
              <h2 className="mt-2 text-center font-display text-3xl font-bold tracking-tight text-asphalt sm:text-4xl">
                Building District 76
              </h2>
            </div>
          </FadeUp>

          <div className="mt-12 grid items-center gap-12 lg:grid-cols-5">
            <FadeUp delay={0.15} className="order-last lg:order-first lg:col-span-3">
              <div
                className="aspect-4/3 w-full rounded-2xl bg-cover bg-center shadow-lift"
                style={{ backgroundImage: `url(${siteImages.history.founding})` }}
                role="img"
                aria-label="District 76 riders together"
              />
            </FadeUp>
            <FadeUp className="lg:col-span-2">
              <p className="text-lg leading-relaxed text-muted">
                For a long time all of that passion lived in scattered group rides and parking lot meetups. The riders were here and the culture was here, but there was no real place to bring everyone together.
              </p>
              <p className="mt-4 leading-relaxed text-muted">
                So a few local riders made a simple decision: instead of waiting for that community to show up, they built it.
              </p>
              <blockquote className="mt-6 border-l-4 border-sunset pl-5 font-display text-xl font-semibold italic leading-snug text-asphalt">
                &ldquo;No stereotypes. No gatekeeping. Just good routes and good people.&rdquo;
              </blockquote>
              <p className="mt-6 leading-relaxed text-muted">
                It grew from those first weekend rides into a reliable network of riders who show up for each other — on the road and off it.
              </p>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
          <FadeUp className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Our Principles</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-asphalt sm:text-4xl">
              What We Stand For
            </h2>
          </FadeUp>
          <StaggerList className="mt-12 grid gap-4 grid-cols-2 lg:grid-cols-4">
            {missionValues.map((value) => (
              <StaggerItem key={value}>
                <div className="group flex h-full items-start gap-3 rounded-2xl border border-border bg-surface p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sunset/10">
                    <ShieldCheck className="h-4 w-4 text-sunset" />
                  </div>
                  <p className="text-sm leading-relaxed text-muted">{value}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* GUIDELINES — DARK */}
      <section className="w-full bg-asphalt text-white">
        <div className="mx-auto w-full max-w-5xl px-4 py-24 sm:px-6 lg:px-8">
          <FadeUp className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Ride Culture</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Community Guidelines
            </h2>
            <p className="mt-3 text-sm text-slate-400">Simple standards that keep rides safe and welcoming.</p>
          </FadeUp>
          <StaggerList className="mt-12 columns-1 gap-4 space-y-4 sm:columns-2">
            {guidelines.map((item) => (
              <StaggerItem key={item}>
                <p className="break-inside-avoid rounded-2xl border border-white/10 bg-white/5 p-6 text-sm leading-relaxed text-slate-300 backdrop-blur">
                  {item}
                </p>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* FAQ — COLLAPSIBLE */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-3xl px-4 py-24 sm:px-6 lg:px-8">
          <FadeUp className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Got Questions?</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-asphalt sm:text-4xl">
              FAQ
            </h2>
          </FadeUp>
          <StaggerList className="mt-12 divide-y divide-border rounded-2xl border border-border bg-surface shadow-soft">
            {faqs.map((faq) => (
              <StaggerItem key={faq.question}>
                <details className="group p-6">
                  <summary className="flex cursor-pointer items-center justify-between font-display text-base font-bold text-asphalt">
                    {faq.question}
                    <span className="ml-4 shrink-0 text-lg text-sunset transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 leading-relaxed text-muted">{faq.answer}</p>
                </details>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 pb-24 sm:px-6 lg:px-8">
          <ScaleIn>
            <div className="relative overflow-hidden rounded-3xl">
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${siteImages.history.culture})` }}
                aria-hidden="true"
              />
              <div className="absolute inset-0 bg-linear-to-br from-asphalt/95 via-asphalt/85 to-asphalt/70" aria-hidden="true" />
              <div className="relative flex flex-col items-center gap-6 px-6 py-20 text-center text-white sm:px-12 sm:py-24">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Join Us</p>
                <h2 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">Ready to Ride?</h2>
                <p className="max-w-lg text-lg text-slate-300">
                  Connect with riders, discover new roads, and be part of something built by the community, for the community.
                </p>
                <Link
                  href="/join"
                  className="group mt-2 inline-flex items-center gap-2 rounded-full bg-sunset px-10 py-4 text-sm font-semibold text-white shadow-lg transition hover:bg-[#cf5a26]"
                >
                  Join District 76
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </div>
          </ScaleIn>
        </div>
      </section>
    </div>
  );
}
