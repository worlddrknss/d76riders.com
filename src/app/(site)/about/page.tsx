import type { Metadata } from "next";
import { Flag, ShieldCheck, Users } from "lucide-react";
import { faqs, guidelines, missionValues } from "@/data/community";
import { siteImages } from "@/data/images";
import { PageHero } from "@/components/layout/page-hero";

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

      {/* CHAPTER 1: CLARKSVILLE HISTORY */}
      <section className="w-full bg-canvas">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Chapter One</p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-asphalt sm:text-3xl">
              Rooted in Clarksville
            </h2>
            <p className="mt-4 text-muted">
              Clarksville was founded in 1785 where the Cumberland and Red Rivers meet, and it grew up as a place people passed through, traded in, and eventually called home. It has always been a town shaped by movement.
            </p>
            <p className="mt-3 text-muted">
              The river bluffs, country backroads, and ridgelines that once carried wagons and rail lines are the same roads we ride today. When you ride through Montgomery County, you are riding through a lot of history.
            </p>
          </div>
          <div
            className="h-64 w-full rounded-xl bg-cover bg-center shadow-lift sm:h-80"
            style={{ backgroundImage: `url(${siteImages.history.clarksville})` }}
            role="img"
            aria-label="Historic Clarksville, Tennessee along the river"
          />
        </div>
      </section>

      {/* CHAPTER 2: MILITARY TOWN */}
      <section className="w-full bg-asphalt text-white">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div
            className="order-last h-64 w-full rounded-xl bg-cover bg-center shadow-lift sm:h-80 lg:order-first"
            style={{ backgroundImage: `url(${siteImages.history.culture})` }}
            role="img"
            aria-label="Riders on a Tennessee road at golden hour"
          />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Chapter Two</p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              A Military Town That Rides
            </h2>
            <p className="mt-4 text-slate-300">
              Clarksville sits right next to Fort Campbell, home of the 101st Airborne Division. That connection runs deep. Soldiers, veterans, and military families have always been a big part of who this town is, and a lot of them ride.
            </p>
            <p className="mt-3 text-slate-300">
              For many of them a motorcycle is more than a hobby. It is the feeling of freedom after a deployment, the quiet of an open road, and the kind of brotherhood and sisterhood that carries straight over from service into the riding community. That spirit is woven into how people ride around here.
            </p>
          </div>
        </div>
      </section>

      {/* CHAPTER 3: FOUNDING DISTRICT 76 */}
      <section className="w-full bg-canvas">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Chapter Three</p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight text-asphalt sm:text-3xl">
              Building District 76
            </h2>
            <p className="mt-4 text-muted">
              For a long time all of that passion lived in scattered group rides and parking lot meetups. The riders were here and the culture was here, but there was no real place to bring everyone together. So a few local riders made a simple decision. Instead of waiting for that community to show up, they built it.
            </p>
            <p className="mt-3 text-muted">
              District 76 started with a handful of people who wanted good routes, clear expectations, and a welcoming space for every kind of rider. No stereotypes and no gatekeeping. It grew from those first weekend rides into a reliable network of riders who show up for each other on the road and off it. This is the community that Clarksville was always building toward.
            </p>
          </div>
          <div
            className="h-64 w-full rounded-xl bg-cover bg-center shadow-lift sm:h-80"
            style={{ backgroundImage: `url(${siteImages.history.founding})` }}
            role="img"
            aria-label="District 76 riders together"
          />
        </div>
      </section>

      {/* VALUES */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <article className="rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-asphalt">What We Stand For</h2>
            <ul className="mt-4 grid gap-3 text-muted sm:grid-cols-2">
              {missionValues.map((value) => (
                <li key={value} className="flex items-start gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                  {value}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      {/* GUIDELINES */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-xl font-bold uppercase tracking-tight text-asphalt">Community Guidelines</h2>
            <p className="text-sm text-muted">Simple standards that keep rides safe and welcoming.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {guidelines.map((item) => (
              <p key={item} className="rounded-xl border border-border bg-surface p-4 text-sm text-muted shadow-soft">
                {item}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-xl font-bold uppercase tracking-tight text-asphalt">FAQ</h2>
            <p className="text-sm text-muted">Quick answers for new riders.</p>
          </div>
          <div className="space-y-3">
            {faqs.map((faq) => (
              <article key={faq.question} className="rounded-xl border border-border bg-surface p-5 shadow-soft">
                <h3 className="font-semibold text-asphalt">{faq.question}</h3>
                <p className="mt-2 text-muted">{faq.answer}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid gap-4 rounded-2xl border border-border bg-surface p-6 text-sm text-muted shadow-soft sm:grid-cols-3 sm:p-8">
            <p className="flex items-center gap-2"><Users className="h-4 w-4 text-sunset" />Open to every rider style</p>
            <p className="flex items-center gap-2"><Flag className="h-4 w-4 text-sunset" />Focused on Clarksville roads</p>
            <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-sunset" />Built around respect and safety</p>
          </div>
        </div>
      </section>
    </div>
  );
}
