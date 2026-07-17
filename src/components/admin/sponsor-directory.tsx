"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Pencil, Plus, Store } from "lucide-react";
import type { ShopCategory, SponsorTier } from "@prisma/client";

import { createSponsorAction, updateSponsorAction } from "@/app/admin/community/actions";
import {
  AdminBadge,
  AdminRowActions,
  AdminTable,
  AdminTableBody,
  AdminTableEmpty,
  AdminTableHead,
  AdminTd,
  AdminTh,
  AdminTr,
} from "@/components/admin/admin-table";
import { CommunityDeleteButton } from "@/components/admin/community-delete-button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SHOP_CATEGORIES, SHOP_CATEGORY_LABEL, TIER_LABEL } from "@/lib/shops";

export type AdminSponsor = {
  id: string;
  name: string;
  description: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  category: ShopCategory | null;
  address: string | null;
  phone: string | null;
  lat: number | null;
  lng: number | null;
  tier: SponsorTier | null;
  status: string;
  active: boolean;
  rejectionReason: string | null;
  eventCount: number;
  submittedByHandle: string | null;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sunset/50 focus:outline-none";
const labelClass = "text-xs font-semibold uppercase tracking-[0.12em] text-slate-400";

/**
 * The shops directory, as one table and one dialog.
 *
 * Add and edit are the same form: the only difference is whether it opens with a
 * business in it. That's how the rest of the site already works (the public
 * submit is a dialog) and it means a moderator fixing a typo never leaves the
 * list they're working through.
 */
export function SponsorDirectory({ sponsors }: { sponsors: AdminSponsor[] }) {
  const [open, setOpen] = useState(false);
  // null while adding, a business while editing. One piece of state decides the
  // title, the defaults, and which action the form posts to.
  const [editing, setEditing] = useState<AdminSponsor | null>(null);

  function openCreate() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(sponsor: AdminSponsor) {
    setEditing(sponsor);
    setOpen(true);
  }

  return (
    <section className="rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Listings</h2>
          <p className="mt-1 text-xs text-slate-400">
            Sponsors and plain listings alike. A tier is what makes a business a sponsor; blank means it is
            in the directory only.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-sunset px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#cf5a26]"
        >
          <Plus className="h-4 w-4" />
          Add Business
        </button>
      </div>

      <div className="mt-4">
        <AdminTable>
          <AdminTableHead>
            <AdminTh>Business</AdminTh>
            <AdminTh>Category</AdminTh>
            <AdminTh>Tier</AdminTh>
            <AdminTh>Status</AdminTh>
            <AdminTh className="text-right">Rides</AdminTh>
            <AdminTh className="text-right">Actions</AdminTh>
          </AdminTableHead>
          <AdminTableBody>
            {sponsors.length === 0 ? (
              <AdminTableEmpty colSpan={6}>
                Nothing listed yet. Add the shops riders already use.
              </AdminTableEmpty>
            ) : (
              sponsors.map((sponsor) => (
                <AdminTr key={sponsor.id}>
                  <AdminTd>
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5">
                        {sponsor.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={sponsor.logoUrl} alt="" className="max-h-full max-w-full object-contain" />
                        ) : (
                          <Store className="h-3.5 w-3.5 text-slate-500" />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium text-white">{sponsor.name}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {sponsor.address ?? "No address"}
                          {sponsor.submittedByHandle ? ` · @${sponsor.submittedByHandle}` : ""}
                        </span>
                      </span>
                    </div>
                  </AdminTd>
                  <AdminTd>
                    {sponsor.category ? (
                      SHOP_CATEGORY_LABEL[sponsor.category]
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </AdminTd>
                  <AdminTd>
                    {sponsor.tier ? (
                      <AdminBadge tone="warn">{TIER_LABEL[sponsor.tier]}</AdminBadge>
                    ) : (
                      <span className="text-slate-600">Listing</span>
                    )}
                  </AdminTd>
                  <AdminTd>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {sponsor.status === "APPROVED" ? (
                        <AdminBadge tone="good">Approved</AdminBadge>
                      ) : (
                        <AdminBadge tone="bad">Rejected</AdminBadge>
                      )}
                      {!sponsor.active ? <AdminBadge>Hidden</AdminBadge> : null}
                    </div>
                  </AdminTd>
                  <AdminTd className="text-right tabular-nums">{sponsor.eventCount}</AdminTd>
                  <AdminTd>
                    <AdminRowActions>
                      <Link
                        href="/shops"
                        target="_blank"
                        title="View the public directory"
                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                      <button
                        type="button"
                        onClick={() => openEdit(sponsor)}
                        title={`Edit ${sponsor.name}`}
                        className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <CommunityDeleteButton kind="sponsor" id={sponsor.id} name={sponsor.name} compact />
                    </AdminRowActions>
                  </AdminTd>
                </AdminTr>
              ))
            )}
          </AdminTableBody>
        </AdminTable>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.name}` : "Add a business"}</DialogTitle>
          </DialogHeader>

          <p className="mt-1 text-sm text-slate-400">
            {editing
              ? "Changes go live on the directory as soon as you save."
              : "Added from here it is approved on the spot, no queue."}
          </p>

          {/* Same form either way. The action differs, and edit carries the id. */}
          <form
            key={editing?.id ?? "new"}
            action={editing ? updateSponsorAction : createSponsorAction}
            onSubmit={() => setOpen(false)}
            className="mt-4 space-y-4"
          >
            {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

            <div>
              <label htmlFor="sd-name" className={labelClass}>
                Business name
              </label>
              <input
                id="sd-name"
                name="name"
                required
                defaultValue={editing?.name ?? ""}
                placeholder="MotoAlliance"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="sd-desc" className={labelClass}>
                What they do
              </label>
              <textarea
                id="sd-desc"
                name="description"
                rows={2}
                defaultValue={editing?.description ?? ""}
                placeholder="Tires, service, and a decent coffee while you wait."
                className={inputClass}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sd-cat" className={labelClass}>
                  Category
                </label>
                <select id="sd-cat" name="category" defaultValue={editing?.category ?? ""} className={inputClass}>
                  <option value="">None</option>
                  {SHOP_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {SHOP_CATEGORY_LABEL[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                {/* Blank is the normal state and has to stay reachable: a tier is
                    a relationship, and relationships end. */}
                <label htmlFor="sd-tier" className={labelClass}>
                  Sponsor tier
                </label>
                <select id="sd-tier" name="tier" defaultValue={editing?.tier ?? ""} className={inputClass}>
                  <option value="">Not a sponsor (listed only)</option>
                  <option value="PARTNER">Partner</option>
                  <option value="SUPPORTER">Supporter</option>
                  <option value="FRIEND">Friend of the Community</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="sd-addr" className={labelClass}>
                Address
              </label>
              <input
                id="sd-addr"
                name="address"
                defaultValue={editing?.address ?? ""}
                placeholder="522 Dover Rd Ste A, Clarksville, TN 37042"
                className={inputClass}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sd-lat" className={labelClass}>
                  Latitude
                </label>
                <input
                  id="sd-lat"
                  name="lat"
                  defaultValue={editing?.lat ?? ""}
                  placeholder="36.55117"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="sd-lng" className={labelClass}>
                  Longitude
                </label>
                <input
                  id="sd-lng"
                  name="lng"
                  defaultValue={editing?.lng ?? ""}
                  placeholder="-87.41525"
                  className={inputClass}
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Coordinates drive the Directions link. Riders submitting a shop get these from place search.
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="sd-phone" className={labelClass}>
                  Phone
                </label>
                <input
                  id="sd-phone"
                  name="phone"
                  defaultValue={editing?.phone ?? ""}
                  placeholder="(931) 555-0100"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="sd-web" className={labelClass}>
                  Website
                </label>
                <input
                  id="sd-web"
                  name="websiteUrl"
                  type="url"
                  defaultValue={editing?.websiteUrl ?? ""}
                  placeholder="https://…"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="sd-logo" className={labelClass}>
                Logo URL
              </label>
              <input
                id="sd-logo"
                name="logoUrl"
                type="url"
                defaultValue={editing?.logoUrl ?? ""}
                placeholder="https://…"
                className={inputClass}
              />
            </div>

            {editing ? (
              <label className="flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={editing.active}
                  className="h-4 w-4 rounded border-white/20 bg-white/5"
                />
                Visible on the public directory
              </label>
            ) : null}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-sunset px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#cf5a26]"
              >
                {editing ? "Save changes" : "Add business"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
