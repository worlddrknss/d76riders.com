"use client";

import { useActionState } from "react";

import { grantRoleAction } from "@/app/admin/roles/actions";

type RoleManagerProps = {
  users: { id: string; name: string | null; email: string }[];
  selectedUserId: string | null;
  selectedUserName: string | null;
};

const ROLES = [
  { value: "USER", label: "User", description: "Basic member access" },
  { value: "CONTRIBUTOR", label: "Contributor", description: "Can publish content" },
  { value: "MODERATOR", label: "Moderator", description: "Can review reports and moderate content" },
  { value: "SPONSOR", label: "Sponsor", description: "Sponsor badge and perks" },
  { value: "ADMINISTRATOR", label: "Administrator", description: "Full system access" },
];

export function RoleManager({ users, selectedUserId, selectedUserName }: RoleManagerProps) {
  const [state, formAction] = useActionState<{ error?: string }, FormData>(
    async (_prev, formData) => grantRoleAction(formData),
    {},
  );

  return (
    <form action={formAction} className="mt-4 grid gap-4">
      <label className="grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">User</span>
        <select
          name="userId"
          defaultValue={selectedUserId ?? ""}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 focus:border-sunset/70 focus:outline-none"
          required
        >
          <option value="" disabled>Select a user…</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name || user.email}
            </option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">Role</span>
        <select
          name="role"
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 focus:border-sunset/70 focus:outline-none"
          required
        >
          <option value="" disabled>Select a role…</option>
          {ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label} — {role.description}
            </option>
          ))}
        </select>
      </label>

      {state.error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        className="mt-2 rounded-lg bg-sunset px-4 py-2.5 text-sm font-semibold text-white hover:bg-sunset/85"
      >
        Grant Role
      </button>
    </form>
  );
}
