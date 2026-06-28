import { Bike, Gauge, Wrench } from "lucide-react";
import { garageBikes } from "@/data/community";
import { siteImages } from "@/data/images";
import { PageHero } from "@/components/layout/page-hero";

export default function GaragePage() {
  return (
    <div>
      <PageHero
        image={siteImages.pageHeroes.about}
        eyebrow="Garage"
        title="The District 76 Garage"
        description="A look at the machines our members ride. Every bike here has a story, an owner, and plenty of miles still to come."
      />

      {/* BIKE GRID */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Wrench className="h-5 w-5 text-sunset" />
            <h2 className="font-display text-xl font-bold uppercase tracking-tight text-asphalt">Member Machines</h2>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {garageBikes.map((bike, i) => (
              <article key={bike.id} className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
                {/* HEADER */}
                <div className="asphalt-panel px-5 py-4">
                  <h3 className="font-display text-lg font-bold uppercase tracking-tight text-white">{bike.name}</h3>
                  <p className="text-xs font-semibold uppercase tracking-wider text-sunset">Powered by {bike.make}</p>
                </div>

                {/* PHOTO */}
                <div
                  className="h-48 w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${siteImages.roads[i % siteImages.roads.length]})` }}
                />

                {/* QUICK SPECS */}
                <div className="grid grid-cols-3 divide-x divide-border border-y border-border text-center">
                  <div className="px-2 py-3">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted">Year</p>
                    <p className="font-display text-sm font-bold text-asphalt">{bike.year}</p>
                  </div>
                  <div className="px-2 py-3">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted">Type</p>
                    <p className="font-display text-sm font-bold text-asphalt">{bike.type}</p>
                  </div>
                  <div className="px-2 py-3">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted">Make</p>
                    <p className="font-display text-sm font-bold text-asphalt">{bike.make}</p>
                  </div>
                </div>

                {/* ENGINE SPECS */}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4 p-5">
                  <div>
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted">Engine Type</dt>
                    <dd className="mt-0.5 text-sm font-medium text-asphalt">{bike.engineType}</dd>
                  </div>
                  <div>
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted">Engine Power</dt>
                    <dd className="mt-0.5 text-sm font-medium text-asphalt">{bike.enginePower}</dd>
                  </div>
                  <div>
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted">Displacement</dt>
                    <dd className="mt-0.5 text-sm font-medium text-asphalt">{bike.displacement}</dd>
                  </div>
                  <div>
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted">Bore / Stroke</dt>
                    <dd className="mt-0.5 text-sm font-medium text-asphalt">{bike.boreStroke}</dd>
                  </div>
                </dl>

                {/* OWNER */}
                <div className="flex items-center gap-2 border-t border-border px-5 py-3 text-sm text-muted">
                  <Bike className="h-4 w-4 text-sunset" />
                  Ridden by <span className="font-semibold text-asphalt">{bike.owner}</span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* GARAGE NOTE */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="grid gap-4 rounded-2xl border border-border bg-surface p-6 text-sm text-muted shadow-soft sm:grid-cols-3 sm:p-8">
            <p className="flex items-center gap-2"><Gauge className="h-4 w-4 text-sunset" />Every style of bike is welcome here</p>
            <p className="flex items-center gap-2"><Wrench className="h-4 w-4 text-sunset" />Builds, mods, and honest mileage</p>
            <p className="flex items-center gap-2"><Bike className="h-4 w-4 text-sunset" />One community, many machines</p>
          </div>
        </div>
      </section>
    </div>
  );
}
