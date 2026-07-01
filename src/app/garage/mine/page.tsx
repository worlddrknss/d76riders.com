import Link from "next/link";
import { redirect } from "next/navigation";
import { Bike } from "lucide-react";

import { BikeCard } from "@/components/garage/bike-card";
import { CreateBikeDialog } from "@/components/garage/create-bike-dialog";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

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
            orderBy: { createdAt: "asc" },
            take: 1,
            select: {
              url: true,
              caption: true,
            },
          },
        },
      },
    },
  });

  if (!rider) {
    redirect("/account");
  }

  return (
    <section className="page-shell">
      <div className="content-wrap">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">Personal Garage</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-ink">{rider.name}&apos;s Bikes</h1>
          </div>
          <div className="flex items-center gap-3">
            <CreateBikeDialog />
            <Link href={`/riders/${rider.handle}`} className="text-sm font-semibold text-sunset hover:underline">Back to profile</Link>
          </div>
        </div>

        <div className="mt-8">
          {rider.bikes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
              <Bike className="mx-auto h-8 w-8 text-muted/50" />
              <p className="mt-3 text-sm text-muted">No bikes in your garage yet.</p>
              <p className="mt-1 text-xs text-muted">Click &quot;Add Bike&quot; to add your first machine.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {rider.bikes.map((bike) => (
                <BikeCard key={bike.id} bike={bike} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
