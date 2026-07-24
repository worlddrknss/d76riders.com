"use client";

import { useState } from "react";
import Link from "next/link";
import { ExternalLink, Globe, MapPin, Pencil, Phone, Plus, Store, Trash2 } from "lucide-react";
import type { ShopCategory, SponsorTier } from "@prisma/client";

import {
  createSponsorAction,
  deleteSponsorAction,
  updateSponsorAction,
} from "@/app/admin/community/actions";
import {
  AdminComposer,
  AdminComposerBody,
  AdminComposerFooter,
  adminField,
  adminLabel,
} from "@/components/admin/ui/admin-composer";
import { AdminConfirm } from "@/components/admin/ui/admin-confirm";
import { AdminDataTable, type AdminColumn } from "@/components/admin/ui/admin-data-table";
import { Button } from "@/components/ui/button";
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

const TIER_TONE: Record<string, string> = {
  PARTNER: "border-sunset/40 bg-sunset/15 text-orange-200",
  SUPPORTER: "border-blue-400/30 bg-blue-500/10 text-blue-200",
  FRIEND: "border-forest/40 bg-forest/15 text-emerald-200",
};

const iconButton = "rounded-md p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white";

function Logo({ url, name }: { url: string | null; name: string }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/10 bg-white/5">
      {url ? (
        <img src={url} alt="" className="max-h-full max-w-full object-contain" />
      ) : (
        <Store className="h-3.5 w-3.5 text-slate-500" aria-label={`${name} has no logo`} />
      )}
    </span>
  );
}

/**
 * The shops and sponsors directory.
 *
 * This was the last screen still editing through a light dialog dropped onto
 * the dark console — the old file said as much in a comment, styling the form
 * "for the dialog, not the shell". It also closed that dialog the instant you
 * hit save, before the server had answered, so a rejected slug or a bad URL
 * threw the edit away and left you looking at an unchanged row.
 *
 * Now it is the same full-screen composer the rest of the console uses, with
 * the public listing card previewed beside the fields — a tier and a logo are
 * things you judge by looking, not by reading a dropdown.
 */
export function SponsorDirectory({ sponsors }: { sponsors: AdminSponsor[] }) {
  const [open, setOpen] = useState(false);
  // null while adding, a business while editing. One piece of state decides the
  // title, the defaults, and which action the form posts to.
  const [editing, setEditing] = useState<AdminSponsor | null>(null);

  // Mirrored into state only for the fields the preview reads.
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [tier, setTier] = useState<string>("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  function seed(sponsor: AdminSponsor | null) {
    setEditing(sponsor);
    setName(sponsor?.name ?? "");
    setDescription(sponsor?.description ?? "");
    setCategory(sponsor?.category ?? "");
    setTier(sponsor?.tier ?? "");
    setAddress(sponsor?.address ?? "");
    setPhone(sponsor?.phone ?? "");
    setWebsiteUrl(sponsor?.websiteUrl ?? "");
    setLogoUrl(sponsor?.logoUrl ?? "");
    setOpen(true);
  }

  const columns: AdminColumn<AdminSponsor>[] = [
    {
      key: "name",
      header: "Business",
      sortValue: (s) => s.name.toLowerCase(),
      searchValue: (s) => `${s.name} ${s.address ?? ""} ${s.description ?? ""} ${s.submittedByHandle ?? ""}`,
      cell: (sponsor) => (
        <div className="flex items-center gap-2.5">
          <Logo url={sponsor.logoUrl} name={sponsor.name} />
          <span className="min-w-0">
            <span className="block font-semibold text-white">{sponsor.name}</span>
            <span className="block truncate text-xs text-slate-500">
              {sponsor.address ?? "No address"}
              {sponsor.submittedByHandle ? ` · @${sponsor.submittedByHandle}` : ""}
            </span>
          </span>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      sortValue: (s) => (s.category ? SHOP_CATEGORY_LABEL[s.category] : "zzz"),
      searchValue: (s) => (s.category ? SHOP_CATEGORY_LABEL[s.category] : ""),
      cell: (sponsor) =>
        sponsor.category ? SHOP_CATEGORY_LABEL[sponsor.category] : <span className="text-slate-600">—</span>,
    },
    {
      key: "tier",
      header: "Tier",
      // Sponsors first, plain listings after — the sponsor wall is what this
      // screen is usually being opened to check.
      sortValue: (s) => (s.tier ? `0${s.tier}` : "1"),
      cell: (sponsor) =>
        sponsor.tier ? (
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] ${TIER_TONE[sponsor.tier] ?? TIER_TONE.FRIEND}`}
          >
            {TIER_LABEL[sponsor.tier]}
          </span>
        ) : (
          <span className="text-xs text-slate-600">Listing</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (s) => `${s.status}${s.active ? "" : "-hidden"}`,
      cell: (sponsor) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={`inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] ${
              sponsor.status === "APPROVED"
                ? "border-forest/40 bg-forest/15 text-emerald-200"
                : "border-red-500/40 bg-red-500/10 text-red-300"
            }`}
          >
            {sponsor.status === "APPROVED" ? "Approved" : "Rejected"}
          </span>
          {!sponsor.active ? (
            <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-slate-400">
              Hidden
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "rides",
      header: "Rides",
      headerClassName: "text-right",
      className: "text-right tabular-nums",
      sortValue: (s) => s.eventCount,
      cell: (sponsor) =>
        sponsor.eventCount > 0 ? sponsor.eventCount : <span className="text-slate-600">0</span>,
    },
    {
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (sponsor) => (
        <div className="flex items-center justify-end gap-1">
          <Link href="/shops" target="_blank" title="View the public directory" className={iconButton}>
            <ExternalLink className="h-4 w-4" />
          </Link>
          <button type="button" onClick={() => seed(sponsor)} title={`Edit ${sponsor.name}`} className={iconButton}>
            <Pencil className="h-4 w-4" />
          </button>
          <AdminConfirm
            title="Remove this business?"
            confirmLabel="Remove business"
            body={
              <>
                <span className="font-semibold text-white">{sponsor.name}</span> comes off the public
                directory and any ride it sponsors loses the credit. To take it out of the directory without
                losing the record, untick &ldquo;Visible on the public directory&rdquo; instead.
              </>
            }
            onConfirm={() => deleteSponsorAction(sponsor.id)}
            trigger={(openConfirm, pending) => (
              <button
                type="button"
                onClick={openConfirm}
                disabled={pending}
                title={`Remove ${sponsor.name}`}
                className="rounded-md p-1.5 text-red-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          />
        </div>
      ),
    },
  ];

  return (
    <section className="rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
      <div className="mb-4">
        <h2 className="font-display text-lg text-white">Listings</h2>
        <p className="mt-1 text-xs text-slate-400">
          Sponsors and plain listings alike. A tier is what makes a business a sponsor; blank means it is in
          the directory only.
        </p>
      </div>

      <AdminDataTable
        rows={sponsors}
        columns={columns}
        rowKey={(sponsor) => sponsor.id}
        searchPlaceholder="Search by name, address, or who submitted it…"
        emptyMessage="Nothing listed yet. Add the shops riders already use."
        filters={[
          {
            key: "tier",
            label: "Tier",
            options: [
              { value: "PARTNER", label: "Partner" },
              { value: "SUPPORTER", label: "Supporter" },
              { value: "FRIEND", label: "Friend of the Community" },
              { value: "NONE", label: "Listing only" },
            ],
          },
          {
            key: "visibility",
            label: "Visibility",
            options: [
              { value: "LIVE", label: "On the directory" },
              { value: "HIDDEN", label: "Hidden" },
              { value: "REJECTED", label: "Rejected" },
            ],
          },
        ]}
        filterFn={(sponsor, key, value) => {
          if (key === "tier") return value === "NONE" ? !sponsor.tier : sponsor.tier === value;
          if (key === "visibility") {
            if (value === "LIVE") return sponsor.active && sponsor.status === "APPROVED";
            if (value === "HIDDEN") return !sponsor.active;
            if (value === "REJECTED") return sponsor.status !== "APPROVED";
          }
          return true;
        }}
        toolbar={
          <Button variant="accent" size="sm" onClick={() => seed(null)} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Business
          </Button>
        }
      />

      <AdminComposer
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Shops & Sponsors"
        title={editing ? editing.name : "Add a business"}
      >
        {/* Same form either way. The action differs, and edit carries the id.
            Note there is no optimistic close: the action redirects back here on
            a bad slug or URL, and closing early would discard the edit. */}
        <form
          key={editing?.id ?? "new"}
          action={editing ? updateSponsorAction : createSponsorAction}
          className="flex h-full min-h-0 flex-col"
        >
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}

          <AdminComposerBody
            previewNote="How it appears in the public directory."
            preview={
              <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
                <div className="flex items-start gap-3">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-canvas">
                    {logoUrl ? (
                      <img src={logoUrl} alt="" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <Store className="h-5 w-5 text-muted" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-lg leading-tight text-ink">
                      {name.trim() || "Business name"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {tier ? (
                        <span className="inline-flex rounded-full border border-sunset/40 bg-sunset/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-sunset">
                          {TIER_LABEL[tier as SponsorTier]}
                        </span>
                      ) : null}
                      {category ? (
                        <span className="text-xs text-muted">
                          {SHOP_CATEGORY_LABEL[category as ShopCategory]}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>

                {description.trim() ? (
                  <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
                ) : (
                  <p className="mt-3 text-sm italic text-muted/60">
                    A line about what they do appears here.
                  </p>
                )}

                <div className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm text-muted">
                  {address.trim() ? (
                    <p className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sunset" />
                      {address}
                    </p>
                  ) : null}
                  {phone.trim() ? (
                    <p className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 shrink-0 text-sunset" />
                      {phone}
                    </p>
                  ) : null}
                  {websiteUrl.trim() ? (
                    <p className="flex items-center gap-2 truncate">
                      <Globe className="h-3.5 w-3.5 shrink-0 text-sunset" />
                      <span className="truncate">{websiteUrl}</span>
                    </p>
                  ) : null}
                  {!address.trim() && !phone.trim() && !websiteUrl.trim() ? (
                    <p className="italic text-muted/60">No contact details yet.</p>
                  ) : null}
                </div>
              </div>
            }
          >
            <p className="text-sm text-slate-400">
              {editing
                ? "Changes go live on the directory as soon as you save."
                : "Added from here it is approved on the spot, no queue."}
            </p>

            <label className="grid gap-2">
              <span className={adminLabel}>Business name</span>
              <input
                name="name"
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={adminField}
                placeholder="Clarksville Cycle Works"
              />
            </label>

            <label className="grid gap-2">
              <span className={adminLabel}>What they do</span>
              <textarea
                name="description"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={adminField}
                placeholder="Tyres, servicing and diagnostics for anything on two wheels."
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className={adminLabel}>Category</span>
                <select
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={adminField}
                >
                  <option value="">None</option>
                  {SHOP_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{SHOP_CATEGORY_LABEL[c]}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                {/* Blank is the normal state and has to stay reachable: a tier is
                    a relationship, and relationships end. */}
                <span className={adminLabel}>Sponsor tier</span>
                <select
                  name="tier"
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  className={adminField}
                >
                  <option value="">Not a sponsor (listed only)</option>
                  <option value="PARTNER">Partner</option>
                  <option value="SUPPORTER">Supporter</option>
                  <option value="FRIEND">Friend of the Community</option>
                </select>
              </label>
            </div>

            <label className="grid gap-2">
              <span className={adminLabel}>Address</span>
              <input
                name="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={adminField}
                placeholder="522 Dover Rd Ste A, Clarksville, TN 37042"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2">
                <span className={adminLabel}>Phone</span>
                <input
                  name="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={adminField}
                />
              </label>
              <label className="grid gap-2">
                <span className={adminLabel}>Website</span>
                <input
                  name="websiteUrl"
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className={adminField}
                  placeholder="https://…"
                />
              </label>
            </div>

            <label className="grid gap-2">
              <span className={adminLabel}>Logo URL</span>
              <input
                name="logoUrl"
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className={adminField}
                placeholder="https://…"
              />
              <span className="text-xs text-slate-500">
                Shown at 56px square — a transparent PNG or SVG sits best on the card.
              </span>
            </label>

            {/* Folded away because they are almost always already correct: a
                rider submitting a shop gets them from place search. */}
            <details className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                Coordinates
              </summary>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <label className="grid gap-2">
                  <span className={adminLabel}>Latitude</span>
                  <input name="lat" inputMode="decimal" defaultValue={editing?.lat ?? ""} className={adminField} />
                </label>
                <label className="grid gap-2">
                  <span className={adminLabel}>Longitude</span>
                  <input name="lng" inputMode="decimal" defaultValue={editing?.lng ?? ""} className={adminField} />
                </label>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                These drive the Directions link on the shop&apos;s page.
              </p>
            </details>

            {editing ? (
              <label className="flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={editing.active}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 accent-sunset"
                />
                Visible on the public directory
              </label>
            ) : null}
          </AdminComposerBody>

          <AdminComposerFooter
            note={editing?.submittedByHandle ? `Submitted by @${editing.submittedByHandle}` : undefined}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-400 transition hover:text-white"
            >
              Cancel
            </button>
            <Button type="submit" variant="accent" size="sm">
              {editing ? "Save changes" : "Add business"}
            </Button>
          </AdminComposerFooter>
        </form>
      </AdminComposer>
    </section>
  );
}
