import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  deleteBikePhotoAction,
  deleteModificationAction,
  deleteServiceRecordAction,
} from "@/app/(site)/garage/mine/actions";
import {
  AddBikePhotoDialog,
  AddModificationDialog,
  AddServiceDialog,
} from "@/components/garage/build-dialogs";
import { BuildTimeline } from "@/components/garage/build-timeline";
import { AppShell } from "@/components/layout/app-shell";
import { ServiceRecords } from "@/components/garage/service-records";
import { OdometerControl } from "@/components/garage/odometer-control";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function formatCurrency(value: number | null): string {
  if (!value) {
    return "$0";
  }

  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default async function BuildPage({ params }: { params: Promise<{ bikeId: string }> }) {
  const { bikeId } = await params;

  const bike = await prisma.bike.findUnique({
    where: { id: bikeId },
    include: {
      rider: { select: { handle: true, name: true, userId: true } },
      photos: { orderBy: { createdAt: "desc" } },
      modifications: {
        orderBy: { installedAt: "desc" },
        include: { photos: { select: { url: true } } },
      },
      serviceRecords: { orderBy: { servicedAt: "desc" } },
    },
  });

  if (!bike) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const isOwner = Boolean(currentUser && currentUser.id === bike.rider.userId);

  // Cover strip uses the bike's newest photo; falls back to the branded gradient.
  const coverUrl = bike.photos[0]?.url ? mediaUrl(bike.photos[0].url) : null;

  const modificationSpend = bike.modifications.reduce((sum, item) => sum + (item.cost ?? 0), 0);
  const serviceSpend = bike.serviceRecords.reduce((sum, item) => sum + (item.cost ?? 0), 0);
  const totalSpend = modificationSpend + serviceSpend;

  // Serialize service records across the client-component boundary (ServiceRecords
  // filters client-side, so Dates become ISO strings).
  const serviceItems = bike.serviceRecords.map((item) => ({
    id: item.id,
    title: item.title,
    serviceType: item.serviceType,
    cost: item.cost,
    mileage: item.mileage,
    servicedAt: item.servicedAt.toISOString(),
    notes: item.notes,
    remindAt: item.remindAt ? item.remindAt.toISOString() : null,
    remindMileage: item.remindMileage,
  }));

  // Costs are private — only the owner sees spend (mirrors the public bike card).
  const stats = [
    { value: String(bike.modifications.length), label: "Mods" },
    { value: String(bike.serviceRecords.length), label: "Services" },
    ...(isOwner ? [{ value: formatCurrency(totalSpend), label: "Invested" }] : []),
    { value: bike.currentMileage != null ? bike.currentMileage.toLocaleString("en-US") : "—", label: "Miles" },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
          {coverUrl ? (
            <div className="relative h-40 sm:h-52">
              <img src={coverUrl} alt={bike.name} className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-linear-to-t from-black/25 to-transparent" />
            </div>
          ) : (
            <div
              className="h-28"
              style={{ backgroundImage: "radial-gradient(120% 140% at 80% 0%,rgba(226,102,47,.35),transparent 60%),linear-gradient(150deg,#2b2822,#15130f)" }}
            />
          )}
          <div className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
            <div className="min-w-0">
              <Link
                href={`/r/${bike.rider.handle}?tab=garage`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-sunset hover:underline"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {isOwner ? "Garage" : `${bike.rider.name}'s Garage`}
              </Link>
              <h1 className="mt-2 font-display text-2xl font-bold uppercase tracking-tight text-ink sm:text-3xl">{bike.name}</h1>
              <p className="mt-1 text-sm text-muted">
                {[
                  bike.year,
                  bike.type ? bike.type.charAt(0) + bike.type.slice(1).toLowerCase() : null,
                  [bike.displacement, bike.engineType].filter(Boolean).join(" "),
                ]
                  .filter(Boolean)
                  .join(" · ") || "Build history"}
              </p>
            </div>
            {isOwner && (
              <Link
                href={`/r/${bike.rider.handle}?tab=garage`}
                className="inline-flex items-center gap-1.5 rounded-md border border-border bg-canvas px-4 py-2 text-sm font-semibold text-ink transition hover:border-ink/30"
              >
                Edit bike
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
              <p className="font-display text-2xl font-bold text-ink sm:text-3xl">{s.value}</p>
              <p className="mt-1 text-xs text-muted">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {/* Modifications */}
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Build &amp; Mod Timeline</h2>
              {isOwner && <AddModificationDialog bikeId={bike.id} />}
            </div>
            <BuildTimeline
              items={bike.modifications}
              deleteAction={isOwner ? deleteModificationAction : undefined}
              showCosts={isOwner}
            />
          </div>

          {/* Service records */}
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Service Records</h2>
              <div className="flex items-center gap-3">
                {isOwner ? (
                  <OdometerControl bikeId={bike.id} currentMileage={bike.currentMileage} />
                ) : bike.currentMileage != null ? (
                  <span className="text-sm text-muted">{bike.currentMileage.toLocaleString("en-US")} mi</span>
                ) : null}
                {isOwner && <AddServiceDialog bikeId={bike.id} />}
              </div>
            </div>
            <ServiceRecords
              items={serviceItems}
              deleteAction={isOwner ? deleteServiceRecordAction : undefined}
              showCosts={isOwner}
              currentMileage={bike.currentMileage}
            />
          </div>
        </div>

        {/* Photos */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xs font-bold uppercase tracking-[0.12em] text-muted">Photos</h2>
            {isOwner && <AddBikePhotoDialog bikeId={bike.id} />}
          </div>

          {bike.photos.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-canvas p-10 text-center text-sm text-muted">
              No photos yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {bike.photos.map((photo) => (
                <article key={photo.id} className="group relative overflow-hidden rounded-xl border border-border bg-canvas">
                  <img src={mediaUrl(photo.url)} alt={photo.caption || bike.name} className="aspect-square w-full object-cover" />
                  {isOwner && (
                    <form action={deleteBikePhotoAction.bind(null, photo.id)} className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100">
                      <button type="submit" className="rounded-md bg-asphalt/80 px-2 py-1 text-[0.6rem] font-semibold text-white hover:bg-red-600">
                        Delete
                      </button>
                    </form>
                  )}
                  {photo.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-asphalt/80 to-transparent p-2">
                      <p className="truncate text-xs text-white">{photo.caption}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
