import { prisma } from "@/lib/prisma";
import { RoleManager } from "@/components/admin/role-manager";

type AdminRolesPageProps = {
  searchParams: Promise<{ user?: string }>;
};

export default async function AdminRolesPage({ searchParams }: AdminRolesPageProps) {
  const { user: selectedUserId } = await searchParams;

  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  const roleAssignments = await prisma.userRole.findMany({
    where: selectedUserId ? { userId: selectedUserId } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  const selectedUser = selectedUserId
    ? users.find((u) => u.id === selectedUserId) ?? null
    : null;

  return (
    <div className="space-y-6">
      <section className="route-lines rounded-2xl border border-white/10 p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Access Control</p>
        <h1 className="mt-2 font-display text-4xl text-white">Role Assignment</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-300">
          Grant or revoke roles for members. Roles determine access to admin features, moderation tools, and content publishing.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr]">
        <section className="rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
          <h2 className="font-display text-lg text-white">Grant Role</h2>
          <p className="mt-1 text-sm text-slate-400">Assign a new role to a user account.</p>
          <RoleManager
            users={users}
            selectedUserId={selectedUserId ?? null}
            selectedUserName={selectedUser?.name ?? selectedUser?.email ?? null}
          />
        </section>

        <section className="rounded-xl border border-white/10 bg-white/3 p-5 shadow-lg">
          <h2 className="font-display text-lg text-white">
            {selectedUser ? `Roles for ${selectedUser.name || selectedUser.email}` : "All Role Assignments"}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            {roleAssignments.length} assignment{roleAssignments.length !== 1 ? "s" : ""}
          </p>

          <div className="mt-4 divide-y divide-white/5">
            {roleAssignments.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                {selectedUser ? "No roles assigned to this user." : "No role assignments found."}
              </p>
            ) : (
              roleAssignments.map((assignment) => (
                <div key={assignment.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {assignment.user.name || assignment.user.email}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${
                          assignment.role === "ADMINISTRATOR"
                            ? "border border-sunset/40 bg-sunset/15 text-orange-200"
                            : assignment.role === "MODERATOR"
                              ? "border border-blue-400/30 bg-blue-500/10 text-blue-200"
                              : "border border-white/10 bg-white/5 text-slate-300"
                        }`}
                      >
                        {assignment.role}
                      </span>
                      <span className="text-xs text-slate-500">
                        since {assignment.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                  </div>
                  <form action={async (formData: FormData) => {
                    "use server";
                    const { revokeRoleAction } = await import("@/app/admin/roles/actions");
                    await revokeRoleAction(formData);
                  }}>
                    <input type="hidden" name="userRoleId" value={assignment.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:border-red-500/50 hover:bg-red-500/20"
                    >
                      Revoke
                    </button>
                  </form>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
