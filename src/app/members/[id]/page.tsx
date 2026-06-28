import Link from "next/link";
import { notFound } from "next/navigation";
import { Bike, CalendarDays, ChevronRight, Gauge, Heart, MapPin, MessageCircle, Route } from "lucide-react";
import { members } from "@/data/community";
import { siteImages } from "@/data/images";

export function generateStaticParams() {
  return members.map((member) => ({ id: member.id }));
}

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = members.find((m) => m.id === id);

  if (!member) {
    notFound();
  }

  const firstName = member.name.split(" ")[0];
  const memberIndex = members.findIndex((m) => m.id === member.id);

  const photoGrid = Array.from({ length: 9 }, (_, i) =>
    siteImages.galleryPage[(memberIndex + i) % siteImages.galleryPage.length],
  );

  const stats = [
    { label: "Rides", value: String(member.ridesCompleted ?? 0) },
    { label: "Years", value: String(member.yearsRiding) },
    { label: "Since", value: (member.joined ?? "").split(" ")[1] ?? "—" },
  ];

  const details = [
    { label: "Motorcycle", value: member.motorcycle, icon: Bike },
    { label: "Member Since", value: member.joined ?? "Unknown", icon: CalendarDays },
    { label: "Favorite Road", value: member.favoriteRoad ?? "Still exploring", icon: Route },
    { label: "Home Base", value: member.location, icon: MapPin },
  ];

  const journal = [
    {
      date: `${member.joined ?? "Recently"}`,
      photo: siteImages.roads[memberIndex % siteImages.roads.length],
      text: `Spent the morning out on the ${member.favoriteRoad ?? "back roads"} with the ${member.motorcycle}. Cool air, empty lanes, and that easy rhythm you only find when the road opens up. Days like this are exactly why I started riding around ${member.location}.`,
      likes: 24 + memberIndex * 3,
      comments: [
        {
          author: members[(memberIndex + 1) % members.length],
          text: "That stretch is unbeatable early in the morning. Save me a spot next time.",
        },
        {
          author: members[(memberIndex + 2) % members.length],
          text: "Bike is looking clean. Those new lines suit it.",
        },
      ],
    },
    {
      date: "Earlier this season",
      photo: siteImages.galleryPage[(memberIndex + 3) % siteImages.galleryPage.length],
      text: `Rolled out with the District 76 crew for a long loop and a coffee stop halfway through. Good people, good pace, and a few new faces who picked their lines like naturals. Already looking forward to the next one.`,
      likes: 18 + memberIndex * 2,
      comments: [
        {
          author: members[(memberIndex + 3) % members.length],
          text: "Great day out. The coffee stop might be the real reason I show up.",
        },
      ],
    },
  ];

  return (
    <div>
      {/* PROFILE HEADER */}
      <section className="relative w-full overflow-hidden bg-asphalt">
        <div className="route-lines absolute inset-0 opacity-30" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
            <Link href="/" className="hover:text-white">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/members" className="hover:text-white">Members</Link>
            <ChevronRight className="h-3 w-3 text-sunset" />
            <span className="text-sunset">Profile</span>
          </nav>
          <h1 className="mt-3 font-display text-4xl font-bold uppercase tracking-tight text-white sm:text-5xl">
            {member.name}
          </h1>
        </div>
      </section>

      {/* PROFILE BODY */}
      <section className="w-full bg-canvas">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-[20rem_1fr] lg:px-8">
          {/* LEFT: PROFILE CARD + PHOTOS */}
          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-border bg-surface p-6 text-center shadow-soft">
              <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-sunset bg-asphalt text-2xl font-bold text-white">
                {member.avatar}
              </span>
              <h2 className="mt-4 font-display text-xl font-bold uppercase tracking-tight text-asphalt">{member.name}</h2>
              <p className="text-sm text-muted">{member.motorcycle}</p>

              <div className="mt-6 grid grid-cols-3 divide-x divide-border border-y border-border py-4">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="font-display text-lg font-bold text-asphalt">{stat.value}</p>
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted">{stat.label}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 text-left">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-asphalt">About Me</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {member.bio ?? "This rider has not added a bio yet."}
                </p>
              </div>

              <dl className="mt-6 space-y-4 border-t border-border pt-6 text-left">
                {details.map((detail) => {
                  const Icon = detail.icon;
                  return (
                    <div key={detail.label} className="flex items-start gap-3">
                      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-sunset" />
                      <div>
                        <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted">{detail.label}</dt>
                        <dd className="text-sm font-medium text-asphalt">{detail.value}</dd>
                      </div>
                    </div>
                  );
                })}
              </dl>
            </div>

            <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
              <h3 className="text-center text-xs font-semibold uppercase tracking-widest text-asphalt">Photos</h3>
              <div className="mt-4 grid grid-cols-3 gap-2">
                {photoGrid.map((src, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-md bg-cover bg-center"
                    style={{ backgroundImage: `url(${src})` }}
                  />
                ))}
              </div>
            </div>
          </aside>

          {/* RIGHT: RIDE JOURNAL FEED */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Gauge className="h-5 w-5 text-sunset" />
              <h2 className="font-display text-xl font-bold uppercase tracking-tight text-asphalt">Ride Journal</h2>
            </div>

            {journal.map((entry, i) => (
              <article key={i} className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
                <div className="flex items-center gap-3 p-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-sunset bg-asphalt text-sm font-bold text-white">
                    {member.avatar}
                  </span>
                  <div>
                    <p className="font-semibold text-asphalt">{member.name}</p>
                    <p className="text-xs text-muted">{entry.date}</p>
                  </div>
                </div>
                <p className="px-5 pb-5 leading-relaxed text-muted">{entry.text}</p>
                <div
                  className="aspect-16/10 w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${entry.photo})` }}
                />

                {/* ENGAGEMENT BAR */}
                <div className="flex items-center gap-6 border-b border-border px-5 py-4 text-sm text-muted">
                  <span className="inline-flex items-center gap-2">
                    <Heart className="h-4 w-4 fill-sunset text-sunset" />
                    <span className="font-medium text-asphalt">{entry.likes}</span> likes
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-sunset" />
                    <span className="font-medium text-asphalt">{entry.comments.length}</span> comments
                  </span>
                </div>

                {/* COMMENTS */}
                <div className="space-y-4 px-5 py-5">
                  {entry.comments.map((comment, c) => (
                    <div key={c} className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sunset/15 text-xs font-bold text-sunset">
                        {comment.author.avatar}
                      </span>
                      <div className="rounded-lg bg-canvas px-3 py-2">
                        <p className="text-xs font-semibold text-asphalt">{comment.author.name}</p>
                        <p className="mt-0.5 text-sm text-muted">{comment.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}

            <div className="overflow-hidden rounded-xl border border-border shadow-soft">
              <div className="asphalt-panel flex flex-col items-center gap-4 p-8 text-center sm:flex-row sm:justify-between sm:text-left">
                <p className="text-sm text-slate-300">Want to ride with {firstName}? Find the next group ride.</p>
                <Link
                  href="/events"
                  className="inline-flex shrink-0 justify-center rounded-md bg-sunset px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#cf5a26]"
                >
                  Browse Upcoming Rides
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
