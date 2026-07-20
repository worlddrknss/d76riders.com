import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/og";
import Link from "next/link";
import { CheckCircle2, Shield, Users } from "lucide-react";
import { RegisterForm } from "@/components/auth/register-form";
import { CardShell } from "@/components/ui/card-shell";
import { SectionHeader } from "@/components/ui/section-header";
import { guidelines, joinBenefits } from "@/data/community";
import { siteImages } from "@/data/images";
import { PageHero } from "@/components/layout/page-hero";

export const metadata: Metadata = {
  title: "Join District 76 Riders",
  description:
    "Create your free rider profile. Join group rides, connect with motorcycle riders across Tennessee, and be part of a community built by riders, for riders.",
  alternates: { canonical: "/join" },
  openGraph: {
    images: OG_IMAGE,
    title: "Join — District 76 Riders",
    description: "Create your rider profile and find your next ride.",
  },
};

export default async function JoinPage(props: {
  searchParams: Promise<{ ref?: string; from?: string }>;
}) {
  const searchParams = await props.searchParams;
  const referralCode = searchParams.ref?.trim().toUpperCase().slice(0, 16);
  const invitedBy = searchParams.from?.trim().slice(0, 40);

  return (
    <div>
      <PageHero
        image={siteImages.pageHeroes.join}
        eyebrow="Join District 76"
        title="Ride With a Local Crew That Actually Rides"
        description="Founded in Clarksville, TN and open to riders anywhere — for anyone who wants consistent routes, strong community standards, and people they can count on."
      />

      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <SectionHeader
            eyebrow="Membership"
            title="Join District 76"
            description="Create your account, choose your username, and plug into local rides, route planning, and a safety-first riding community."
          />

          <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
            <div className="space-y-6">
              <CardShell className="rounded-xl rounded-bl-xl p-6 sm:p-8">
                <h3 className="font-display text-2xl font-bold tracking-tight text-asphalt">Community Expectations</h3>
                <ul className="mt-4 space-y-3 text-muted">
                  {guidelines.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-sunset" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardShell>

              <CardShell className="rounded-xl rounded-bl-xl p-6 sm:p-8">
                <h3 className="font-display text-2xl font-bold tracking-tight text-asphalt">Benefits of Joining</h3>
                <div className="mt-4 space-y-3">
                  {joinBenefits.map((benefit) => (
                    <div key={benefit.title} className="rounded-xl border border-border bg-canvas p-4">
                      <h4 className="font-semibold text-asphalt">{benefit.title}</h4>
                      <p className="mt-1 text-sm text-muted">{benefit.description}</p>
                    </div>
                  ))}
                </div>
              </CardShell>
            </div>

            <aside>
              <div className="rounded-xl border border-border bg-surface p-6 shadow-lift sm:p-8">
                <h3 className="font-display text-3xl font-semibold tracking-tight text-ink">Create account</h3>
                <p className="mt-2 text-sm text-muted">Set your username and start your District 76 profile.</p>
                <div className="mt-4 flex flex-wrap gap-2.5 text-xs font-semibold uppercase tracking-[0.06em]">
                  <Link href="/login" className="rounded-md border border-border bg-canvas px-3 py-1.5 text-muted hover:bg-surface">
                    Already a member? Log in
                  </Link>
                  <Link href="/events" className="rounded-md border border-border bg-canvas px-3 py-1.5 text-muted hover:bg-surface">
                    Preview upcoming rides
                  </Link>
                </div>
                {invitedBy ? (
                  <p className="mt-4 rounded-lg border border-sunset/40 bg-sunset/10 px-3 py-2 text-sm text-sunset">
                    <span className="font-semibold">@{invitedBy}</span> invited you to ride with District 76.
                  </p>
                ) : null}

                <div className="mt-6">
                  <RegisterForm referralCode={referralCode} />
                </div>
              </div>
            </aside>
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
