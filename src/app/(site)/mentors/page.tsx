import type { Metadata } from "next";
import Link from "next/link";
import { GraduationCap, MapPin, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { OG_IMAGE } from "@/lib/og";
import { haversineMiles } from "@/lib/routing";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Mentors",
  description: "Find an experienced rider to learn from — formation riding, cornering, group braking, and more.",
  alternates: { canonical: "/mentors" },
  openGraph: { images: OG_IMAGE, title: "Mentors — District 76 Riders", description: "Learn from riders who've earned mentor level." },
};

export default async function MentorsPage() {
  const currentUser = await getCurrentUser();
  const viewer = currentUser
    ? await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true, latitude: true, longitude: true } })
    : null;
  const viewerPoint: [number, number] | null =
    viewer?.latitude != null && viewer?.longitude != null ? [viewer.longitude, viewer.latitude] : null;

  // Every mentor-level skill, grouped into one card per rider.
  const rows = await prisma.riderSkill.findMany({
    where: { level: "MENTOR" },
    orderBy: { skill: { sortOrder: "asc" } },
    select: {
      verifiedAt: true,
      skill: { select: { name: true } },
      rider: {
        select: { id: true, name: true, handle: true, avatarUrl: true, location: true, latitude: true, longitude: true, bio: true },
      },
    },
  });

  type MentorRider = (typeof rows)[number]["rider"];
  const byRider = new Map<string, { rider: MentorRider; skills: string[]; verified: boolean }>();
  for (const row of rows) {
    let group = byRider.get(row.rider.id);
    if (!group) {
      group = { rider: row.rider, skills: [], verified: false };
      byRider.set(row.rider.id, group);
    }
    group.skills.push(row.skill.name);
    if (row.verifiedAt) group.verified = true;
  }

  let mentors = [...byRider.values()]
    .filter((m) => m.rider.id !== viewer?.id) // don't suggest yourself
    .map((m) => ({
      ...m,
      distance:
        viewerPoint && m.rider.latitude != null && m.rider.longitude != null
          ? haversineMiles(viewerPoint, [m.rider.longitude, m.rider.latitude])
          : null,
    }));
  // Nearest-first when we know where the viewer is; otherwise leave by skill order.
  if (viewerPoint) mentors = mentors.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

  return (
    <AppShell>
      <PageHeader
        icon={GraduationCap}
        title="Mentors"
        subtitle={
          viewerPoint
            ? "Experienced riders who've earned mentor level — closest to you first. Follow one and reach out."
            : "Experienced riders who've earned mentor level. Set your location in your profile to find mentors near you."
        }
      />

      <div className="space-y-6">
        {mentors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface p-12 text-center text-sm text-muted shadow-soft">
            <GraduationCap className="mx-auto h-8 w-8 text-muted/50" />
            <p className="mt-3">No mentors yet. Mentor level is awarded by ride organizers as riders prove their skills.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {mentors.map(({ rider, skills, verified, distance }) => {
              const avatar = mediaUrl(rider.avatarUrl);
              return (
                <Link
                  key={rider.id}
                  href={`/r/${rider.handle}`}
                  className="group flex flex-col rounded-xl border border-border bg-surface p-5 shadow-soft transition hover:border-sunset/40 hover:shadow-lift"
                >
                  <div className="flex items-center gap-3">
                    {avatar ? (
                      <img src={avatar} alt={rider.name} className="h-12 w-12 rounded-full border border-border object-cover" />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sunset/10 text-lg font-bold text-sunset">
                        {rider.name.charAt(0)}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 truncate font-display text-lg text-ink group-hover:text-sunset">
                        {rider.name}
                        {verified ? <ShieldCheck className="h-4 w-4 shrink-0 text-forest" /> : null}
                      </p>
                      <p className="truncate text-xs text-muted">
                        {rider.location || `@${rider.handle}`}
                        {distance != null ? <span className="font-semibold text-sunset"> · {Math.round(distance)} mi</span> : null}
                      </p>
                    </div>
                  </div>

                  {rider.bio ? <p className="mt-3 line-clamp-2 text-sm text-muted">{rider.bio}</p> : null}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {skills.map((s) => (
                      <span key={s} className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-asphalt">
                        {s}
                      </span>
                    ))}
                  </div>

                  <p className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#cf5a26]">
                    <MapPin className="h-3.5 w-3.5" /> View profile →
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
