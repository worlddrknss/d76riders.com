import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/og";
import Link from "next/link";
import {
  Shield,
  ShieldCheck,
  ArrowUpDown,
  Users,
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  Wrench,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { FadeUp, StaggerList, StaggerItem, ScaleIn } from "@/components/ui/motion";

export const metadata: Metadata = {
  title: "Ride Safety: Group Riding, Formations & What To Do When It Goes Wrong",
  description:
    "How District 76 Riders ride together: formations, who does what on a ride, pack discipline at intersections, hand signals, what to do if you get separated or break down, and the first minutes at a crash scene.",
  alternates: { canonical: "/safety" },
  openGraph: {
    images: OG_IMAGE,
    title: "Ride Safety | District 76 Riders",
    description:
      "Formations, ride roles, hand signals, and what to do when a ride goes wrong.",
  },
};

const formations = [
  {
    title: "Staggered",
    description:
      "The default on open road. The lead takes the left third of the lane, the next rider sits in the right third about a second back. You end up two seconds behind the rider in your own track, which is enough room to react, while the group still takes up a short stretch of road.",
    when: "Highways, straight roads, normal traffic.",
  },
  {
    title: "Single file",
    description:
      "Everyone in one line, two seconds apart, taking the whole lane. Use it any time the road stops being simple. In a corner your line changes as you lean, and a staggered rider has nowhere to go if you run wide.",
    when: "Curves, intersections, bad surfaces, construction, narrow roads with oncoming traffic.",
  },
  {
    title: "Side by side",
    description:
      "Two bikes level in one lane. Fine at walking pace in a parking lot, dangerous anywhere else. Neither rider has room to swerve, and you both lose the escape route the other is sitting in.",
    when: "Parking lots and photos. Not on the road at speed.",
  },
];

const rideRoles = [
  {
    role: "Ride lead",
    icon: Users,
    description:
      "Knows the route, sets the pace, and picks it for the least experienced rider present rather than the best one. Signals hazards early enough to be useful, and holds a pace the back of the group can actually maintain.",
  },
  {
    role: "Sweep",
    icon: ShieldCheck,
    description:
      "Rides last and stays last. Nobody is behind the sweep, so if you can see them in your mirror something has gone wrong. They stop with anyone who drops out and carry a phone, a charger, and the lead's number.",
  },
  {
    role: "Everyone in between",
    icon: ArrowUpDown,
    description:
      "Hold your position and your gap. Pass the hand signals back so they reach the tail. If you want to go faster than the group, this is not the ride for it, and nobody will think less of you for saying so before we set off.",
  },
];

const packRules = [
  {
    title: "Keep your gap, not your neighbor's",
    body: "Two seconds to the rider in your track. If someone tailgates you, let them past at the next stop rather than speeding up. Closing gaps to look tidy is how the whole group ends up braking at once.",
  },
  {
    title: "Never run an intersection to stay together",
    body: "Groups get split by lights all the time. That is normal and fine. The lead pulls over past the junction, or the group regroups at the next stop. A rider who runs a red to keep up is worth less to us than a two minute wait.",
  },
  {
    title: "Pass one at a time",
    body: "Overtaking as a pack pressures the car driver and hides bikes in blind spots. Make the pass individually when you personally have the room, and slot back into the formation afterwards.",
  },
  {
    title: "Ride your own ride",
    body: "The pace is not a test. If a corner is faster than you like it, go slower and catch up at the next stop. Riding beyond your skill to keep up with strangers is the single most common way a good ride goes bad.",
  },
];

const handSignals = [
  { signal: "Left arm straight out", meaning: "Left turn" },
  { signal: "Left arm bent up at 90 degrees", meaning: "Right turn" },
  { signal: "Left arm out, palm down, moving down", meaning: "Slow down" },
  { signal: "Left arm up, fist closed", meaning: "Stop, pull over" },
  { signal: "Left arm down, finger pointing at the road", meaning: "Hazard on the left" },
  { signal: "Right foot out, pointing at the road", meaning: "Hazard on the right" },
  { signal: "Left arm up, one finger raised", meaning: "Single file" },
  { signal: "Left arm up, two fingers raised", meaning: "Staggered formation" },
  { signal: "Tap the top of your helmet", meaning: "Police ahead" },
  { signal: "Open and close your hand", meaning: "Your turn signal is still on" },
  { signal: "Point at the tank, or thumb to mouth", meaning: "Fuel or food stop" },
  { signal: "Pat the seat behind you", meaning: "Follow me" },
];

const goesWrong = [
  {
    title: "You get separated",
    icon: AlertTriangle,
    body: "Do not chase. Carry on to the next planned stop at your own pace and wait there. This is exactly why the route gets shared before we leave, and why the sweep has the lead's number.",
  },
  {
    title: "You break down",
    icon: Wrench,
    body: "Get off the road, get behind a barrier if there is one, and put your hazards on. The sweep will stop with you. Nobody gets left on the roadside, but you will wait more comfortably somewhere the traffic is not.",
  },
  {
    title: "Someone goes down",
    icon: HeartPulse,
    body: "Protect the scene first, then call it in. The steps below are the first few minutes, before anyone with real training arrives.",
  },
];

// Split into the imperative and the reasoning so the action can carry the weight
// — under stress you scan the bold line, not the paragraph.
const crashSteps = [
  {
    action: "Stop safely and shield the scene",
    detail:
      "Park where you shield the scene without blocking the responders' way in. Hazards on. You are no use to anyone as the second casualty.",
  },
  {
    action: "Send one person to call 911",
    detail:
      "Give them a road name, a junction, or a mile marker. Everyone assuming somebody else called is a real thing that happens.",
  },
  {
    action: "Stop serious bleeding with firm direct pressure",
    detail:
      "Blood loss is the thing you can actually fix on a roadside. If you carry a tourniquet and know how to use it, use it, and note the time.",
  },
  {
    action: "Leave the helmet on",
    detail:
      "Unless they are not breathing. It is holding the head and neck in line. Getting it off badly is worse than leaving it on.",
  },
  {
    action: "Do not move them",
    detail:
      "Unless they are in immediate danger from traffic or fire. Kneel where they can see you without turning their head.",
  },
  {
    action: "Tell the medics what you saw",
    detail:
      "The speed, what they hit, whether they were knocked out, and for how long. You were there and they were not.",
  },
];

const preRide = [
  "Tires, brakes, lights, chain, oil. The two minute version of T-CLOCS.",
  "Gear on. Helmet, jacket, gloves, boots. Every ride, including the short ones.",
  "Fuel up before you arrive. Nobody wants to stop at ten miles because one bike started dry.",
  "Route on your phone, phone charged and mounted or pocketed where you can reach it.",
  "Emergency contact set up on your card, so the information is on you rather than in someone's memory.",
  "Turn up early. Kickstands up means moving, not arriving.",
  "Say something at the briefing if you are new, on a new bike, or not feeling it. Everyone has been there and the pace will adjust.",
  "If you have had a drink, you are not riding. There is no version of this we are relaxed about.",
];

export default function SafetyPage() {
  return (
    <AppShell>
      <div>
        <PageHeader
          icon={Shield}
          eyebrow="Preparedness"
          title="Ride Smart. Ride Together."
          subtitle="Riding in a group is most of the fun and all of the responsibility. This is how we do it, and what we expect from each other on the road."
        />

      {/* FORMATIONS */}
      <section className="py-10">
        <div>
          <FadeUp>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Group Formations</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight text-asphalt sm:text-4xl">
              Know Your Position
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-muted">
              Where you sit in the lane decides who can see you and where you go when something appears in front of you.
            </p>
          </FadeUp>

          <StaggerList className="mt-8 grid gap-6 lg:grid-cols-3">
            {formations.map((f) => (
              <StaggerItem key={f.title}>
                <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sunset/10">
                    <ArrowUpDown className="h-5 w-5 text-sunset" />
                  </div>
                  <h3 className="mt-4 font-display text-lg text-asphalt">{f.title}</h3>
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

      {/* WHO DOES WHAT (dark) */}
      <section className="rounded-2xl bg-asphalt px-6 py-10 text-white sm:px-8">
        <div>
          <FadeUp>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">On The Day</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
              Who Does What
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-slate-300">
              Every ride has a lead and a sweep. Knowing which is which, and what they are for, is most of what makes a group ride work.
            </p>
          </FadeUp>

          <div className="mt-8 space-y-4">
            {rideRoles.map((item) => {
              const Icon = item.icon;
              return (
                <FadeUp key={item.role}>
                  <div className="flex items-start gap-5 rounded-xl border border-white/10 bg-white/5 p-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sunset">
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-display text-lg">{item.role}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-300">{item.description}</p>
                    </div>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* PACK DISCIPLINE */}
      <section className="py-10">
        <div>
          <FadeUp>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">In The Pack</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight text-asphalt sm:text-4xl">
              Four Things That Keep A Group Safe
            </h2>
          </FadeUp>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {packRules.map((item) => (
              <FadeUp key={item.title}>
                <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 shadow-soft">
                  <h3 className="font-display text-base text-asphalt">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* HAND SIGNALS (dark) */}
      <section className="rounded-2xl bg-asphalt px-6 py-10 text-white sm:px-8">
        <div>
          <FadeUp>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Communication</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
              Hand Signals
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-slate-300">
              At speed you cannot shout and most of us are not on comms. Signals only work if they get passed back, so whatever reaches you, send it on to the rider behind.
            </p>
          </FadeUp>

          <FadeUp>
            <div className="mx-auto mt-12 max-w-2xl overflow-x-auto rounded-2xl border border-white/10">
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

      {/* WHEN IT GOES WRONG */}
      <section className="py-10">
        <div>
          <FadeUp>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">When It Goes Wrong</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight text-asphalt sm:text-4xl">
              Nobody Gets Left Behind
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-muted">
              Rides get split, bikes break, and occasionally someone goes down. None of it is a drama if everyone knows what happens next.
            </p>
          </FadeUp>

          <StaggerList className="mt-8 grid gap-6 lg:grid-cols-3">
            {goesWrong.map((item) => {
              const Icon = item.icon;
              return (
                <StaggerItem key={item.title}>
                  <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 shadow-soft">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sunset/10">
                      <Icon className="h-5 w-5 text-sunset" />
                    </div>
                    <h3 className="mt-4 font-display text-lg text-asphalt">{item.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{item.body}</p>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerList>

          {/* The most consequential block on the site — it gets a solid header bar
              and full column width so it can't be scrolled past. */}
          <FadeUp>
            <div className="mt-10 overflow-hidden rounded-2xl border-2 border-red-600 shadow-lift">
              <div className="flex items-start gap-3 bg-red-600 px-6 py-5 sm:px-8">
                <HeartPulse className="mt-1 h-7 w-7 shrink-0 text-white" />
                <div>
                  <p className="text-[0.7rem] font-bold uppercase tracking-[0.16em] text-white/75">
                    If someone goes down
                  </p>
                  <h3 className="font-display text-2xl tracking-tight text-white sm:text-3xl">
                    The first few minutes at a crash
                  </h3>
                </div>
              </div>

              <div className="bg-red-50/70 px-6 py-6 sm:px-8">
                <ol className="space-y-4">
                  {crashSteps.map((step, i) => (
                    <li key={step.action} className="flex items-start gap-4">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-600 font-display text-base text-white">
                        {i + 1}
                      </span>
                      <p className="text-base leading-relaxed text-asphalt/80">
                        <span className="font-bold text-red-900">{step.action}.</span> {step.detail}
                      </p>
                    </li>
                  ))}
                </ol>
                <p className="mt-6 border-t border-red-200 pt-4 text-xs leading-relaxed text-asphalt/60">
                  This is what to do until the professionals arrive, not a substitute for being trained. If you ride often,
                  a day on a first aid course is the best money you will spend on kit you hope never to use.
                </p>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* EMERGENCY CARD */}
      <section className="py-10">
        <div>
          <FadeUp>
            <div className="flex flex-col items-start gap-5 rounded-2xl border border-border bg-surface p-6 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sunset/10">
                  <HeartPulse className="h-6 w-6 text-sunset" />
                </div>
                <div>
                  <h2 className="font-display text-xl text-asphalt">Put your details on your bike</h2>
                  <p className="mt-1 max-w-xl text-sm text-muted">
                    An emergency card holds your medical information and next of kin behind an NFC tag or QR code on
                    your helmet or tank. If you cannot answer questions, it answers them for you. Set it up from your
                    rider profile.
                  </p>
                </div>
              </div>
              <Link
                href="/emergency-response"
                className="shrink-0 rounded-lg bg-sunset px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#cf5a26]"
              >
                Learn More
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* PRE-RIDE */}
      <section className="rounded-2xl bg-asphalt px-6 py-10 text-white sm:px-8">
        <div>
          <FadeUp>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Before You Ride</p>
            <h2 className="mt-2 font-display text-3xl tracking-tight sm:text-4xl">
              Pre-Ride Checklist
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-slate-300">
              Five minutes in the driveway, and the ride starts the way it should.
            </p>
          </FadeUp>

          <FadeUp>
            <div className="mx-auto mt-12 max-w-2xl space-y-3">
              {preRide.map((item) => (
                <div key={item} className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-sunset" />
                  <p className="text-sm leading-relaxed text-slate-300">{item}</p>
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
            <ShieldCheck className="mx-auto h-12 w-12 text-sunset" />
          </ScaleIn>
          <FadeUp>
            <h2 className="mt-6 font-display text-3xl tracking-tight text-asphalt sm:text-4xl">
              Safety Is A Skill. Practice It.
            </h2>
            <p className="mt-4 max-w-xl text-lg text-muted">
              The riders worth following are not the quickest ones. They are the ones who get everybody home, every
              time, and make it look unremarkable.
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
                className="rounded-lg border border-border px-6 py-3 text-sm font-semibold uppercase tracking-[0.06em] text-asphalt transition hover:bg-surface"
              >
                Upcoming Rides
              </Link>
            </div>
          </FadeUp>
        </div>
      </section>
      </div>
    </AppShell>
  );
}
