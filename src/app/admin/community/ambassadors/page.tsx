import Link from "next/link";
import { Award } from "lucide-react";

import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import {
  grantAmbassadorByHandleAction,
  toggleAmbassadorAction,
} from "@/app/(site)/r/ambassador-actions";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminAmbassadorsPage() {
  const ambassadors = await prisma.rider.findMany({
    where: { isAmbassador: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, handle: true, avatarUrl: true, location: true },
  });

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        eyebrow="Community"
        title="Ambassadors"
        description="Ambassadors are recognized club leaders — they get a badge on their profile and appear on the public /ambassadors page. Grant by handle, remove with one click."
        actions={
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-slate-300">
            {ambassadors.length} active
          </span>
        }
      />

      {/* Add by handle */}
      <section className="rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
        <h2 className="text-sm font-semibold text-white">Grant Ambassador</h2>
        <form action={grantAmbassadorByHandleAction} className="mt-3 flex flex-wrap items-center gap-2">
          <input
            name="handle"
            required
            placeholder="rider handle (e.g. worlddrknss)"
            className="min-w-[240px] flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sunset focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-sunset px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#cf5a26]"
          >
            Grant
          </button>
        </form>
      </section>

      {/* Current ambassadors */}
      <section className="rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
        {ambassadors.length === 0 ? (
          <p className="text-sm text-slate-400">No ambassadors yet. Grant one above or from a rider&apos;s profile.</p>
        ) : (
          <ul className="space-y-2">
            {ambassadors.map((rider) => {
              const avatar = mediaUrl(rider.avatarUrl);
              return (
                <li
                  key={rider.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/5 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {avatar ? (
                      <img src={avatar} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sunset/20 text-sm font-bold text-sunset">
                        {rider.name.charAt(0)}
                      </span>
                    )}
                    <div className="min-w-0">
                      <Link href={`/r/${rider.handle}`} className="flex items-center gap-1 font-semibold text-white hover:text-sunset">
                        {rider.name}
                        <Award className="h-3.5 w-3.5 text-sunset" />
                      </Link>
                      <p className="truncate text-xs text-slate-500">
                        {rider.location ? rider.location : `@${rider.handle}`}
                      </p>
                    </div>
                  </div>
                  <form action={toggleAmbassadorAction.bind(null, rider.handle, false)}>
                    <button
                      type="submit"
                      className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
                    >
                      Remove
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
