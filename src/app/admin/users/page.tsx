import { AdminUsersTable, type AdminUserRow } from "@/components/admin/admin-users-table";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      createdAt: true,
      suspendedAt: true,
      suspendedReason: true,
      suspendedBy: { select: { email: true } },
      rider: { select: { handle: true, name: true, avatarUrl: true } },
      roles: { select: { role: true } },
      _count: { select: { sessions: true } },
    },
  });

  const rows: AdminUserRow[] = users.map((user) => ({
    id: user.id,
    name: user.rider?.name || user.name || "",
    email: user.email,
    handle: user.rider?.handle ?? null,
    avatarUrl: mediaUrl(user.rider?.avatarUrl ?? null) || null,
    roles: user.roles.map((r) => r.role),
    sessionCount: user._count.sessions,
    createdAt: user.createdAt.toISOString(),
    emailVerified: Boolean(user.emailVerified),
    suspendedAt: user.suspendedAt?.toISOString() ?? null,
    suspendedReason: user.suspendedReason,
    suspendedBy: user.suspendedBy?.email ?? null,
  }));

  const suspended = rows.filter((r) => r.suspendedAt).length;
  const unverified = rows.filter((r) => !r.emailVerified).length;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Management</p>
        <h1 className="mt-2 font-display text-3xl text-white">Users</h1>
        <p className="mt-2 text-sm text-slate-300">
          Every registered account, with the levers to moderate one: roles, sessions, verification,
          suspension and deletion.
        </p>
      </div>

      {/* The counts that decide what a moderator does next, not vanity totals. */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Registered" value={rows.length} />
        <Stat label="Suspended" value={suspended} tone={suspended > 0 ? "bad" : "neutral"} />
        <Stat label="Unverified email" value={unverified} tone={unverified > 0 ? "warn" : "neutral"} />
      </div>

      <AdminUsersTable users={rows} />
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warn" | "bad";
}) {
  const valueTone =
    tone === "bad" ? "text-red-300" : tone === "warn" ? "text-amber-200" : "text-white";
  return (
    <div className="rounded-xl border border-white/10 bg-white/3 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">{label}</p>
      <p className={`mt-1 font-display text-2xl ${valueTone}`}>{value}</p>
    </div>
  );
}
