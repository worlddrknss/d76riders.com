import { redirect } from "next/navigation";
import { Bike, Wrench, Receipt, DollarSign } from "lucide-react";

import { BikeCard } from "@/components/garage/bike-card";
import { CreateBikeDialog } from "@/components/garage/create-bike-dialog";
import { RiderSubNav } from "@/components/layout/rider-sub-nav";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

function formatCurrency(value: number): string {
  if (!value) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default async function MyGaragePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?next=/garage/mine");
  }

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: {
      name: true,
      handle: true,
      primaryBikeId: true,
      bikes: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          make: true,
          name: true,
          model: true,
          year: true,
          type: true,
          engineType: true,
          displacement: true,
          photos: {
            orderBy: { createdAt: "desc" },
            take: 8,
            select: {
              id: true,
              url: true,
              caption: true,
              createdAt: true,
            },
          },
          modifications: {
            orderBy: { installedAt: "desc" },
            select: {
              id: true,
              title: true,
              category: true,
              cost: true,
              mileage: true,
              notes: true,
              installedAt: true,
            },
          },
          serviceRecords: {
            orderBy: { servicedAt: "desc" },
            select: {
              id: true,
              title: true,
              serviceType: true,
              cost: true,
              mileage: true,
              notes: true,
              servicedAt: true,
            },
          },
        },
      },
    },
  });

  if (!rider) {
    redirect("/account");
  }

  const totalBikes = rider.bikes.length;
  const totalMods = rider.bikes.reduce((sum, bike) => sum + bike.modifications.length, 0);
  const totalServices = rider.bikes.reduce((sum, bike) => sum + bike.serviceRecords.length, 0);
  const totalSpend = rider.bikes.reduce((sum, bike) => {
    const modSpend = bike.modifications.reduce((s, m) => s + (m.cost ?? 0), 0);
    const svcSpend = bike.serviceRecords.reduce((s, r) => s + (r.cost ?? 0), 0);
    return sum + modSpend + svcSpend;
  }, 0);

  return (
    <section className="page-shell">
      <div className="content-wrap space-y-6">
        <RiderSubNav handle={rider.handle} />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Personal Garage</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-ink">{rider.name}&apos;s Bikes</h1>
          </div>
          <CreateBikeDialog />
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface p-4 text-center shadow-soft">
            <Bike className="mx-auto h-4 w-4 text-sunset" />
            <p className="mt-1 font-display text-2xl font-bold text-asphalt">{totalBikes}</p>
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-muted">Bikes</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 text-center shadow-soft">
            <Wrench className="mx-auto h-4 w-4 text-sunset" />
            <p className="mt-1 font-display text-2xl font-bold text-asphalt">{totalMods}</p>
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-muted">Modifications</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 text-center shadow-soft">
            <Receipt className="mx-auto h-4 w-4 text-sunset" />
            <p className="mt-1 font-display text-2xl font-bold text-asphalt">{totalServices}</p>
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-muted">Services</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 text-center shadow-soft">
            <DollarSign className="mx-auto h-4 w-4 text-sunset" />
            <p className="mt-1 font-display text-2xl font-bold text-asphalt">{formatCurrency(totalSpend)}</p>
            <p className="text-[0.6rem] font-semibold uppercase tracking-widest text-muted">Total Invested</p>
          </div>
        </div>

        {totalBikes === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
            <Bike className="mx-auto h-8 w-8 text-muted/50" />
            <p className="mt-3 text-sm text-muted">No bikes in your garage yet.</p>
            <p className="mt-1 text-xs text-muted">Click &quot;Add Bike&quot; above to add your first machine.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {rider.bikes.map((bike) => (
              <BikeCard key={bike.id} bike={bike} isPrimary={bike.id === rider.primaryBikeId} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
