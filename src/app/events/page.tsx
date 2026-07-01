import { CalendarDays, Clock, MapPin, Route, Signal, Ticket, Users } from "lucide-react";
import { pastEvents, upcomingEvents } from "@/data/community";
import { siteImages } from "@/data/images";
import { PageHero } from "@/components/layout/page-hero";

function dateBadge(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return { day: "--", month: "" };
  }
  return {
    day: String(parsed.getDate()).padStart(2, "0"),
    month: parsed.toLocaleString("en-US", { month: "short" }).toUpperCase(),
  };
}

export default function EventsPage() {
  return (
    <div>
      <PageHero
        image={siteImages.pageHeroes.events}
        eyebrow="Events"
        title="Upcoming Events"
        description="Group rides with clear route expectations, meetup points, and pace guidance. Reserve your spot and roll out with the crew."
      />

      {/* UPCOMING RIDES LIST */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-5 w-5 text-sunset" />
            <h2 className="font-display text-xl font-bold uppercase tracking-tight text-asphalt">Upcoming Rides</h2>
          </div>

          <div className="mt-6 space-y-5">
            {upcomingEvents.map((event, i) => {
              const badge = dateBadge(event.date);
              const time = event.date;
              return (
                <article
                  key={event.id}
                  className="grid gap-0 overflow-hidden rounded-xl border border-border bg-surface shadow-soft lg:grid-cols-[18rem_1fr_16rem]"
                >
                  {/* PHOTO + DATE BADGE */}
                  <div
                    className="relative h-48 bg-cover bg-center lg:h-full"
                    style={{ backgroundImage: `url(${siteImages.rides[i % siteImages.rides.length]})` }}
                  >
                    <div className="absolute inset-0 bg-linear-to-t from-asphalt/50 to-transparent" />
                    <div className="absolute bottom-3 left-3 flex h-16 w-16 flex-col items-center justify-center rounded-lg bg-white text-asphalt shadow-soft">
                      <span className="font-display text-2xl font-bold leading-none">{badge.day}</span>
                      <span className="text-[0.6rem] font-bold uppercase tracking-wider text-sunset">{badge.month}</span>
                    </div>
                  </div>

                  {/* DETAILS */}
                  <div className="p-6">
                    <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-asphalt">{event.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted">{event.details}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1"><Route className="h-3.5 w-3.5 text-sunset" />{event.distance}</span>
                      <span className="inline-flex items-center gap-1"><Signal className="h-3.5 w-3.5 text-sunset" />{event.level}</span>
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5 text-sunset" />{event.ridersGoing} riders going</span>
                    </div>
                  </div>

                  {/* META + RSVP */}
                  <div className="flex flex-col justify-center gap-3 border-t border-border p-6 lg:border-l lg:border-t-0">
                    <p className="flex items-center gap-2 text-sm text-muted"><MapPin className="h-4 w-4 text-sunset" />{event.location}</p>
                    <p className="flex items-center gap-2 text-sm text-muted"><Clock className="h-4 w-4 text-sunset" />{time}</p>
                    <p className="flex items-center gap-2 text-sm text-muted"><Ticket className="h-4 w-4 text-sunset" />Free for members</p>
                    <button type="button" className="mt-1 rounded-md bg-sunset px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-white hover:bg-[#cf5a26]">
                      Register Now
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* PLANNING + MAP */}
      <section className="w-full bg-canvas">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <article className="rounded-xl border border-border bg-surface p-6 shadow-soft sm:p-8">
            <h2 className="font-display text-2xl font-bold tracking-tight text-asphalt">Route Planning Notes</h2>
            <ul className="mt-4 space-y-3 text-muted">
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-sunset" />Meetup location and kickstands-up time</li>
              <li className="flex items-center gap-2"><Route className="h-4 w-4 text-sunset" />Fuel stops and route pacing</li>
              <li className="flex items-center gap-2"><Users className="h-4 w-4 text-sunset" />Group size and rider experience mix</li>
              <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-sunset" />Weather and contingency updates</li>
            </ul>
          </article>

          <article
            className="relative overflow-hidden rounded-xl border border-border p-6 shadow-soft sm:p-8"
            style={{ backgroundImage: `url(${siteImages.ctaRoad})`, backgroundSize: "cover", backgroundPosition: "center" }}
          >
            <div className="absolute inset-0 bg-asphalt/80" aria-hidden="true" />
            <div className="relative text-white">
              <h2 className="font-display text-2xl font-bold tracking-tight">Map Coming Soon</h2>
              <p className="mt-3 text-slate-200">
                Interactive mapping will be added in a future phase. For now, event pages include detailed route and timing guidance.
              </p>
              <div className="mt-5 h-40 rounded-xl border border-dashed border-white/30 bg-white/5" />
            </div>
          </article>
        </div>
      </section>

      {/* PAST RIDES */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 className="font-display text-xl font-bold uppercase tracking-tight text-asphalt">Past Rides</h2>
            <p className="text-sm text-muted">Recent events completed by the District 76 community.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {pastEvents.map((event) => (
              <article key={event.id} className="rounded-xl border border-border bg-surface p-5 shadow-soft">
                <p className="text-xs font-semibold uppercase tracking-widest text-sunset">{event.date}</p>
                <h3 className="mt-1 font-display text-lg font-bold tracking-tight text-asphalt">{event.title}</h3>
                <p className="mt-2 text-sm text-muted">{event.location} • {event.distance} • {event.level}</p>
                <p className="mt-3 text-sm text-muted">{event.details}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
