import Link from "next/link";
import { ExternalLink, Pencil, Store } from "lucide-react";

import {
  createSponsorAction,
  linkSponsorToEventAction,
} from "@/app/admin/community/actions";
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
import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { CommunityDeleteButton } from "@/components/admin/community-delete-button";
import { SponsorReviewActions } from "@/components/admin/sponsor-review-actions";
import { prisma } from "@/lib/prisma";
import { SHOP_CATEGORIES, SHOP_CATEGORY_LABEL, TIER_LABEL } from "@/lib/shops";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  sponsor: "A sponsor name is required.",
  sponsorSlug: "A sponsor with that slug already exists.",
  sponsorUrl: "The website must be a valid http(s) URL.",
  link: "Couldn't find that sponsor or event.",
};

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500";
const submitClass =
  "w-full rounded-lg border border-sunset/40 bg-sunset/15 px-4 py-2 text-sm font-semibold text-orange-100 hover:bg-sunset/25";

export default async function AdminSponsorsPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  const searchParams = await props.searchParams;
  const error = searchParams.error ? ERRORS[searchParams.error] : null;

  const [pending, reviewed] = await Promise.all([
    prisma.sponsor.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      include: { submittedBy: { select: { handle: true, name: true } } },
    }),
    prisma.sponsor.findMany({
      where: { status: { not: "PENDING_REVIEW" } },
      orderBy: [{ status: "asc" }, { tier: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { events: true } },
        submittedBy: { select: { handle: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        eyebrow="Community"
        title="Shops & Sponsors"
        description="The local businesses riders use, and the ones that back us. Riders put them forward from /shops and they wait here; nothing appears publicly until it is approved. A tier is what makes a listing a sponsor."
        actions={
          pending.length > 0 ? (
            <span className="rounded-full border border-sunset/40 bg-sunset/15 px-3 py-1 text-sm font-semibold text-orange-200">
              {pending.length} awaiting review
            </span>
          ) : null
        }
      />

      {error ? (
        <p className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      ) : null}

      {/* ── Review queue ── */}
      <section className="rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
        <h2 className="font-display text-lg font-semibold text-white">Awaiting review</h2>
        <p className="mt-1 text-xs text-slate-400">
          Approving puts the business on the public page with the community&apos;s name next to it — the tier
          is yours to set, not the applicant&apos;s.
        </p>

        {pending.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-white/10 p-8 text-center">
            <Store className="mx-auto h-7 w-7 text-slate-600" />
            <p className="mt-2 text-sm text-slate-400">Nothing waiting. The queue is clear.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {pending.map((sponsor) => (
              <article key={sponsor.id} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-white">{sponsor.name}</p>
                    <p className="mt-1 text-sm text-slate-300">{sponsor.description}</p>

                    <dl className="mt-3 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                      {sponsor.websiteUrl ? (
                        <div className="flex gap-2">
                          <dt className="text-slate-500">Website</dt>
                          <dd className="min-w-0 truncate">
                            <a
                              href={sponsor.websiteUrl}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="text-sunset hover:underline"
                            >
                              {sponsor.websiteUrl}
                            </a>
                          </dd>
                        </div>
                      ) : null}
                      {sponsor.contactName || sponsor.contactEmail ? (
                        <div className="flex gap-2">
                          <dt className="text-slate-500">Contact</dt>
                          <dd className="min-w-0 truncate text-slate-300">
                            {[sponsor.contactName, sponsor.contactEmail].filter(Boolean).join(" · ")}
                          </dd>
                        </div>
                      ) : null}
                      <div className="flex gap-2">
                        <dt className="text-slate-500">Put forward by</dt>
                        <dd className="text-slate-300">
                          {sponsor.submittedBy ? (
                            <Link href={`/r/${sponsor.submittedBy.handle}`} className="hover:text-white">
                              @{sponsor.submittedBy.handle}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-slate-500">Submitted</dt>
                        <dd className="text-slate-300">
                          {sponsor.createdAt.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <SponsorReviewActions sponsorId={sponsor.id} name={sponsor.name} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ── Add directly ── */}
      <section className="grid gap-4 lg:grid-cols-2">
        <form
          action={createSponsorAction}
          className="space-y-3 rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg"
        >
          <h2 className="font-display text-lg font-semibold text-white">Add a business</h2>
          <p className="text-xs text-slate-400">Added from here, it&apos;s approved on the spot.</p>
          <input name="name" required placeholder="Business name" className={inputClass} />
          <input name="description" placeholder="What they do" className={inputClass} />
          <input name="websiteUrl" type="url" placeholder="https://example.com" className={inputClass} />
          <input name="logoUrl" type="url" placeholder="Logo URL (https://…)" className={inputClass} />
          <input name="address" placeholder="522 Dover Rd Ste A, Clarksville, TN 37042" className={inputClass} />
          <input name="phone" placeholder="(931) 555-0100" className={inputClass} />
          <select name="category" defaultValue="" className={inputClass}>
            <option value="">Category (none)</option>
            {SHOP_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {SHOP_CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
          {/* Blank is the normal case: a listed shop that doesn't sponsor. */}
          <select name="tier" defaultValue="" className={inputClass}>
            <option value="">Not a sponsor (directory listing)</option>
            <option value="PARTNER">Partner</option>
            <option value="SUPPORTER">Supporter</option>
            <option value="FRIEND">Friend of the Community</option>
          </select>
          <button type="submit" className={submitClass}>
            Add Business
          </button>
        </form>

        <form
          action={linkSponsorToEventAction}
          className="space-y-3 rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg"
        >
          <h2 className="font-display text-lg font-semibold text-white">Sponsor a ride</h2>
          <p className="text-xs text-slate-400">Attach a sponsor to a specific event.</p>
          <select name="sponsorId" required className={inputClass}>
            {reviewed
              .filter((sponsor) => sponsor.status === "APPROVED")
              .map((sponsor) => (
                <option key={sponsor.id} value={sponsor.id}>
                  {sponsor.name}
                </option>
              ))}
          </select>
          <input name="eventSlug" required placeholder="Event slug" className={inputClass} />
          <button type="submit" className={submitClass}>
            Link Sponsor
          </button>
        </form>
      </section>

      {/* ── The directory ──
          A table rather than a stack of cards: a moderator needs to see what a
          listing is and act on it without opening each one, and every row needs
          an edit route. Sponsors had create and delete but no update, so fixing
          a typo meant deleting the business and retyping it. */}
      <section className="rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
        <h2 className="font-display text-lg font-semibold text-white">Listings</h2>
        <p className="mt-1 text-xs text-slate-400">
          Everything reviewed, sponsors and plain listings alike. Tier is what makes a business a sponsor;
          blank means it&apos;s in the directory only.
        </p>

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
              {reviewed.length === 0 ? (
                <AdminTableEmpty colSpan={6}>Nothing listed yet.</AdminTableEmpty>
              ) : (
                reviewed.map((sponsor) => (
                  <AdminTr key={sponsor.id}>
                    <AdminTd>
                      <div className="min-w-0">
                        <p className="font-medium text-white">{sponsor.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {sponsor.address ?? "No address"}
                          {sponsor.submittedBy ? ` · @${sponsor.submittedBy.handle}` : ""}
                        </p>
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
                      {sponsor.rejectionReason ? (
                        <p className="mt-1 max-w-48 truncate text-xs text-slate-500">
                          {sponsor.rejectionReason}
                        </p>
                      ) : null}
                    </AdminTd>
                    <AdminTd className="text-right tabular-nums">{sponsor._count.events}</AdminTd>
                    <AdminTd>
                      <AdminRowActions>
                        <Link
                          href="/shops"
                          target="_blank"
                          title="View on the public directory"
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/admin/community/sponsors/${sponsor.id}/edit`}
                          title={`Edit ${sponsor.name}`}
                          className="rounded-md p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <CommunityDeleteButton kind="sponsor" id={sponsor.id} name={sponsor.name} compact />
                      </AdminRowActions>
                    </AdminTd>
                  </AdminTr>
                ))
              )}
            </AdminTableBody>
          </AdminTable>
        </div>
      </section>
    </div>
  );
}
