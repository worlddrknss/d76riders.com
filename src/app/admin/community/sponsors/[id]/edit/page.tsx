import Link from "next/link";
import { notFound } from "next/navigation";

import { updateSponsorAction } from "@/app/admin/community/actions";
import { prisma } from "@/lib/prisma";
import { SHOP_CATEGORIES, SHOP_CATEGORY_LABEL, TIER_LABEL } from "@/lib/shops";

export const dynamic = "force-dynamic";

const inputClass =
  "mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500";
const labelClass = "text-xs font-semibold uppercase tracking-[0.14em] text-slate-400";

export default async function EditSponsorPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;

  const sponsor = await prisma.sponsor.findUnique({
    where: { id },
    include: { _count: { select: { events: true } } },
  });

  if (!sponsor) {
    notFound();
  }

  const update = updateSponsorAction.bind(null, sponsor.id);

  return (
    <div className="space-y-6">
      <section className="route-lines rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Community</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">Edit Listing</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          {sponsor.tier ? `${TIER_LABEL[sponsor.tier]} · ` : "Directory listing · "}
          {sponsor._count.events} ride{sponsor._count.events === 1 ? "" : "s"} sponsored
        </p>
      </section>

      <form action={update} className="space-y-6">
        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="font-display text-lg font-semibold text-white">The business</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className={labelClass}>
                Name
              </label>
              <input id="name" name="name" required defaultValue={sponsor.name} className={inputClass} />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="description" className={labelClass}>
                What they do
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={sponsor.description ?? ""}
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="category" className={labelClass}>
                Category
              </label>
              <select id="category" name="category" defaultValue={sponsor.category ?? ""} className={inputClass}>
                <option value="">None</option>
                {SHOP_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {SHOP_CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              {/* Blank is the normal state. A tier is a relationship the community
                  grants, so it has to be removable, not only settable. */}
              <label htmlFor="tier" className={labelClass}>
                Sponsor tier
              </label>
              <select id="tier" name="tier" defaultValue={sponsor.tier ?? ""} className={inputClass}>
                <option value="">Not a sponsor (listed only)</option>
                <option value="PARTNER">Partner</option>
                <option value="SUPPORTER">Supporter</option>
                <option value="FRIEND">Friend of the Community</option>
              </select>
            </div>

            <div>
              <label htmlFor="phone" className={labelClass}>
                Phone
              </label>
              <input id="phone" name="phone" defaultValue={sponsor.phone ?? ""} placeholder="(931) 555-0100" className={inputClass} />
            </div>

            <div>
              <label htmlFor="websiteUrl" className={labelClass}>
                Website
              </label>
              <input
                id="websiteUrl"
                name="websiteUrl"
                type="url"
                defaultValue={sponsor.websiteUrl ?? ""}
                placeholder="https://…"
                className={inputClass}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="logoUrl" className={labelClass}>
                Logo URL
              </label>
              <input
                id="logoUrl"
                name="logoUrl"
                type="url"
                defaultValue={sponsor.logoUrl ?? ""}
                placeholder="https://…"
                className={inputClass}
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="font-display text-lg font-semibold text-white">Where it is</h2>
          <p className="mt-1 text-xs text-slate-400">
            Coordinates drive the Directions link. Riders submit these via place search; edit them here only
            if you have a reason to.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="address" className={labelClass}>
                Address
              </label>
              <input
                id="address"
                name="address"
                defaultValue={sponsor.address ?? ""}
                placeholder="522 Dover Rd Ste A, Clarksville, TN 37042"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="lat" className={labelClass}>
                Latitude
              </label>
              <input id="lat" name="lat" defaultValue={sponsor.lat ?? ""} placeholder="36.55117" className={inputClass} />
            </div>
            <div>
              <label htmlFor="lng" className={labelClass}>
                Longitude
              </label>
              <input id="lng" name="lng" defaultValue={sponsor.lng ?? ""} placeholder="-87.41525" className={inputClass} />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <label className="flex items-center gap-3 text-sm text-slate-200">
            <input
              type="checkbox"
              name="active"
              defaultChecked={sponsor.active}
              className="h-4 w-4 rounded border-white/20 bg-white/5"
            />
            Visible on the public directory
          </label>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-sunset px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#cf5a26]"
          >
            Save changes
          </button>
          <Link
            href="/admin/community/sponsors"
            className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
