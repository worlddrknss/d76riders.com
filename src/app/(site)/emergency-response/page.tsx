import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/og";
import Link from "next/link";
import {
  ShieldCheck,
  Heart,
  HeartPulse,
  Radio,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  ClipboardList,
  AlertTriangle,
  Users,
  MapPin,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { FadeUp, StaggerList, StaggerItem, ScaleIn } from "@/components/ui/motion";

export const metadata: Metadata = {
  title: "Emergency Response — NFC ID, Check-Ins & Rider Down Protocol",
  description:
    "District 76 Riders emergency response tools: NFC helmet ID tags, live ride check-in system, encrypted medical data, and rider down quick-alert protocols.",
  alternates: { canonical: "/emergency-response" },
  openGraph: {
    images: OG_IMAGE,
    title: "Emergency Response — District 76 Riders",
    description:
      "NFC emergency ID tags, live ride check-ins, encrypted medical data, and a culture built around looking out for each other.",
  },
};

const pillars = [
  {
    icon: Heart,
    title: "Emergency Preparedness",
    description:
      "Every rider can carry critical medical information on their helmet — accessible to first responders with a single tap, even if the rider can't speak.",
  },
  {
    icon: Radio,
    title: "Live Ride Check-In",
    description:
      "Organizers know who's on the ride in real time. Check in at the start, check out at the end. If someone doesn't check out, we know immediately.",
  },
  {
    icon: AlertTriangle,
    title: "Hazard Reporting",
    description:
      "Debris, road work, weather changes, or police activity — riders report hazards in real time so everyone behind them knows what's ahead.",
  },
  {
    icon: Users,
    title: "Rider Down Protocol",
    description:
      "A structured quick-alert flow for organizers when a rider goes down. No confusion, no delays — just the right people notified with the right information.",
  },
];

const nfcFeatures = [
  {
    icon: Smartphone,
    title: "Tap to Reveal",
    description:
      "Any modern phone with NFC can read the tag. No app required. A bystander or first responder taps the sticker on your helmet and sees your emergency card.",
  },
  {
    icon: Lock,
    title: "Encrypted at Rest",
    description:
      "Medical data is protected with envelope encryption — each rider's data has its own encryption key, wrapped by a master key stored outside the database.",
  },
  {
    icon: Eye,
    title: "Acknowledgment Gate",
    description:
      "Before any medical information is shown, the viewer must confirm they are accessing it for emergency purposes. No casual browsing.",
  },
  {
    icon: ClipboardList,
    title: "Access Logging",
    description:
      "Every tap is logged with timestamp and device info. You can see exactly when and how many times your emergency card has been accessed.",
  },
  {
    icon: EyeOff,
    title: "You Control What's Visible",
    description:
      "Choose which fields appear on your card — name, emergency contacts, blood type, allergies, medical conditions. Show only what you're comfortable sharing.",
  },
  {
    icon: RefreshCw,
    title: "Revoke and Rewrite Anytime",
    description:
      "Deactivate your token instantly from your profile. Since our tags are rewritable NTAG215 chips, just write a new URL when you're ready.",
  },
  {
    icon: MapPin,
    title: "Location for First Responders",
    description:
      "When the tag is scanned, the page requests the scanner's GPS location and displays a readable address with coordinates. One tap to call 911 with the location ready to relay.",
  },
];

const emergencyFields = [
  "Rider Name",
  "Emergency Contact (name + phone)",
  "Blood Type",
  "Known Allergies",
  "Medical Conditions",
  "Current Medications",
  "Insurance Info (optional)",
  "Your Current Location (GPS + address)",
  "One-Tap Call 911",
];

export default function SafetyPage() {
  return (
    <AppShell>
      <div>
        <PageHeader
          icon={HeartPulse}
          title="Every Ride. Every Rider. Protected."
          subtitle="Safety isn't a feature we bolt on. It's the foundation."
        />

      {/* STATUS BANNER */}
      <section className="w-full border-b border-sunset/20 bg-sunset/5">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-sunset/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sunset">Available Now</span>
            <p className="text-sm text-muted">Set up your encrypted emergency card from your rider profile.</p>
          </div>
          <p className="text-xs text-muted">Free at events and meetups. Shipping available for remote members.</p>
        </div>
      </section>

      {/* PILLARS */}
      <section className="py-10">
        <div>
          <FadeUp>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Our Safety Stack</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-asphalt sm:text-4xl">
              Built for the Realities of Group Riding
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-muted">
              Group rides are incredible — but they come with real risks. We build tools that reduce those risks without slowing anyone down.
            </p>
          </FadeUp>

          <StaggerList className="mt-8 grid gap-6 sm:grid-cols-2">
            {pillars.map((pillar) => (
              <StaggerItem key={pillar.title}>
                <div className="flex h-full items-start gap-4 rounded-2xl border border-border bg-surface p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sunset/10">
                    <pillar.icon className="h-5 w-5 text-sunset" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-asphalt">{pillar.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{pillar.description}</p>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* NFC EMERGENCY ID — DARK SECTION */}
      <section className="rounded-2xl bg-asphalt px-6 py-10 text-white sm:px-8">
        <div>
          <FadeUp>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">NFC Emergency ID</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Your Helmet Speaks When You Can&apos;t
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-slate-300">
              Every District 76 rider receives a transparent NFC sticker for their helmet. If the worst happens, a first responder taps it with their phone and instantly sees your emergency information.
            </p>
          </FadeUp>

          {/* How it works steps */}
          <FadeUp className="mx-auto mt-16 max-w-3xl">
            <div className="relative space-y-8 pl-8 before:absolute before:left-3 before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-sunset/30">
              {[
                { step: "1", title: "Set Up Your Card", text: "Add your emergency contacts, blood type, allergies, and any medical conditions from your rider profile." },
                { step: "2", title: "Get Your NFC Sticker", text: "Receive a transparent NTAG215 sticker at a meetup or event. It's written with your unique emergency URL." },
                { step: "3", title: "Stick It on Your Helmet", text: "Place it somewhere visible — the back or side of your helmet. It's transparent, weather-resistant, and always with you." },
                { step: "4", title: "Any Phone Can Read It", text: "iPhones 7+ and modern Android phones read NFC tags natively. No app download. No account needed. Just tap." },
              ].map((item) => (
                <div key={item.step} className="relative">
                  <div className="absolute -left-8 flex h-6 w-6 items-center justify-center rounded-full bg-sunset text-xs font-bold text-white">
                    {item.step}
                  </div>
                  <h3 className="font-display text-base font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">{item.text}</p>
                </div>
              ))}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* PRIVACY & SECURITY */}
      <section className="py-10">
        <div>
          <FadeUp>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Privacy &amp; Security</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-asphalt sm:text-4xl">
              Your Data, Your Control
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-muted">
              Emergency information is sensitive. We treat it that way — with encryption, access controls, and full transparency about who sees what.
            </p>
          </FadeUp>

          <StaggerList className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {nfcFeatures.map((feature) => (
              <StaggerItem key={feature.title}>
                <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sunset/10">
                    <feature.icon className="h-5 w-5 text-sunset" />
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold text-asphalt">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{feature.description}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerList>
        </div>
      </section>

      {/* WHAT'S ON THE CARD */}
      <section className="py-10">
        <div>
          <FadeUp>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">Emergency Card</p>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-asphalt sm:text-4xl">
              What a First Responder Sees
            </h2>
            <p className="mt-4 max-w-xl text-muted">
              After confirming emergency access, the following fields are displayed — only the ones you&apos;ve chosen to share.
            </p>
          </FadeUp>

          <FadeUp>
            <div className="mx-auto mt-12 max-w-md rounded-2xl border border-border bg-canvas p-8 shadow-lift">
              <div className="flex items-center gap-3 border-b border-border pb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                  <ShieldCheck className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-red-500">Emergency Card</p>
                  <p className="text-sm font-medium text-asphalt">District 76 Riders</p>
                </div>
              </div>
              <ul className="mt-4 space-y-3">
                {emergencyFields.map((field) => (
                  <li key={field} className="flex items-center gap-3 text-sm">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sunset" />
                    <span className="text-muted">{field}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-center text-xs text-muted/60">
                All fields are optional. You decide what&apos;s visible.
              </p>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-2xl bg-asphalt px-6 py-10 sm:px-8">
        <div>
          <ScaleIn>
            <ShieldCheck className="mx-auto h-12 w-12 text-sunset" />
          </ScaleIn>
          <FadeUp>
            <h2 className="mt-6 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Ride Together. Look Out for Each Other.
            </h2>
            <p className="mt-4 max-w-xl text-lg text-slate-300">
              Safety is a community effort. Join District 76 and ride with people who take it seriously.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/join"
                className="rounded-lg bg-sunset px-6 py-3 text-sm font-semibold uppercase tracking-[0.06em] text-white transition hover:bg-[#cf5a26]"
              >
                Join the Community
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
    </AppShell>
  );
}
