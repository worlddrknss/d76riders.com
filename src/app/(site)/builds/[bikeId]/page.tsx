import Link from "next/link";
import { notFound } from "next/navigation";
import { Wrench, Receipt, Camera, ArrowLeft } from "lucide-react";

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
import { ServiceRecords } from "@/components/garage/service-records";
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
  }));

  // Costs are private — only the owner sees spend (mirrors the public bike card).
  const stats = isOwner
    ? [
        { label: "Total Invested", value: formatCurrency(totalSpend), sub: null },
        { label: "Modifications", value: String(bike.modifications.length), sub: `${formatCurrency(modificationSpend)} spent` },
        { label: "Service Records", value: String(bike.serviceRecords.length), sub: `${formatCurrency(serviceSpend)} spent` },
      ]
    : [
        { label: "Modifications", value: String(bike.modifications.length), sub: null },
        { label: "Service Records", value: String(bike.serviceRecords.length), sub: null },
        { label: "Photos", value: String(bike.photos.length), sub: null },
      ];

  return (
    <section className="page-shell">
      <div className="content-wrap space-y-6">
        <div>
          <Link
            href={`/r/${bike.rider.handle}?tab=garage`}
            className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-sunset hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {isOwner ? "Back to Garage" : `${bike.rider.name}'s Garage`}
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold text-ink">{bike.name}</h1>
          <p className="mt-1 text-sm text-muted">
            {[bike.year, bike.make, bike.model].filter(Boolean).join(" · ") || "Build history"}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-2xl border border-border bg-surface p-5 shadow-soft">
              <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">{s.label}</p>
              <p className="mt-2 font-display text-2xl font-semibold text-ink">{s.value}</p>
              {s.sub && <p className="text-xs text-muted">{s.sub}</p>}
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          {/* Modifications */}
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-asphalt">
                <Wrench className="h-4 w-4 text-sunset" />
                Build Timeline
              </h2>
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
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-asphalt">
                <Receipt className="h-4 w-4 text-sunset" />
                Service Records
              </h2>
              {isOwner && <AddServiceDialog bikeId={bike.id} />}
            </div>
            <ServiceRecords
              items={serviceItems}
              deleteAction={isOwner ? deleteServiceRecordAction : undefined}
              showCosts={isOwner}
            />
          </div>
        </div>

        {/* Photos */}
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-soft sm:p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-asphalt">
              <Camera className="h-4 w-4 text-sunset" />
              Photos
            </h2>
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
    </section>
  );
}
