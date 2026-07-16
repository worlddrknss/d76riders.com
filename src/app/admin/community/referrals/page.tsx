import Link from "next/link";

import { AdminSectionHeader } from "@/components/admin/admin-section-header";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminReferralsPage() {
  const [leaders, totals] = await Promise.all([
    prisma.referralCode.findMany({
      orderBy: { referrals: { _count: "desc" } },
      take: 25,
      select: {
        code: true,
        clicks: true,
        rider: { select: { handle: true, name: true } },
        _count: { select: { referrals: true } },
      },
    }),
    prisma.referral.count(),
  ]);

  return (
    <div className="space-y-6">
      <AdminSectionHeader
        eyebrow="Community"
        title="Referrals"
        description="Who is actually bringing riders in. Read-only — invite links are minted by riders from their own profile."
        actions={
          <span className="rounded-full border border-sunset/40 bg-sunset/15 px-3 py-1 text-sm font-semibold text-orange-200">
            {totals} joined via invite
          </span>
        }
      />

      <section className="rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
        {leaders.length === 0 ? (
          <p className="text-sm text-slate-400">No invite links have been created yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500">
                <th className="pb-2 font-semibold">Rider</th>
                <th className="pb-2 font-semibold">Code</th>
                <th className="pb-2 text-right font-semibold">Opens</th>
                <th className="pb-2 text-right font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((leader) => (
                <tr key={leader.code} className="border-t border-white/5">
                  <td className="py-2">
                    <Link href={`/r/${leader.rider.handle}`} className="text-slate-200 hover:text-white">
                      @{leader.rider.handle}
                    </Link>
                  </td>
                  <td className="py-2 font-mono text-xs text-slate-400">{leader.code}</td>
                  <td className="py-2 text-right text-slate-400">{leader.clicks}</td>
                  <td className="py-2 text-right font-semibold text-sunset">{leader._count.referrals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
