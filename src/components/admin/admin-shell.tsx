"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ComponentType, type ReactNode, useMemo, useState } from "react";
import { Award, ChevronLeft, ChevronRight, ClipboardCheck, ClipboardList, FileCheck2, Flag, FolderOpen, HardDrive, LayoutDashboard, Menu, PenSquare, ScrollText, Shield, Sprout, Users, UserCog } from "lucide-react";

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

type NavSection = {
  title: string;
  items: NavItem[];
};

const adminNavSections: NavSection[] = [
  {
    title: "Dashboard",
    items: [
      { href: "/admin", label: "Overview", icon: LayoutDashboard },
      { href: "/admin/security", label: "Security", icon: Shield },
      { href: "/admin/storage", label: "Storage", icon: HardDrive },
    ],
  },
  {
    title: "Moderation",
    items: [
      { href: "/admin/triage", label: "Triage Queue", icon: Flag },
      { href: "/admin/incidents", label: "Incidents", icon: ClipboardList },
      { href: "/admin/audit", label: "Audit Trail", icon: ScrollText },
      { href: "/admin/policies", label: "Policies", icon: FileCheck2 },
    ],
  },
  {
    title: "Users",
    items: [
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/roles", label: "Roles", icon: UserCog },
      { href: "/admin/badges", label: "Badges", icon: Award },
    ],
  },
  {
    title: "Growth",
    items: [{ href: "/admin/community", label: "Community", icon: Sprout }],
  },
  {
    title: "Content",
    items: [
      { href: "/admin/news", label: "Manage News", icon: PenSquare },
      { href: "/admin/news/new", label: "Create News", icon: PenSquare },
      { href: "/admin/news/moderation", label: "Moderation", icon: ClipboardCheck },
      { href: "/admin/news/categories", label: "Categories", icon: FolderOpen },
    ],
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
    <div className="min-h-[calc(100vh-4rem)] bg-asphalt text-slate-100">
      <div className="pointer-events-none fixed inset-0 top-16 -z-10 bg-[linear-gradient(160deg,#161616_0%,#1c1c1c_55%,#242424_100%)]" />

      <button
        type="button"
        className="fixed left-4 top-20 z-50 rounded-md border border-white/20 bg-white/10 p-2 text-slate-100 md:hidden"
        onClick={() => setMobileOpen((value) => !value)}
        aria-label="Toggle admin navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      <aside
        className={`fixed bottom-0 left-0 top-16 z-40 flex flex-col border-r border-white/10 bg-[linear-gradient(180deg,#141414_0%,#1a1a1a_100%)] backdrop-blur transition-all duration-200 ${
          collapsed ? "w-20" : "w-64"
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <div className="flex h-14 items-center justify-between border-b border-white/10 px-4">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sunset font-display text-xs font-bold text-white">
              76
            </div>
            {!collapsed ? (
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">Admin Panel</p>
                <p className="truncate text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  District 76
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

        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Admin navigation">
          {adminNavSections.map((section) => (
            <div key={section.title} className="mb-4">
              {!collapsed ? (
                <p className="mb-2 px-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {section.title}
                </p>
              ) : (
                <div className="mb-2 border-b border-white/5" />
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        isActive
                          ? "border-sunset/50 bg-sunset/15 text-white"
                          : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed ? <span>{item.label}</span> : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="mx-3 mb-4 rounded-lg border border-white/10 bg-white/3 p-3">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-slate-400">Access</p>
          {!collapsed ? (
            <div className="mt-2 inline-flex items-center gap-2 rounded-md border border-forest/40 bg-forest/15 px-2 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-emerald-200">
              <Shield className="h-3.5 w-3.5" />
              Administrator
            </div>
          ) : (
            <div className="mt-2 inline-flex h-8 w-8 items-center justify-center rounded-md border border-forest/40 bg-forest/15 text-emerald-200">
              <Shield className="h-4 w-4" />
            </div>
          )}
        </div>
      </aside>

      <div className={`min-h-[calc(100vh-4rem)] transition-all duration-200 ${collapsed ? "md:ml-20" : "md:ml-64"}`}>
        <header className="sticky top-16 z-30 border-b border-white/10 bg-asphalt/95 px-4 py-3 backdrop-blur sm:px-6">
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
