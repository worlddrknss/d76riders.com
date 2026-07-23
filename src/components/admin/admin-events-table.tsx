"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, ExternalLink, Star, Trash2, Undo2, Users } from "lucide-react";

import {
  cancelEventAction,
  deleteEventAction,
  reopenEventAction,
} from "@/app/(site)/events/[slug]/actions";
import { toggleEventFeaturedAction } from "@/app/admin/community/actions";
import { bulkSetEventFeaturedAction } from "@/app/admin/events/actions";
import { AdminConfirm } from "@/components/admin/ui/admin-confirm";
import { AdminDataTable, type AdminColumn } from "@/components/admin/ui/admin-data-table";

export type AdminEventRow = {
  id: string;
  slug: string;
  title: string;
  status: string;
  featured: boolean;
  /** Already formatted in the event's own zone — the server owns that. */
  whenLabel: string;
  /** ISO of the true UTC instant, for sorting only. */
  startsAtIso: string;
  isPast: boolean;
  hostName: string;
  hostHandle: string | null;
  goingCount: number;
  interestedCount: number;
  location: string;
};

const iconButton = "rounded p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white";
const bulkButton =
  "rounded-md border border-white/20 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-white/15";

function statusBadge(status: string, isPast: boolean) {
  const effective = status === "UPCOMING" && isPast ? "PAST" : status;
  const styles =
    effective === "UPCOMING" ? "border-forest/40 bg-forest/15 text-emerald-200"
    : effective === "CANCELLED" ? "border-red-500/40 bg-red-500/10 text-red-300"
    : effective === "COMPLETED" ? "border-blue-400/30 bg-blue-500/10 text-blue-200"
    : effective === "DRAFT" ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
    : "border-white/15 bg-white/5 text-slate-400";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] ${styles}`}>
      {effective}
    </span>
  );
}

/**
 * The events console.
 *
 * Events are the busiest thing on the site and the console could do exactly one
 * thing with them: feature one on the homepage. There was no way to see what
 * was scheduled, who was hosting, how many had committed, or to step in when an
 * organizer went quiet — that meant editing the database by hand.
 *
 * Cancel, reopen and delete call the same actions the host's own page calls, so
 * everyone tracking a ride is notified identically however it ended.
 */
export function AdminEventsTable({ events }: { events: AdminEventRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(work: () => Promise<{ error: string | null } | void>) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await work();
        if (result && "error" in result && result.error) {
          setError(result.error);
          return;
        }
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "That didn't work.");
      }
    });
  }

  const columns: AdminColumn<AdminEventRow>[] = [
    {
      key: "title",
      header: "Ride",
      sortValue: (e) => e.title.toLowerCase(),
      searchValue: (e) => `${e.title} ${e.location}`,
      cell: (event) => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {event.featured ? <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" /> : null}
            <span className="truncate font-semibold text-white">{event.title}</span>
          </div>
          {event.location ? <p className="truncate text-xs text-slate-500">{event.location}</p> : null}
        </div>
      ),
    },
    {
      key: "when",
      header: "When",
      sortValue: (e) => e.startsAtIso,
      searchValue: (e) => e.whenLabel,
      cell: (event) => <span className={event.isPast ? "text-slate-500" : "text-slate-300"}>{event.whenLabel}</span>,
    },
    {
      key: "host",
      header: "Host",
      sortValue: (e) => e.hostName.toLowerCase(),
      searchValue: (e) => `${e.hostName} ${e.hostHandle ?? ""}`,
      cell: (event) =>
        event.hostHandle ? (
          <Link href={`/r/${event.hostHandle}`} target="_blank" className="text-slate-300 transition hover:text-white">
            {event.hostName}
          </Link>
        ) : (
          <span className="text-slate-300">{event.hostName}</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (e) => e.status,
      cell: (event) => statusBadge(event.status, event.isPast),
    },
    {
      key: "rsvps",
      header: "Going",
      sortValue: (e) => e.goingCount,
      cell: (event) => (
        <span className="inline-flex items-center gap-1.5 text-slate-300" title={`${event.interestedCount} interested`}>
          <Users className="h-3.5 w-3.5 text-slate-500" />
          {event.goingCount}
          {event.interestedCount > 0 ? (
            <span className="text-xs text-slate-500">+{event.interestedCount}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (event) => (
        <div className="flex items-center justify-end gap-1">
          <Link href={`/events/${event.slug}`} target="_blank" className={iconButton} title="View on the site">
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>

          <button
            onClick={() => run(() => toggleEventFeaturedAction(event.id))}
            disabled={pending}
            className={event.featured ? "rounded p-1.5 text-amber-400 transition hover:bg-amber-500/10" : iconButton}
            title={event.featured ? "Unfeature" : "Feature on the homepage"}
          >
            <Star className={`h-3.5 w-3.5 ${event.featured ? "fill-amber-400" : ""}`} />
          </button>

          {event.status === "CANCELLED" ? (
            <AdminConfirm
              title="Put this ride back on?"
              confirmLabel="Reopen"
              body={
                <>
                  Everyone who was told <span className="font-semibold text-white">{event.title}</span> was
                  cancelled gets told it&apos;s back on, by push and email.
                </>
              }
              onConfirm={() => run(() => reopenEventAction(event.id))}
              trigger={(open, busy) => (
                <button
                  onClick={open}
                  disabled={busy || pending}
                  className="rounded p-1.5 text-emerald-400 transition hover:bg-emerald-500/10"
                  title="Reopen"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                </button>
              )}
            />
          ) : event.status === "COMPLETED" ? null : (
            <AdminConfirm
              title="Cancel this ride?"
              confirmLabel="Cancel ride"
              body={
                <>
                  Everyone going to or tracking{" "}
                  <span className="font-semibold text-white">{event.title}</span> is notified by push and
                  email. The ride stays on the site marked cancelled, and can be reopened.
                </>
              }
              onConfirm={() => run(() => cancelEventAction(event.id))}
              trigger={(open, busy) => (
                <button
                  onClick={open}
                  disabled={busy || pending}
                  className="rounded p-1.5 text-amber-400 transition hover:bg-amber-500/10"
                  title="Cancel"
                >
                  <Ban className="h-3.5 w-3.5" />
                </button>
              )}
            />
          )}

          <AdminConfirm
            title="Delete this ride?"
            confirmLabel="Delete ride"
            body={
              <>
                <span className="font-semibold text-white">{event.title}</span>, its RSVPs, route and every
                photo in its gallery are removed for good. Everyone tracking it is notified. To call a ride
                off without destroying it, cancel instead.
              </>
            }
            onConfirm={() => run(() => deleteEventAction(event.id))}
            trigger={(open, busy) => (
              <button
                onClick={open}
                disabled={busy || pending}
                className="rounded p-1.5 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
      ) : null}

      <AdminDataTable
        rows={events}
        columns={columns}
        rowKey={(event) => event.id}
        searchPlaceholder="Search by title, host, or location…"
        emptyMessage="No rides on the calendar yet."
        filters={[
          {
            key: "when",
            label: "When",
            options: [
              { value: "UPCOMING", label: "Upcoming" },
              { value: "PAST", label: "Past" },
            ],
          },
          {
            key: "status",
            label: "Status",
            options: [
              { value: "UPCOMING", label: "Scheduled" },
              { value: "CANCELLED", label: "Cancelled" },
              { value: "COMPLETED", label: "Completed" },
              { value: "DRAFT", label: "Draft" },
            ],
          },
          {
            key: "featured",
            label: "Featured",
            options: [
              { value: "YES", label: "Featured" },
              { value: "NO", label: "Not featured" },
            ],
          },
        ]}
        filterFn={(event, key, value) => {
          if (key === "when") return value === "PAST" ? event.isPast : !event.isPast;
          if (key === "status") return event.status === value;
          if (key === "featured") return value === "YES" ? event.featured : !event.featured;
          return true;
        }}
        bulkActions={(selected, clear) => {
          const ids = selected.map((e) => e.id);
          const done = () => {
            clear();
            router.refresh();
          };
          return (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(async () => { await bulkSetEventFeaturedAction(ids, true); done(); })}
                className={bulkButton}
              >
                Feature
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(async () => { await bulkSetEventFeaturedAction(ids, false); done(); })}
                className={bulkButton}
              >
                Unfeature
              </button>
            </>
          );
        }}
      />
    </div>
  );
}
