import { redirect } from "next/navigation";

import { createGearItemAction, deleteGearItemAction } from "@/app/(site)/gear/mine/actions";
import { GearCategoryCard } from "@/components/gear/gear-category-card";
import { RiderSubNav } from "@/components/layout/rider-sub-nav";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

type GearSection = {
  key: "HELMET" | "GLOVES" | "JACKET" | "PANTS" | "BOOTS" | "CAMERA_GEAR" | "ACCESSORY";
  label: string;
  description: string;
  iconKey: string;
};

const gearSections: GearSection[] = [
  { key: "HELMET", label: "Helmets", description: "Daily, touring, and backup lids.", iconKey: "HardHat" },
  { key: "GLOVES", label: "Gloves", description: "Summer, winter, and rain setups.", iconKey: "Package" },
  { key: "JACKET", label: "Jackets", description: "Mesh, textile, and cold-weather layers.", iconKey: "Shirt" },
  { key: "PANTS", label: "Riding Pants", description: "Protective pants and over-pants.", iconKey: "Shirt" },
  { key: "BOOTS", label: "Boots", description: "Riding boots, shoes, and covers.", iconKey: "Footprints" },
  { key: "CAMERA_GEAR", label: "Camera Gear", description: "Action cams, mounts, and cards.", iconKey: "Camera" },
  { key: "ACCESSORY", label: "Accessories", description: "Intercoms, locks, bags, and extras.", iconKey: "Package" },
];

export default async function GearPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?next=/gear/mine");
  }

  const rider = await prisma.rider.findUnique({
    where: { userId: currentUser.id },
    select: {
      id: true,
      handle: true,
      gearItems: {
        orderBy: [{ category: "asc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!rider) {
    redirect("/account");
  }

  const totalItems = rider.gearItems.length;

  return (
    <section className="page-shell">
      <div className="content-wrap space-y-6">
        <RiderSubNav handle={rider.handle} />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Gear Locker</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-ink">Your Riding Gear</h1>
            <p className="mt-1 text-sm text-muted">
              {totalItems} {totalItems === 1 ? "item" : "items"} across {gearSections.length} categories. Tap <strong>+</strong> to add.
            </p>
          </div>
        </div>

        {/* Category grid with add modals */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {gearSections.map((section) => {
            const items = rider.gearItems.filter((item) => item.category === section.key);

            return (
              <GearCategoryCard
                key={section.key}
                categoryKey={section.key}
                label={section.label}
                description={section.description}
                iconKey={section.iconKey}
                items={items}
                createAction={createGearItemAction}
                deleteAction={deleteGearItemAction}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
