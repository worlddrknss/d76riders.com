import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck,
  Eye,
  ArrowUpDown,
  Bike,
  Brain,
  Compass,
  Hand,
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
} from "lucide-react";

import { PageHero } from "@/components/layout/page-hero";
import { FadeUp, StaggerList, StaggerItem, ScaleIn } from "@/components/ui/motion";
import { siteImages } from "@/data/images";

export const metadata: Metadata = {
  title: "Ride Safety — Group Riding, Formations & Safety Frameworks",
  description:
    "District 76 Riders safety essentials: group riding formations, staggered positioning, the SMART and RESQ frameworks, hand signals, and what every rider should know before a group ride.",
  alternates: { canonical: "/safety" },
  openGraph: {
    title: "Ride Safety — District 76 Riders",
    description:
      "Group riding formations, SMART and RESQ frameworks, hand signals, and safety essentials for every ride.",
  },
};

const formations = [
  {
    title: "Staggered Formation",
    description:
      "The standard for group riding on straight roads. The lead rider takes the left third of the lane. The second rider stays one second behind in the right third. This creates a two-second gap between each rider in the same track while maximizing visibility.",
    when: "Highways, straight roads, moderate traffic.",
  },
  {
    title: "Single File",
    description:
      "Every rider directly behind the one ahead with a two-second gap. Used when the road narrows, visibility drops, or conditions demand full lane control. No exceptions in curves.",
    when: "Curves, intersections, poor road surfaces, construction zones, two-lane roads with oncoming traffic.",
  },
  {
    title: "Side by Side",
    description:
      "Two riders share the lane side-by-side. Only appropriate at very low speeds in controlled environments. Never on public roads at speed.",
    when: "Parking lots, staged photo ops, parade pace only.",
  },
];

const smartFramework = [
  { letter: "S", word: "Scan", description: "Continuously scan the road, mirrors, and surroundings. Look where you want to go, not at what you want to avoid." },
  { letter: "M", word: "Manage", description: "Manage your speed, space, and visibility. Keep a safe following distance and position yourself where you can see and be seen." },
  { letter: "A", word: "Alert", description: "Stay alert to changing conditions — road surface, weather, traffic patterns, and the behavior of riders around you." },
  { letter: "R", word: "Respond", description: "Respond smoothly to hazards. Brake progressively, steer deliberately, and avoid sudden inputs that unsettle the bike." },
  { letter: "T", word: "Time", description: "Give yourself time. Riding too fast for conditions removes your margin for error. Speed is a choice, not a requirement." },
];

const resqFramework = [
  { letter: "R", word: "Remain calm", description: "Panic makes everything worse. Take a breath, assess the situation, and think before you act. A calm responder saves lives." },
  { letter: "E", word: "Ensure your own safety", description: "You can't help anyone if you become a second victim. Check for traffic, hazards, and secure the scene before approaching." },
  { letter: "S", word: "Stop major bleeds", description: "Severe bleeding is the number one preventable cause of death in trauma. Apply direct pressure, use a tourniquet if trained, and don't remove it." },
  { letter: "Q", word: "Quickly assess severity", description: "Is the rider conscious? Breathing? Can they move? Relay this information clearly to 911. Every detail helps the incoming medics." },
];

const handSignals = [
  { signal: "Left arm straight out", meaning: "Left turn" },
  { signal: "Left arm bent up at 90°", meaning: "Right turn" },
  { signal: "Left arm extended down, palm back", meaning: "Slow down / stop" },
  { signal: "Left arm extended down, pointing at road", meaning: "Road hazard on left" },
  { signal: "Right foot extended, pointing at road", meaning: "Road hazard on right" },
  { signal: "Left arm up, fist clenched", meaning: "Stop — pull over" },
  { signal: "Helmet tap", meaning: "Police ahead" },
  { signal: "Open and close hand repeatedly", meaning: "Turn signal is on" },
];

export default function SafetyPage() {
  return (
    <div>
      <PageHero
        image={siteImages.pageHeroes.safety}
        eyebrow="Ride Safety"
        title="Ride Smart. Ride Together."
        description="Group riding is one of the best parts of this community — but it comes with responsibility. Here's how we ride safe."
      />

      {/* FORMATIONS */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
          <FadeUp className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Group Formations</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-asphalt sm:text-4xl">
              Know Your Position
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
              Where you ride in the group matters. The right formation keeps everyone visible, gives room to react, and prevents the accordion effect.
            </p>
          </FadeUp>

          <StaggerList className="mt-16 grid gap-6 lg:grid-cols-3">
            {formations.map((f) => (
              <StaggerItem key={f.title}>
                <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sunset/10">
                    <ArrowUpDown className="h-5 w-5 text-sunset" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-asphalt">{f.title}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{f.description}</p>
                  <p className="mt-4 rounded-lg bg-canvas px-3 py-2 text-xs font-medium text-asphalt">
                    <span className="font-semibold text-sunset">When:</span> {f.when}
                  </p>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* EMERGENCY CARD PROMPT */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-5xl px-4 pb-8 sm:px-6 lg:px-8">
          <FadeUp>
            <div className="flex flex-col items-start gap-5 rounded-2xl border border-red-200 bg-red-50/50 p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100">
                  <HeartPulse className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-asphalt">Set Up Your Emergency Card</h2>
                  <p className="mt-1 max-w-xl text-sm text-muted">
                    Store encrypted medical info and emergency contacts that first responders can reach by
                    scanning an NFC tag or QR code on your bike or helmet. Manage it from your rider profile.
                  </p>
                </div>
              </div>
              <Link
                href="/emergency-response"
                className="shrink-0 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Learn More
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* SMART FRAMEWORK — DARK */}
      <section className="w-full bg-asphalt text-white">
        <div className="mx-auto w-full max-w-5xl px-4 py-24 sm:px-6 lg:px-8">
          <FadeUp className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Framework</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              SMART Riding
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
              Inspired by Dan Dan the Fireman&apos;s approach to motorcycle safety. Five principles that keep you alive.
            </p>
          </FadeUp>

          <div className="mt-16 space-y-4">
            {smartFramework.map((item) => (
              <FadeUp key={item.letter}>
                <div className="flex items-start gap-5 rounded-xl border border-white/10 bg-white/5 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sunset font-display text-xl font-bold text-white">
                    {item.letter}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold">{item.word}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-300">{item.description}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* RESQ FRAMEWORK */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-5xl px-4 py-24 sm:px-6 lg:px-8">
          <FadeUp className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Framework</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-asphalt sm:text-4xl">
              RESQ Protocol
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">
              Dan Dan the Fireman&apos;s emergency response framework. When a rider goes down, these four steps guide your first actions on scene.
            </p>
          </FadeUp>

          <div className="mt-16 grid gap-4 sm:grid-cols-2">
            {resqFramework.map((item) => (
              <FadeUp key={item.letter}>
                <div className="flex h-full items-start gap-4 rounded-2xl border border-border bg-surface p-6 shadow-soft">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-asphalt font-display text-xl font-bold text-white">
                    {item.letter}
                  </div>
                  <div>
                    <h3 className="font-display text-base font-semibold text-asphalt">{item.word}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>
                  </div>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* HAND SIGNALS — DARK */}
      <section className="w-full bg-asphalt text-white">
        <div className="mx-auto w-full max-w-4xl px-4 py-24 sm:px-6 lg:px-8">
          <FadeUp className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Communication</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Hand Signals
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300">
              At highway speeds you can&apos;t shout. Learn the universal motorcycle hand signals — they&apos;re how the group communicates without comms.
            </p>
          </FadeUp>

          <FadeUp>
            <div className="mx-auto mt-12 max-w-2xl overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="px-5 py-3 font-semibold tracking-wide text-sunset">Signal</th>
                    <th className="px-5 py-3 font-semibold tracking-wide text-sunset">Meaning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {handSignals.map((hs) => (
                    <tr key={hs.signal}>
                      <td className="px-5 py-3 text-slate-300">{hs.signal}</td>
                      <td className="px-5 py-3 font-medium text-white">{hs.meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* PRE-RIDE ESSENTIALS */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-4xl px-4 py-24 sm:px-6 lg:px-8">
          <FadeUp className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Before You Ride</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-asphalt sm:text-4xl">
              Pre-Ride Checklist
            </h2>
          </FadeUp>

          <FadeUp>
            <div className="mx-auto mt-12 max-w-xl space-y-3">
              {[
                "T-CLOCS check: Tires, Controls, Lights, Oil, Chassis, Stands",
                "Full gear: helmet, jacket, gloves, boots, pants — every ride",
                "Phone charged, ICE contacts updated",
                "Know the route or have it loaded on your phone/GPS",
                "Tank full — don't start a group ride on fumes",
                "Arrive early — the group waits for no one after KSU",
                "Ride your own ride — never ride beyond your skill level to keep up",
                "If you get separated, continue to the next planned stop",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sunset" />
                  <p className="text-sm leading-relaxed text-muted">{item}</p>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* CTA */}
      <section className="w-full bg-asphalt">
        <div className="mx-auto w-full max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
          <ScaleIn>
            <ShieldCheck className="mx-auto h-12 w-12 text-sunset" />
          </ScaleIn>
          <FadeUp>
            <h2 className="mt-6 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Safety Is a Skill. Practice It.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
              The best riders aren&apos;t the fastest — they&apos;re the ones who make it home every time. Ride with a group that takes that seriously.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/emergency-response"
                className="rounded-lg bg-sunset px-6 py-3 text-sm font-semibold uppercase tracking-[0.06em] text-white transition hover:bg-[#cf5a26]"
              >
                Emergency Response
              </Link>
              <Link
                href="/events"
                className="rounded-lg border border-white/20 px-6 py-3 text-sm font-semibold uppercase tracking-[0.06em] text-white transition hover:bg-white/10"
              >
                Upcoming Rides
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>
    </div>
  );
}
