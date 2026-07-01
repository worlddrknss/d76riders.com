"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentType, type ReactNode, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Flag, LayoutDashboard, Menu, PenSquare, Shield } from "lucide-react";

import { type CurrentUser } from "@/lib/session";

type AdminShellProps = {
  children: ReactNode;
  currentUser: CurrentUser;
};

type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const adminNavItems: NavItem[] = [
  {
    href: "/admin",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    href: "/admin/reports",
    label: "Reports",
    icon: Flag,
  },
  {
    href: "/admin/news",
    label: "Manage News",
    icon: PenSquare,
  },
  {
    href: "/admin/news/new",
    label: "Create News",
    icon: PenSquare,
  },
];

function initialsFromName(name: string | null, email: string): string {
  const source = (name || email).trim();
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "A";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function AdminShell({ children, currentUser }: AdminShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const userInitials = useMemo(
    () => initialsFromName(currentUser.name, currentUser.email),
    [currentUser.email, currentUser.name],
  );

  return (
    <div className="min-h-screen bg-[#060b14] text-slate-100">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_12%_18%,rgba(37,99,235,0.22),transparent_45%),radial-gradient(circle_at_82%_8%,rgba(16,185,129,0.2),transparent_42%),linear-gradient(180deg,#060b14_0%,#08101f_100%)]" />

      <button
        type="button"
        className="fixed left-4 top-4 z-50 rounded-md border border-white/20 bg-white/10 p-2 text-slate-100 md:hidden"
        onClick={() => setMobileOpen((value) => !value)}
        aria-label="Toggle admin navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside
        className={`fixed inset-y-0 left-0 z-40 border-r border-white/10 bg-[#020817]/90 backdrop-blur transition-all duration-200 ${
          collapsed ? "w-20" : "w-72"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500 font-display text-sm font-bold text-white">
              V
            </div>
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-semibold uppercase tracking-[0.08em] text-white">
                  Admin Panel
                </p>
                <p className="truncate text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  District 76 Riders
                </p>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className="hidden rounded-md border border-white/15 p-1.5 text-slate-300 hover:border-white/35 hover:text-white md:inline-flex"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="space-y-1 px-3 py-4" aria-label="Admin navigation">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "border-blue-400/60 bg-blue-500/20 text-blue-100"
                    : "border-transparent text-slate-300 hover:border-white/15 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed ? <span>{item.label}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="mx-3 mt-6 rounded-xl border border-white/10 bg-white/3 p-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Access</p>
          {!collapsed ? (
            <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-emerald-400/35 bg-emerald-500/10 px-2 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-200">
              <Shield className="h-3.5 w-3.5" />
              Administrator
            </div>
          ) : (
            <div className="mt-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-emerald-400/35 bg-emerald-500/10 text-emerald-200">
              <Shield className="h-4 w-4" />
            </div>
          )}
        </div>
      </aside>

      <div className={`transition-all duration-200 ${collapsed ? "md:ml-20" : "md:ml-72"}`}>
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#020617]/90 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-end gap-3">
            <span className="hidden text-sm font-semibold text-slate-300 sm:inline">@{currentUser.handle || currentUser.name || "admin"}</span>
            {currentUser.avatarUrl ? (
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.name || "Administrator"}
                className="h-9 w-9 rounded-full border border-white/20 object-cover"
              />
            ) : (
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-bold text-white">
                {userInitials}
              </span>
            )}
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
