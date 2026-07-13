import { redirect } from "next/navigation";
import { Activity, Receipt, Wrench } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export default async function GarageAnalyticsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?next=/garage/mine/analytics");
  }

  const rider = await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } });

  if (!rider) {
    redirect("/account");
  }

  const bikes = await prisma.bike.findMany({
    where: { riderId: rider.id },
    select: {
      id: true,
      name: true,
      modifications: { select: { cost: true, installedAt: true } },
      serviceRecords: { select: { cost: true, servicedAt: true } },
    },
  });

  const rows = bikes.map((bike) => {
    const modificationSpend = bike.modifications.reduce((sum, item) => sum + (item.cost ?? 0), 0);
    const serviceSpend = bike.serviceRecords.reduce((sum, item) => sum + (item.cost ?? 0), 0);
    return {
      id: bike.id,
      name: bike.name,
      modificationSpend,
      serviceSpend,
      total: modificationSpend + serviceSpend,
      modifications: bike.modifications.length,
      services: bike.serviceRecords.length,
    };
  });

  const totalModSpend = rows.reduce((sum, row) => sum + row.modificationSpend, 0);
  const totalServiceSpend = rows.reduce((sum, row) => sum + row.serviceSpend, 0);
  const grandTotal = totalModSpend + totalServiceSpend;

  return (
    <section className="page-shell">
      <div className="content-wrap space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Build Analytics</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Spending Breakdown and Build Trends</h1>
          <p className="mt-2 text-sm text-muted">Track total invested by bike across modifications and maintenance records.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted"><Wrench className="h-3.5 w-3.5 text-sunset" />Parts and Mods</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">{formatCurrency(totalModSpend)}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted"><Receipt className="h-3.5 w-3.5 text-sunset" />Service and Maintenance</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">{formatCurrency(totalServiceSpend)}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="flex items-center gap-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted"><Activity className="h-3.5 w-3.5 text-sunset" />Total Invested</p>
            <p className="mt-2 font-display text-2xl font-semibold text-ink">{formatCurrency(grandTotal)}</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-canvas text-xs uppercase tracking-[0.08em] text-muted">
              <tr>
                <th className="px-4 py-3">Build</th>
                <th className="px-4 py-3">Mods</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold text-ink">{row.name}</td>
                  <td className="px-4 py-3 text-muted">{row.modifications} · {formatCurrency(row.modificationSpend)}</td>
                  <td className="px-4 py-3 text-muted">{row.services} · {formatCurrency(row.serviceSpend)}</td>
                  <td className="px-4 py-3 font-semibold text-asphalt">{formatCurrency(row.total)}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">No bike data yet. Add a bike and start logging modifications and service.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
