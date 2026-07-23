import Link from "next/link";

import { prisma } from "@/lib/prisma";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      rider: { select: { handle: true, name: true, avatarUrl: true } },
      roles: { select: { role: true } },
      _count: { select: { sessions: true } },
    },
  });

  return (
    <div className="space-y-6">
      <section className="route-lines rounded-2xl border border-white/10 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Management</p>
        <h1 className="mt-2 font-display text-4xl text-white">Users</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          All registered accounts. Click a user to manage their roles and profile.
        </p>
        <div className="mt-4 flex gap-4 text-sm">
          <span className="rounded-full border border-sunset/40 bg-sunset/15 px-3 py-1 font-semibold text-orange-200">
            {users.length} registered
          </span>
        </div>
      </section>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/3 shadow-lg">
        <table className="min-w-full divide-y divide-white/10 text-sm text-slate-200">
          <thead className="bg-white/[0.03] text-xs uppercase tracking-[0.12em] text-slate-400">
            <tr>
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Roles</th>
              <th className="px-4 py-3 text-left">Sessions</th>
              <th className="px-4 py-3 text-left">Joined</th>
              <th className="px-4 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">No users yet.</td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {user.rider?.avatarUrl ? (
                        <img src={user.rider.avatarUrl} alt="" className="h-8 w-8 rounded-full border border-white/10 object-cover" />
                      ) : (
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-bold text-slate-300">
                          {(user.name || user.email)[0].toUpperCase()}
                        </span>
                      )}
                      <div>
                        <p className="font-semibold text-white">{user.name || "—"}</p>
                        {user.rider?.handle && (
                          <p className="text-xs text-slate-400">@{user.rider.handle}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-300">{user.email}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length === 0 ? (
                        <span className="text-xs text-slate-500">No roles</span>
                      ) : (
                        user.roles.map((r) => (
                          <span
                            key={r.role}
                            className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
                              r.role === "ADMINISTRATOR"
                                ? "border border-sunset/40 bg-sunset/15 text-orange-200"
                                : r.role === "MODERATOR"
                                  ? "border border-blue-400/30 bg-blue-500/10 text-blue-200"
                                  : "border border-white/10 bg-white/5 text-slate-300"
                            }`}
                          >
                            {r.role}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{user._count.sessions}</td>
                  <td className="px-4 py-3 text-slate-400">
                    {user.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/roles?user=${user.id}`}
                      className="rounded-md border border-white/15 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-white/5"
                    >
                      Manage Roles
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
