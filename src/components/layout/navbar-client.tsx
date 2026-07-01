"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, UserCog, UserRound, Bike, CalendarPlus2, LogOut, Shield } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { logoutAction } from "@/app/(auth)/actions";
import { navItems } from "@/data/community";
import { type CurrentUser } from "@/lib/session";

type NavbarClientProps = {
  currentUser: CurrentUser | null;
};

function initialsFromName(name: string | null, email: string): string {
  const source = (name || email).trim();
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "R";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function NavbarClient({ currentUser }: NavbarClientProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdministrator = currentUser?.roles.includes("ADMINISTRATOR") ?? false;

  useEffect(() => {
    setIsOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  const userInitials = useMemo(() => {
    if (!currentUser) {
      return "";
    }

    return initialsFromName(currentUser.name, currentUser.email);
  }, [currentUser]);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-asphalt text-white">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex flex-col leading-none" aria-label="District 76 home">
          <span className="font-display text-2xl font-bold tracking-tight">
            DISTRICT <span className="text-sunset">76</span> RIDERS
          </span>
          <span className="mt-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Clarksville, Tennessee
          </span>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm font-medium transition-colors ${
                pathname === item.href ? "text-white" : "text-slate-300 hover:text-white"
              }`}
            >
              {item.label}
              {pathname === item.href ? (
                <span className="mt-1 block h-0.5 w-full rounded-full bg-sunset" />
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="relative flex items-center gap-3">
          {currentUser ? (
            <>
              <button
                type="button"
                className="hidden items-center gap-2 rounded-md bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 lg:inline-flex"
                onClick={() => setMenuOpen((value) => !value)}
                aria-expanded={menuOpen}
                aria-label="Open account menu"
              >
                {currentUser.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name || "Rider avatar"}
                    className="h-7 w-7 rounded-full border border-white/20 object-cover"
                  />
                ) : (
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/10 text-xs font-bold">
                    {userInitials}
                  </span>
                )}
                <span className="max-w-32 truncate">{currentUser.name || currentUser.handle || "Rider"}</span>
                <ChevronDown className="h-4 w-4 text-slate-300" />
              </button>

              {menuOpen ? (
                <div className="absolute right-0 top-12 hidden min-w-56 rounded-xl border border-white/10 bg-[#171a1f] p-2 shadow-lift lg:block">
                  <div className="p-1">
                    <Link href="/account" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
                      <UserCog className="h-4 w-4 text-slate-300" />
                      <span>{currentUser.name || "Rider"}</span>
                    </Link>
                    <Link href={`/riders/${currentUser.handle}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
                      <UserRound className="h-4 w-4 text-slate-300" />
                      <span>Profile</span>
                    </Link>
                    <Link href="/garage/mine" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
                      <Bike className="h-4 w-4 text-slate-300" />
                      <span>Garage</span>
                    </Link>
                    <Link href="/events/new" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
                      <CalendarPlus2 className="h-4 w-4 text-slate-300" />
                      <span>Create Event</span>
                    </Link>
                    {isAdministrator ? (
                      <Link href="/admin" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
                        <Shield className="h-4 w-4 text-slate-300" />
                        <span>Admin Console</span>
                      </Link>
                    ) : null}
                    <form action={logoutAction}>
                      <button
                        type="submit"
                        className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-300 hover:bg-red-500/10"
                      >
                        <LogOut className="h-4 w-4" />
                        Log Out
                      </button>
                    </form>
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="hidden rounded-md border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-white hover:bg-white/10 lg:inline-flex"
              >
                Log In
              </Link>
              <Link
                href="/join"
                className="hidden rounded-md bg-sunset px-4 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-white hover:bg-[#cf5a26] lg:inline-flex"
              >
                Join the Community
              </Link>
            </>
          )}

          <button
            type="button"
            className="rounded-lg border border-white/20 p-2 text-white lg:hidden"
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div className="border-t border-white/10 bg-asphalt lg:hidden">
          <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
            <nav className="grid gap-1" aria-label="Mobile navigation">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    pathname === item.href ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              {currentUser ? (
                <>
                  <Link
                    href="/account"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
                    onClick={() => setIsOpen(false)}
                  >
                    Edit Profile
                  </Link>
                  <Link
                    href={`/riders/${currentUser.handle}`}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
                    onClick={() => setIsOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href="/garage/mine"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
                    onClick={() => setIsOpen(false)}
                  >
                    Garage
                  </Link>
                  <Link
                    href="/events/new"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
                    onClick={() => setIsOpen(false)}
                  >
                    Create Event
                  </Link>
                  {isAdministrator ? (
                    <Link
                      href="/admin"
                      className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
                      onClick={() => setIsOpen(false)}
                    >
                      Admin Console
                    </Link>
                  ) : null}
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-red-300 hover:bg-red-500/10"
                    >
                      Log Out
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
                    onClick={() => setIsOpen(false)}
                  >
                    Log In
                  </Link>
                  <Link
                    href="/join"
                    className="mt-1 rounded-md bg-sunset px-3 py-2 text-sm font-semibold text-white"
                    onClick={() => setIsOpen(false)}
                  >
                    Join the Community
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      ) : null}
    </header>
  );
}
