import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, ExternalLink, Footprints, HardHat, Package, Shirt } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type GearSection = {
  key: "HELMET" | "GLOVES" | "JACKET" | "PANTS" | "BOOTS" | "CAMERA_GEAR" | "ACCESSORY";
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const gearSections: GearSection[] = [
  { key: "HELMET", label: "Helmets", icon: HardHat },
  { key: "GLOVES", label: "Gloves", icon: Package },
  { key: "JACKET", label: "Jackets", icon: Shirt },
  { key: "PANTS", label: "Riding Pants", icon: Shirt },
  { key: "BOOTS", label: "Boots", icon: Footprints },
  { key: "CAMERA_GEAR", label: "Camera Gear", icon: Camera },
  { key: "ACCESSORY", label: "Accessories", icon: Package },
];

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const rider = await prisma.rider.findUnique({
    where: { handle },
    select: { name: true, handle: true },
  });
  if (!rider) return { title: "Rider Not Found" };

  return {
    title: `${rider.name}'s Gear — District 76 Riders`,
    description: `Browse ${rider.name}'s riding gear on District 76 Riders.`,
    alternates: { canonical: `/gear/${rider.handle}` },
  };
}

export default async function PublicGearPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const currentUser = await getCurrentUser();

  const rider = await prisma.rider.findUnique({
    where: { handle },
    select: {
      id: true,
      userId: true,
      name: true,
      handle: true,
      gearItems: {
        orderBy: [{ category: "asc" }, { purchaseDate: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          category: true,
          name: true,
          brand: true,
          model: true,
          size: true,
          color: true,
          condition: true,
          purchaseUrl: true,
          notes: true,
        },
      },
    },
  });

  if (!rider) {
    notFound();
  }

  const isOwner = currentUser?.id === rider.userId;
  const totalItems = rider.gearItems.length;

  return (
    <section className="page-shell">
      <div className="content-wrap space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link href={`/r/${rider.handle}`} className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-sunset hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" />
              {rider.name}&apos;s Profile
            </Link>
            <h1 className="mt-2 font-display text-3xl font-semibold text-ink">{rider.name}&apos;s Gear</h1>
            <p className="mt-1 text-sm text-muted">{totalItems} {totalItems === 1 ? "item" : "items"} across {new Set(rider.gearItems.map((i) => i.category)).size} categories</p>
          </div>
          {isOwner && (
            <Link href="/gear/mine" className="rounded-lg bg-sunset px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-white transition hover:bg-[#cf5a26]">
              Manage Gear
            </Link>
          )}
        </div>

        {totalItems === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
            <HardHat className="mx-auto h-8 w-8 text-muted/50" />
            <p className="mt-3 text-sm text-muted">{rider.name} hasn&apos;t added any gear yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {gearSections.map((section) => {
              const items = rider.gearItems.filter((item) => item.category === section.key);
              if (items.length === 0) return null;
              const Icon = section.icon;

              return (
                <article key={section.key} className="flex flex-col rounded-xl border border-border bg-surface shadow-soft">
                  <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sunset/10 text-sunset">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-ink">{section.label}</p>
                    </div>
                    <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-canvas px-1.5 text-xs font-bold text-asphalt">
                      {items.length}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 p-4">
                    {items.map((item) => (
                      <div key={item.id} className="rounded-lg border border-border bg-canvas px-3 py-2.5">
                        <p className="text-sm font-semibold text-ink">{item.name}</p>
                        {(item.brand || item.model) ? (
                          <p className="text-xs text-muted">{[item.brand, item.model].filter(Boolean).join(" ")}</p>
                        ) : null}
                        {(item.size || item.color || item.condition) ? (
                          <p className="mt-0.5 text-xs text-muted">
                            {[item.size && `Size ${item.size}`, item.color, item.condition].filter(Boolean).join(" · ")}
                          </p>
                        ) : null}
                        {item.notes ? <p className="mt-1 text-xs italic text-muted">{item.notes}</p> : null}
                        {item.purchaseUrl ? (
                          <a href={item.purchaseUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-sunset hover:underline">
                            <ExternalLink className="h-3 w-3" /> Buy this
                          </a>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
