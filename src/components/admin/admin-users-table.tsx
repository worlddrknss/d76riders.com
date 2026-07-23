"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, Ban, ExternalLink, LogOut, Trash2, UserCog, Undo2 } from "lucide-react";

import {
  deleteUserAction,
  forceLogoutUserAction,
  suspendUserAction,
  unsuspendUserAction,
  verifyUserEmailAction,
} from "@/app/admin/users/actions";
import { AdminConfirm } from "@/components/admin/ui/admin-confirm";
import { AdminDataTable, type AdminColumn } from "@/components/admin/ui/admin-data-table";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  handle: string | null;
  avatarUrl: string | null;
  roles: string[];
  sessionCount: number;
  createdAt: string;
  emailVerified: boolean;
  suspendedAt: string | null;
  suspendedReason: string | null;
  suspendedBy: string | null;
};

const iconButton = "rounded p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white";

function roleChip(role: string) {
  const styles =
    role === "ADMINISTRATOR" ? "border-sunset/40 bg-sunset/15 text-orange-200"
    : role === "MODERATOR" ? "border-blue-400/30 bg-blue-500/10 text-blue-200"
    : "border-white/10 bg-white/5 text-slate-300";
  return (
    <span key={role} className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide ${styles}`}>
      {role}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * The user list.
 *
 * It used to be a read-only table whose one action was a link to the roles
 * page. Everything a moderator actually needs — end their sessions, confirm a
 * lost verification mail, suspend, lift a suspension, delete — now lives on the
 * row, with the destructive ones behind a confirmation that says what is lost.
 */
export function AdminUsersTable({ users }: { users: AdminUserRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [suspending, setSuspending] = useState<AdminUserRow | null>(null);
  const [reason, setReason] = useState("");

  // Server actions here throw on a refused action (suspending an administrator,
  // acting on yourself) rather than returning state, so the message has to be
  // caught and surfaced or the click looks like it did nothing.
  function run(work: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await work();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "That didn't work.");
      }
    });
  }

  const columns: AdminColumn<AdminUserRow>[] = [
    {
      key: "user",
      header: "User",
      sortValue: (u) => u.name.toLowerCase(),
      searchValue: (u) => `${u.name} ${u.email} ${u.handle ?? ""}`,
      cell: (user) => (
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full border border-white/10 object-cover" />
          ) : (
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-bold text-slate-300">
              {(user.name || user.email)[0]?.toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{user.name || "—"}</p>
            {user.handle ? <p className="truncate text-xs text-slate-400">@{user.handle}</p> : null}
          </div>
        </div>
      ),
    },
    {
      key: "email",
      header: "Email",
      sortValue: (u) => u.email,
      searchValue: (u) => u.email,
      cell: (user) => (
        <div className="flex items-center gap-1.5">
          <span className="text-slate-300">{user.email}</span>
          {user.emailVerified ? (
            <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-label="Verified" />
          ) : (
            <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase text-amber-200">
              Unverified
            </span>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortValue: (u) => (u.suspendedAt ? "1" : "0"),
      cell: (user) =>
        user.suspendedAt ? (
          <span
            className="inline-flex rounded-full border border-red-500/40 bg-red-500/10 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-red-300"
            title={user.suspendedReason ?? undefined}
          >
            Suspended
          </span>
        ) : (
          <span className="inline-flex rounded-full border border-forest/40 bg-forest/15 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-emerald-200">
            Active
          </span>
        ),
    },
    {
      key: "roles",
      header: "Roles",
      searchValue: (u) => u.roles.join(" "),
      cell: (user) => (
        <div className="flex flex-wrap gap-1">
          {user.roles.length === 0 ? <span className="text-xs text-slate-500">No roles</span> : user.roles.map(roleChip)}
        </div>
      ),
    },
    {
      key: "sessions",
      header: "Sessions",
      sortValue: (u) => u.sessionCount,
      cell: (user) => <span className="text-slate-400">{user.sessionCount}</span>,
    },
    {
      key: "joined",
      header: "Joined",
      sortValue: (u) => u.createdAt,
      cell: (user) => <span className="text-slate-400">{formatDate(user.createdAt)}</span>,
    },
    {
      key: "actions",
      header: "",
      headerClassName: "text-right",
      className: "text-right",
      cell: (user) => (
        <div className="flex items-center justify-end gap-1">
          {user.handle ? (
            <Link href={`/r/${user.handle}`} target="_blank" className={iconButton} title="View profile">
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : null}

          <Link href={`/admin/roles?user=${user.id}`} className={iconButton} title="Manage roles">
            <UserCog className="h-3.5 w-3.5" />
          </Link>

          {user.emailVerified ? null : (
            <button
              onClick={() => run(() => verifyUserEmailAction(user.id))}
              disabled={pending}
              className={iconButton}
              title="Mark email verified"
            >
              <BadgeCheck className="h-3.5 w-3.5" />
            </button>
          )}

          {user.sessionCount > 0 ? (
            <AdminConfirm
              title="Sign this account out everywhere?"
              confirmLabel="Sign out"
              body={
                <>
                  Ends all {user.sessionCount} session{user.sessionCount === 1 ? "" : "s"} for{" "}
                  <span className="font-semibold text-white">{user.email}</span>. They can log straight back in.
                </>
              }
              onConfirm={() => run(() => forceLogoutUserAction(user.id))}
              trigger={(open, busy) => (
                <button onClick={open} disabled={busy || pending} className={iconButton} title="Force logout">
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              )}
            />
          ) : null}

          {user.suspendedAt ? (
            <button
              onClick={() => run(() => unsuspendUserAction(user.id))}
              disabled={pending}
              className="rounded p-1.5 text-emerald-400 transition hover:bg-emerald-500/10 hover:text-emerald-300"
              title="Lift suspension"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={() => {
                setSuspending(user);
                setReason("");
              }}
              disabled={pending}
              className="rounded p-1.5 text-amber-400 transition hover:bg-amber-500/10 hover:text-amber-300"
              title="Suspend"
            >
              <Ban className="h-3.5 w-3.5" />
            </button>
          )}

          <AdminConfirm
            title="Delete this account?"
            confirmLabel="Delete account"
            body={
              <>
                <span className="font-semibold text-white">{user.email}</span> and everything they created —
                events, articles, journal entries, photos — are removed for good. To stop someone without
                destroying their content, suspend them instead.
              </>
            }
            onConfirm={() => run(() => deleteUserAction(user.id))}
            trigger={(open, busy) => (
              <button
                onClick={open}
                disabled={busy || pending}
                className="rounded p-1.5 text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      {error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
      ) : null}

      <AdminDataTable
        rows={users}
        columns={columns}
        rowKey={(user) => user.id}
        searchPlaceholder="Search by name, handle, or email…"
        emptyMessage="No accounts yet."
        filters={[
          {
            key: "status",
            label: "Status",
            options: [
              { value: "ACTIVE", label: "Active" },
              { value: "SUSPENDED", label: "Suspended" },
              { value: "UNVERIFIED", label: "Unverified email" },
            ],
          },
          {
            key: "role",
            label: "Role",
            options: [
              { value: "ADMINISTRATOR", label: "Administrator" },
              { value: "MODERATOR", label: "Moderator" },
              { value: "NONE", label: "No roles" },
            ],
          },
        ]}
        filterFn={(user, key, value) => {
          if (key === "status") {
            if (value === "SUSPENDED") return Boolean(user.suspendedAt);
            if (value === "ACTIVE") return !user.suspendedAt;
            if (value === "UNVERIFIED") return !user.emailVerified;
          }
          if (key === "role") {
            if (value === "NONE") return user.roles.length === 0;
            return user.roles.includes(value);
          }
          return true;
        }}
      />

      {/* Suspension asks for a reason before it happens — the rider is shown it
          at the login screen, so a blank one turns an appeal into a mystery. */}
      {suspending ? (
        <div
          className="fixed inset-0 z-70 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Suspend account"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSuspending(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-asphalt p-6 shadow-lift">
            <h3 className="font-display text-lg text-white">Suspend {suspending.name || suspending.email}</h3>
            <p className="mt-1.5 text-sm text-slate-300">
              Their sessions end immediately and they cannot log back in. Nothing they created is deleted.
            </p>

            <label className="mt-4 grid gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-400">
                Reason (shown to them)
              </span>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Repeated harassment in event comments after a warning."
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sunset/70 focus:outline-none"
              />
            </label>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSuspending(null)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-400 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || !reason.trim()}
                onClick={() => {
                  const target = suspending;
                  setSuspending(null);
                  run(() => suspendUserAction(target.id, reason));
                }}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
              >
                Suspend
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
