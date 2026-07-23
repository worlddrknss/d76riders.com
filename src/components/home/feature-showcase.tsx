import type { ReactNode } from "react";
import { Bell, Bookmark, MessageCircle, Star } from "lucide-react";

import { FadeUp } from "@/components/ui/motion";
import { TwoWheelsDownIcon } from "@/components/ui/two-wheels-down-icon";
import { KIND_META } from "@/lib/map";
import type { WaypointKind } from "@/lib/routing";

/** Real top-rated road for the "Know before you go" vignette (null → mock). */
export type ShowcaseRoad = {
  name: string;
  quality: number;
  scenery: number | null;
  pavement: number | null;
  twistiness: number | null;
  stops: { kind: WaypointKind; label: string | null }[];
};

/**
 * The logged-out feature showcase — the marketing heart of the landing page.
 * Static, benefit-driven sections that *show* the product through small UI
 * vignettes rendered in markup (a feed post with the Two Wheels Down salute, a
 * live-ride map, a garage service list, a route-quality card). Each pillar gets
 * its own layout rhythm so the page never reads as four identical splits. Live
 * proof (real events, roads, stats, spotlight) lives back in page.tsx below this.
 */

// A feature bullet: diamond marker + text. `dark` flips the copy for dark bands.
function Feat({ children, dark }: { children: ReactNode; dark?: boolean }) {
  return (
    <li
      className={`relative pl-5 text-[0.95rem] leading-relaxed ${
        dark ? "text-slate-300" : "text-ink"
      } before:absolute before:left-0 before:top-2 before:h-[7px] before:w-[7px] before:rotate-45 before:rounded-[2px] before:bg-sunset before:content-['']`}
    >
      {children}
    </li>
  );
}

const eyebrow = "text-xs font-semibold uppercase tracking-[0.18em] text-sunset";

// A pulsing rider on the live map. Positioned by inline left/top percentages so
// it tracks the route as the map scales.
function MapDot({ left, top }: { left: string; top: string }) {
  return (
    <span
      className="absolute h-[26px] w-[26px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
      style={{
        left,
        top,
        background: "linear-gradient(135deg,#4a4238,#22201a)",
        boxShadow: "0 0 0 4px rgba(226,102,47,.28)",
      }}
    >
      <span className="absolute -inset-1 rounded-full border-2 border-sunset motion-safe:animate-ping" />
    </span>
  );
}

function Meter({ label, pct, value }: { label: string; pct: number; value: string }) {
  return (
    <div className="grid grid-cols-[88px_1fr_auto] items-center gap-2.5 text-sm">
      <span className="text-[#a89f92]">{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-white/10">
        <span
          className="block h-full rounded-full"
          style={{ width: `${pct}%`, background: "linear-gradient(90deg,#e2662f,#f3a06a)" }}
        />
      </span>
      <b className="tabular-nums">{value}</b>
    </div>
  );
}

function Stop({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-white">
      <i className="h-2 w-2 rounded-full" style={{ background: color }} />
      {children}
    </span>
  );
}

export function FeatureShowcase({ topRoad }: { topRoad?: ShowcaseRoad | null }) {
  return (
    <>
      {/* INTRO + THE FEED */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <FadeUp className="mx-auto max-w-2xl text-center">
            <p className={eyebrow}>Everything a rider needs, in one place</p>
            <h2 className="mt-2 font-display text-3xl uppercase tracking-tight text-asphalt sm:text-4xl">
              More than a Facebook group
            </h2>
            <p className="mt-4 text-muted">
              District 76 is where the ride lives on after the kickstand goes up. Share it, plan the next
              one, log your build, and always know who is out there with you.
            </p>
          </FadeUp>

          <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:items-center">
            <FadeUp>
              <p className={eyebrow}>The Feed</p>
              <h3 className="mt-2 font-display text-2xl uppercase tracking-tight text-asphalt">
                Your ride, shared
              </h3>
              <p className="mt-3 text-muted">
                A home feed built for riders, not an algorithm. Post the run, drop a Story from the road,
                and get some love back.
              </p>
              <ul className="mt-4 space-y-2.5">
                <Feat><strong className="font-semibold">Two Wheels Down</strong> — the biker salute replaces the like. Give one, the rider knows.</Feat>
                <Feat><strong className="font-semibold">Stories</strong> that vanish in 24 hours, and posts you can Save for later.</Feat>
                <Feat><strong className="font-semibold">Direct messages</strong> with riders you both follow, photos included.</Feat>
                <Feat><strong className="font-semibold">A feed in real order</strong> — newest first, always. No algorithm deciding what you see.</Feat>
              </ul>
            </FadeUp>

            {/* Vignette: a feed post */}
            <FadeUp delay={0.15}>
              <div className="rounded-2xl border border-border bg-surface p-4 shadow-lift" aria-hidden="true">
                <div className="mb-3 flex gap-2.5">
                  <div className="relative h-[74px] w-[52px] flex-none rounded-[10px] border-2 border-dashed border-border">
                    <span className="absolute bottom-2 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border-2 border-surface bg-sunset text-xs font-bold text-white">+</span>
                  </div>
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-[74px] w-[52px] flex-none rounded-[10px] border-2 border-sunset"
                      style={{ background: "linear-gradient(160deg,#3a352d,#1c1a15)" }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2.5">
                  <span
                    className="flex h-9 w-9 flex-none items-center justify-center rounded-full font-display text-xs text-white"
                    style={{ background: "linear-gradient(135deg,#3a352d,#22201a)" }}
                  >
                    JR
                  </span>
                  <div>
                    <div className="text-sm font-bold text-ink">Jake R.</div>
                    <div className="text-xs text-muted">Cumberland Loop · 2h</div>
                  </div>
                </div>
                <div
                  className="my-3 h-[150px] rounded-xl"
                  style={{
                    backgroundImage:
                      "radial-gradient(140px 90px at 70% 20%,rgba(226,102,47,.5),transparent),linear-gradient(150deg,#2b2822,#15130f)",
                  }}
                />
                <div className="flex items-center gap-4 text-sm font-bold">
                  <span className="inline-flex items-center gap-1.5 text-forest">
                    <TwoWheelsDownIcon className="h-4 w-4" filled /> 24
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-muted">
                    <MessageCircle className="h-4 w-4" /> 4
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-muted">
                    <Bookmark className="h-4 w-4" /> Save
                  </span>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* EVENTS & GROUP RIDES — wide, map-dominant, dark */}
      <section className="w-full bg-asphalt text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[0.9fr_1.3fr]">
            <FadeUp>
              <p className={eyebrow}>Events &amp; Group Rides</p>
              <h3 className="mt-2 font-display text-2xl uppercase tracking-tight">
                Show up, ride, regroup
              </h3>
              <p className="mt-3 text-slate-300">
                Every ride runs on rails: RSVP, check in at the meetup, then watch the group move in real
                time on ride day.
              </p>
              <ul className="mt-4 space-y-2.5">
                <Feat dark><strong className="font-semibold text-white">Live ride map</strong> — see who is on the road now, updating as they roll.</Feat>
                <Feat dark><strong className="font-semibold text-white">Check-in &amp; check-out</strong> so no one gets left behind.</Feat>
                <Feat dark><strong className="font-semibold text-white">Recaps &amp; Ride of the Month</strong> voting after the dust settles.</Feat>
                <Feat dark><strong className="font-semibold text-white">Calendar sync</strong> — add any ride to your phone in a tap.</Feat>
              </ul>
            </FadeUp>

            {/* Vignette: live ride map */}
            <FadeUp delay={0.15}>
              <div className="rounded-2xl border border-[#34302a] bg-[#211e19] p-4 shadow-lift" aria-hidden="true">
                <div
                  className="relative h-[320px] overflow-hidden rounded-xl border border-white/10"
                  style={{ background: "linear-gradient(160deg,#20242b,#12151b)" }}
                >
                  <div className="absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-white">
                    <span className="h-2 w-2 rounded-full bg-[#41c07a] shadow-[0_0_8px_#41c07a]" /> 3 riders on the road now
                  </div>
                  <svg viewBox="0 0 400 210" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
                    <path
                      d="M20 170 C 120 170 130 60 220 70 S 330 40 390 30"
                      fill="none"
                      stroke="#e2662f"
                      strokeWidth="2.4"
                      strokeDasharray="1 10"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <MapDot left="15%" top="80%" />
                  <MapDot left="55%" top="33%" />
                  <MapDot left="82%" top="19%" />
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#a89f92]">
                    Bell Witch Ride · Sat 9:00 AM
                  </div>
                  <span className="rounded-full bg-[#41c07a]/15 px-2 py-0.5 text-xs font-bold text-[#41c07a]">
                    12 going
                  </span>
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* YOUR GARAGE — flipped, light */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Vignette: garage service list (left) */}
            <FadeUp className="lg:order-1 order-2">
              <div className="rounded-2xl border border-border bg-surface p-4 shadow-lift" aria-hidden="true">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-display text-lg text-ink">Kawasaki Z650</div>
                    <div className="text-xs text-muted">Naked · 649cc</div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-ink">
                    <span className="tabular-nums">18,140 mi</span>
                  </span>
                </div>
                <div className="flex items-center justify-between border-t border-border py-3">
                  <div>
                    <div className="text-sm font-bold text-ink">Oil &amp; filter</div>
                    <div className="text-xs text-muted">Last: 15,900 mi</div>
                  </div>
                  <span className="rounded-full bg-[#c93a26]/12 px-2.5 py-1 text-xs font-extrabold text-[#c93a26]">Due now</span>
                </div>
                <div className="flex items-center justify-between border-t border-border py-3">
                  <div>
                    <div className="text-sm font-bold text-ink">Chain clean &amp; lube</div>
                    <div className="text-xs text-muted">Every 500 mi</div>
                  </div>
                  <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-bold text-muted">Due at 18,400</span>
                </div>
                <div className="flex items-center justify-between border-t border-border py-3">
                  <div>
                    <div className="text-sm font-bold text-ink">Front tire</div>
                    <div className="text-xs text-muted">Installed 2,400 mi ago</div>
                  </div>
                  <span className="rounded-full bg-forest/15 px-2.5 py-1 text-xs font-bold text-forest">Good</span>
                </div>
              </div>
            </FadeUp>

            <FadeUp delay={0.15} className="lg:order-2 order-1">
              <p className={eyebrow}>Your Garage</p>
              <h3 className="mt-2 font-display text-2xl uppercase tracking-tight text-asphalt">
                Every bolt, tracked
              </h3>
              <p className="mt-3 text-muted">
                Log the build and the wrenching. D76 remembers your mileage so the next service never
                sneaks up on you.
              </p>
              <ul className="mt-4 space-y-2.5">
                <Feat><strong className="font-semibold">Build timeline</strong> and <strong className="font-semibold">service records</strong> per bike.</Feat>
                <Feat><strong className="font-semibold">Maintenance reminders</strong> by date or mileage, whichever hits first.</Feat>
                <Feat><strong className="font-semibold">Gear locker</strong> for helmets, jackets, and the rest of the kit.</Feat>
              </ul>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* ROADS & ROUTES — centered showcase, dark */}
      <section className="w-full bg-[#232019] text-white">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <FadeUp className="mx-auto max-w-2xl text-center">
            <p className={eyebrow}>Roads &amp; Routes</p>
            <h2 className="mt-2 font-display text-3xl uppercase tracking-tight sm:text-4xl">
              Know before you go
            </h2>
            <p className="mt-4 text-slate-300">
              Featured roads scored by the riders who have run them, with the stops, the climb, and the
              hazards laid out.
            </p>
          </FadeUp>

          {/* Vignette: route quality card */}
          <FadeUp delay={0.1}>
            <div
              className="mx-auto mt-10 max-w-lg rounded-2xl border border-[#34302a] bg-[#211e19] p-4 shadow-lift"
              aria-hidden="true"
            >
              <div className="flex items-center justify-between">
                <div className="font-display text-lg">{topRoad ? topRoad.name : "Cumberland Loop"}</div>
                <div className="text-right">
                  <div className="font-display text-2xl">
                    {topRoad ? topRoad.quality.toFixed(1) : "4.6"}
                    <span className="text-sm font-normal text-[#a89f92]">/5</span>
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#a89f92]">Route quality</div>
                </div>
              </div>
              <div className="mt-3 space-y-3">
                {topRoad ? (
                  [
                    { label: "Scenery", v: topRoad.scenery },
                    { label: "Pavement", v: topRoad.pavement },
                    { label: "Twistiness", v: topRoad.twistiness },
                  ]
                    .filter((m) => m.v != null)
                    .map((m) => <Meter key={m.label} label={m.label} pct={(m.v as number) * 20} value={(m.v as number).toFixed(1)} />)
                ) : (
                  <>
                    <Meter label="Scenery" pct={94} value="4.7" />
                    <Meter label="Pavement" pct={84} value="4.2" />
                    <Meter label="Twistiness" pct={96} value="4.8" />
                  </>
                )}
              </div>
              {topRoad ? (
                topRoad.stops.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {topRoad.stops.map((s, i) => (
                      <Stop key={i} color={KIND_META[s.kind].color}>
                        {s.label || KIND_META[s.kind].label}
                      </Stop>
                    ))}
                  </div>
                )
              ) : (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Stop color="#3f8a4f">Start</Stop>
                  <Stop color="#e8703a">KSU</Stop>
                  <Stop color="#2563eb">Fuel · 42mi</Stop>
                  <Stop color="#0891b2">Rest</Stop>
                  <Stop color="#b91c1c">End</Stop>
                </div>
              )}
            </div>
          </FadeUp>

          <div className="mx-auto mt-11 grid max-w-4xl gap-8 sm:grid-cols-3">
            {[
              { t: "Route Quality", d: "Real rider feedback rolls up into scenery, pavement, and twistiness scores." },
              { t: "Turn-by-turn stops", d: "KSU, fuel, food, regroup, and done — every waypoint mapped in order." },
              { t: "Difficulty & hazards", d: "Difficulty read from elevation, with rider-flagged hazards pinned on the map." },
            ].map((sf) => (
              <FadeUp key={sf.t}>
                <h4 className="flex items-center gap-2 font-display text-base uppercase tracking-tight">
                  <i className="h-2 w-2 rotate-45 rounded-[2px] bg-sunset" />
                  {sf.t}
                </h4>
                <p className="mt-1.5 text-sm text-slate-300">{sf.d}</p>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* BENTO — safety / recognition / notifications, light */}
      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <FadeUp className="max-w-2xl">
            <p className={eyebrow}>And the stuff that matters when it counts</p>
            <h2 className="mt-2 font-display text-3xl uppercase tracking-tight text-asphalt sm:text-4xl">
              Built for the road, not just the feed
            </h2>
          </FadeUp>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <FadeUp>
              <div className="h-full rounded-2xl border border-border bg-surface p-6 shadow-soft">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#c93a26]/12 text-[#c93a26]">
                  <TwoWheelsDownIcon className="h-5 w-5" filled />
                </div>
                <h3 className="font-display text-lg uppercase tracking-tight text-asphalt">Emergency ready</h3>
                <p className="mt-1.5 text-sm text-muted">
                  An NFC helmet ID first responders can tap for your contacts, blood type, and allergies,
                  plus a one-tap Rider Down alert to the group.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {["NFC helmet tag", "Blood type", "Rider Down"].map((t) => (
                    <span key={t} className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-muted">{t}</span>
                  ))}
                </div>
              </div>
            </FadeUp>
            <FadeUp delay={0.1}>
              <div className="h-full rounded-2xl border border-border bg-surface p-6 shadow-soft">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-sunset/14 text-sunset">
                  <Star className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg uppercase tracking-tight text-asphalt">Get recognized</h3>
                <p className="mt-1.5 text-sm text-muted">
                  A weekly Rider Spotlight, an Ambassador program for community leaders, and badges that
                  mean you showed up.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {["Spotlight", "Ambassadors", "Trust score"].map((t) => (
                    <span key={t} className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-muted">{t}</span>
                  ))}
                </div>
              </div>
            </FadeUp>
            <FadeUp delay={0.2}>
              <div className="h-full rounded-2xl border border-border bg-surface p-6 shadow-soft">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-forest/14 text-forest">
                  <Bell className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg uppercase tracking-tight text-asphalt">Never miss a beat</h3>
                <p className="mt-1.5 text-sm text-muted">
                  Push notifications for waves, comments, and ride updates, with quiet hours so nothing
                  buzzes you overnight.
                </p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {["Web push", "Quiet hours", "Weekly recap"].map((t) => (
                    <span key={t} className="rounded-full border border-border px-2 py-0.5 text-xs font-semibold text-muted">{t}</span>
                  ))}
                </div>
              </div>
            </FadeUp>
          </div>
        </div>
      </section>
    </>
  );
}
