import type { Metadata } from "next";
import Link from "next/link";
import { Award } from "lucide-react";

import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Ambassadors — D76 Riders",
  description: "The riders who lead and represent the District 76 community.",
  alternates: { canonical: "/ambassadors" },
};

export default async function AmbassadorsPage() {
  const ambassadors = await prisma.rider.findMany({
    where: { isAmbassador: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, handle: true, avatarUrl: true, location: true },
  });

  return (
    <section className="page-shell">
      <div className="content-wrap mx-auto max-w-4xl space-y-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sunset/10 text-sunset">
            <Award className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">Ambassadors</h1>
            <p className="text-sm text-muted">Riders who lead and represent District 76.</p>
          </div>
        </div>

        {ambassadors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
            <Award className="mx-auto h-8 w-8 text-muted/50" />
            <p className="mt-3 text-sm text-muted">No ambassadors named yet — check back soon.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ambassadors.map((rider) => {
              const avatar = mediaUrl(rider.avatarUrl);
              return (
                <Link
                  key={rider.id}
                  href={`/r/${rider.handle}`}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-soft transition hover:shadow-lift"
                >
                  {avatar ? (
                    <img src={avatar} alt={rider.name} className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-sunset/15 text-lg font-bold text-sunset">
                      {rider.name.charAt(0)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="flex items-center gap-1 truncate font-semibold text-ink">
                      {rider.name}
                      <Award className="h-3.5 w-3.5 shrink-0 text-sunset" />
                    </p>
                    <p className="truncate text-sm text-muted">
                      {rider.location ? rider.location : `@${rider.handle}`}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
