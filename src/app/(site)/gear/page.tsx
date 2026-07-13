import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Bike, Receipt, Wrench } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Gear · District 76 Riders",
  description: "Track your bike modifications, maintenance history, and total spend in one place.",
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value: Date): string {
  return value.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatEnum(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

type GearActivityItem = {
  id: string;
  type: "modification" | "service";
  title: string;
  bikeLabel: string;
  category: string;
  cost: number | null;
  when: Date;
};

export default async function GearPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?next=/gear");
  }

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: { id: true, name: true, handle: true, bikes: { select: { id: true } } },
  });

  if (!rider) {
    redirect("/account");
  }

  const [modifications, serviceRecords] = await Promise.all([
    prisma.buildModification.findMany({
      where: { riderId: rider.id },
      orderBy: { installedAt: "desc" },
      select: {
        id: true,
        title: true,
        category: true,
        cost: true,
        installedAt: true,
        bike: { select: { name: true, make: true, model: true, year: true } },
      },
    }),
    prisma.serviceRecord.findMany({
      where: { riderId: rider.id },
      orderBy: { servicedAt: "desc" },
      select: {
        id: true,
        title: true,
        serviceType: true,
        cost: true,
        servicedAt: true,
        bike: { select: { name: true, make: true, model: true, year: true } },
      },
    }),
  ]);

  const modificationSpend = modifications.reduce((sum, item) => sum + (item.cost ?? 0), 0);
  const serviceSpend = serviceRecords.reduce((sum, item) => sum + (item.cost ?? 0), 0);
  const totalSpend = modificationSpend + serviceSpend;

  const activity: GearActivityItem[] = [
    ...modifications.map((item) => ({
      id: item.id,
      type: "modification" as const,
      title: item.title,
      bikeLabel: item.bike.name,
      category: formatEnum(item.category),
      cost: item.cost,
      when: item.installedAt,
    })),
    ...serviceRecords.map((item) => ({
      id: item.id,
      type: "service" as const,
      title: item.title,
      bikeLabel: item.bike.name,
      category: formatEnum(item.serviceType),
      cost: item.cost,
      when: item.servicedAt,
    })),
  ]
    .sort((a, b) => b.when.getTime() - a.when.getTime())
    .slice(0, 12);

  return (
    <section className="page-shell">
      <div className="content-wrap space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Gear Hub</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-ink">{rider.name}&apos;s Gear and Service Log</h1>
            <p className="mt-2 text-sm text-muted">All your build upgrades and maintenance history in one feed.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/garage/mine" className="text-sm font-semibold text-sunset hover:underline">Manage Garage</Link>
            <Link href="/garage/mine/analytics" className="text-sm font-semibold text-sunset hover:underline">View Analytics</Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted"><Bike className="h-3.5 w-3.5 text-sunset" />Bikes</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">{rider.bikes.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted"><Wrench className="h-3.5 w-3.5 text-sunset" />Modifications</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">{modifications.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted"><Receipt className="h-3.5 w-3.5 text-sunset" />Service Records</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">{serviceRecords.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted"><Activity className="h-3.5 w-3.5 text-sunset" />Total Spend</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">{formatCurrency(totalSpend)}</p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl font-semibold text-ink">Recent Gear Activity</h2>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted">Last {activity.length}</p>
          </div>

          {activity.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-border bg-canvas p-10 text-center">
              <Wrench className="mx-auto h-8 w-8 text-muted/50" />
              <p className="mt-3 text-sm text-muted">No gear activity yet.</p>
              <p className="mt-1 text-xs text-muted">Add modifications and service entries from your garage to populate this page.</p>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {activity.map((entry) => (
                <div key={`${entry.type}-${entry.id}`} className="rounded-lg border border-border bg-canvas p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-ink">{entry.title}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] ${entry.type === "modification" ? "bg-sunset/15 text-sunset" : "bg-forest/15 text-forest"}`}>
                      {entry.type === "modification" ? "Modification" : "Service"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                    <span>{entry.bikeLabel}</span>
                    <span>{entry.category}</span>
                    <span>{formatDate(entry.when)}</span>
                    {entry.cost != null ? <span className="font-semibold text-asphalt">{formatCurrency(entry.cost)}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
