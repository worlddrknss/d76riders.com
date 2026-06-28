import Link from "next/link";
import { Bike, MapPin, UserRound } from "lucide-react";
import { members } from "@/data/community";
import { siteImages } from "@/data/images";
import { PageHero } from "@/components/layout/page-hero";

export default function MembersPage() {
  return (
    <div>
      <PageHero
        image={siteImages.pageHeroes.members}
        eyebrow="Members"
        title="Rider Directory"
        description="Meet riders across Clarksville and surrounding areas. Everyone here is part of the same local road community."
      />

      {/* MEMBER GRID */}
      <section className="w-full bg-canvas">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-3 lg:px-8">
          {members.map((member) => (
            <article key={member.id} className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
              <div className="relative h-28 bg-asphalt">
                <div
                  className="h-full w-full bg-cover bg-center opacity-60"
                  style={{ backgroundImage: `url(${siteImages.hero})` }}
                />
                <span className="absolute -bottom-6 left-5 flex h-14 w-14 items-center justify-center rounded-full border-4 border-surface bg-sunset text-base font-bold text-white">
                  {member.avatar}
                </span>
              </div>
              <div className="px-5 pb-5 pt-9">
                <h2 className="font-display text-lg font-bold tracking-tight text-asphalt">{member.name}</h2>
                <p className="text-sm text-muted">{member.motorcycle}</p>
                <div className="mt-4 space-y-2 text-sm text-muted">
                  <p className="flex items-center gap-2"><Bike className="h-4 w-4 text-sunset" />{member.yearsRiding} years riding</p>
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-sunset" />{member.location}</p>
                </div>
                <Link
                  href={`/members/${member.id}`}
                  className="mt-5 block w-full rounded-md border border-border px-4 py-2 text-center text-sm font-semibold text-asphalt hover:border-asphalt"
                >
                  View Profile
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid gap-4 rounded-2xl border border-border bg-surface p-6 text-sm text-muted shadow-soft sm:grid-cols-3 sm:p-8">
            <p className="flex items-center gap-2"><UserRound className="h-4 w-4 text-sunset" />Rider-first community structure</p>
            <p className="flex items-center gap-2"><Bike className="h-4 w-4 text-sunset" />Bike diversity, one shared culture</p>
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-sunset" />Clarksville-centered riding network</p>
          </div>
        </div>
      </section>
    </div>
  );
}
