import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Wrench, Receipt, Camera, ArrowLeft } from "lucide-react";

import {
  addBikePhotoAction,
  createModificationAction,
  createServiceRecordAction,
  deleteBikePhotoAction,
  deleteModificationAction,
  deleteServiceRecordAction,
} from "@/app/(site)/garage/mine/actions";
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

export default async function ManageBuildPage({ params }: { params: Promise<{ bikeId: string }> }) {
  const { bikeId } = await params;
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?next=/garage/mine");
  }

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: { id: true },
  });

  if (!rider) {
    redirect("/account");
  }

  const bike = await prisma.bike.findFirst({
    where: { id: bikeId, riderId: rider.id },
    include: {
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
  }));

  return (
    <section className="page-shell">
      <div className="content-wrap space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link href="/garage/mine" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-sunset hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Garage
            </Link>
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink">{bike.name} Build Dashboard</h1>
            <p className="mt-1 text-sm text-muted">Track modifications, service history, photos, and timeline activity for this bike.</p>
          </div>
          <Link href="/garage/mine/analytics" className="rounded-lg border border-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-asphalt hover:border-asphalt">
            View Spend Analytics
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">Total Invested</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">{formatCurrency(totalSpend)}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">Modifications</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">{bike.modifications.length}</p>
            <p className="text-xs text-muted">{formatCurrency(modificationSpend)} spent</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted">Service Records</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">{bike.serviceRecords.length}</p>
            <p className="text-xs text-muted">{formatCurrency(serviceSpend)} spent</p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-asphalt">
              <Wrench className="h-4 w-4 text-sunset" />
              Add Modification
            </h2>
            <form action={createModificationAction} className="space-y-3">
              <input type="hidden" name="bikeId" value={bike.id} />
              <input name="title" required placeholder="Upgrade title" className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
              <div className="grid gap-3 sm:grid-cols-2">
                <select name="category" className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm">
                  <option value="OTHER">Category</option>
                  <option value="EXHAUST">Exhaust</option>
                  <option value="PERFORMANCE">Performance</option>
                  <option value="ENGINE">Engine</option>
                  <option value="SUSPENSION">Suspension</option>
                  <option value="EXTERIOR">Exterior</option>
                  <option value="WHEELS_TIRES">Wheels &amp; Tires</option>
                  <option value="LIGHTING">Lighting</option>
                  <option value="ELECTRICAL">Electrical</option>
                  <option value="PROTECTION">Protection &amp; Crash</option>
                  <option value="ERGONOMICS">Ergonomics</option>
                </select>
                <input name="cost" type="number" step="0.01" min="0" placeholder="Cost" className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="mileage" type="number" min="0" placeholder="Mileage" className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
                <input name="installedAt" type="date" className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
              </div>
              <textarea name="notes" rows={2} placeholder="Notes" className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
              <button type="submit" className="rounded-lg bg-sunset px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white">Add Modification</button>
            </form>

            <BuildTimeline items={bike.modifications} deleteAction={deleteModificationAction} />
          </div>

          <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-asphalt">
              <Receipt className="h-4 w-4 text-sunset" />
              Add Service Record
            </h2>
            <form action={createServiceRecordAction} className="space-y-3">
              <input type="hidden" name="bikeId" value={bike.id} />
              <input name="title" required placeholder="Service title" className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
              <div className="grid gap-3 sm:grid-cols-2">
                <select name="serviceType" className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm">
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="REPAIR">Repair</option>
                  <option value="INSPECTION">Inspection</option>
                  <option value="UPGRADE">Upgrade</option>
                  <option value="OTHER">Other</option>
                </select>
                <input name="cost" type="number" step="0.01" min="0" placeholder="Cost" className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <input name="mileage" type="number" min="0" placeholder="Mileage" className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
                <input name="servicedAt" type="date" className="rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
              </div>
              <textarea name="notes" rows={2} placeholder="Notes" className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
              <button type="submit" className="rounded-lg bg-sunset px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white">Add Service</button>
            </form>

            <ServiceRecords items={serviceItems} deleteAction={deleteServiceRecordAction} />
          </div>
        </div>

        <div>
          <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-asphalt">
              <Camera className="h-4 w-4 text-sunset" />
              Build Photo Gallery
            </h2>
            <form action={addBikePhotoAction} className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <input type="hidden" name="bikeId" value={bike.id} />
              <div className="space-y-2">
                <input name="caption" placeholder="Caption (optional)" className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
                <input name="photo" type="file" accept="image/png,image/jpeg,image/webp" required className="w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm" />
              </div>
              <button type="submit" className="rounded-lg bg-sunset px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white">Upload</button>
            </form>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {bike.photos.map((photo) => (
                <article key={photo.id} className="overflow-hidden rounded-lg border border-border bg-canvas">
                  <img src={mediaUrl(photo.url)} alt={photo.caption || bike.name} className="h-32 w-full object-cover" />
                  <div className="flex items-center justify-between gap-2 px-2 py-2">
                    <p className="truncate text-xs text-muted">{photo.caption || "No caption"}</p>
                    <form action={deleteBikePhotoAction.bind(null, photo.id)}>
                      <button type="submit" className="text-xs font-semibold text-red-600 hover:underline">Delete</button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
