"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown, UserRound, Bike, CalendarPlus2, LogOut, Shield, Bell, BellRing, Bookmark, MessageSquare, Search, Wrench, CheckCheck, UserCog, Settings } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { logoutAction } from "@/app/(site)/(auth)/actions";
import { markAllReadAction } from "@/app/(site)/notifications/actions";
import { navItems } from "@/data/community";
import { type CurrentUser } from "@/lib/session";

type ActivityItem = {
  id: string;
  summary: string;
  type: string;
  createdAt: string;
  readAt: string | null;
  href: string | null;
};

type NavbarClientProps = {
  currentUser: CurrentUser | null;
  notificationCount: number;
  dmUnreadCount: number;
  recentActivities: ActivityItem[];
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function useScrolled(threshold = 10) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > threshold);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

function NavDropdown({
  label,
  items,
  isActive,
  pathname,
}: {
  label: string;
  items: { href: string; label: string }[];
  isActive: boolean;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on navigation — adjusted at render on a pathname change rather than in
  // an effect.
  const [navPath, setNavPath] = useState(pathname);
  if (pathname !== navPath) {
    setNavPath(pathname);
    setOpen(false);
  }

  function handleEnter() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  function handleLeave() {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  }

  return (
    <div ref={ref} className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`relative flex items-center gap-1 rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition-colors ${
          isActive ? "text-white" : "text-slate-300 hover:text-white"
        }`}
      >
        {isActive && (
          <motion.span
            layoutId="nav-indicator"
            className="absolute inset-0 rounded-lg bg-white/10"
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
          />
        )}
        <span className="relative z-10">{label}</span>
        <ChevronDown className={`relative z-10 h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full z-50 mt-1 min-w-40 overflow-hidden rounded-xl border border-white/10 bg-[#171a1f] p-1.5 shadow-xl"
          >
            {items.map((child) => {
              const active = pathname === child.href || pathname.startsWith(child.href + "/");
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                    active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"
                  }`}
                  onClick={() => setOpen(false)}
                >
                  {child.label}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function NavbarClient({ currentUser, notificationCount, dmUnreadCount, recentActivities }: NavbarClientProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const scrolled = useScrolled();
  const isAdministrator = currentUser?.roles.includes("ADMINISTRATOR") ?? false;

  // Close all menus on navigation — adjusted at render on a pathname change.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setIsOpen(false);
    setMenuOpen(false);
    setNotifOpen(false);
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!notifOpen) return;
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notifOpen]);

  const userInitials = useMemo(() => {
    if (!currentUser) {
      return "";
    }

    return initialsFromName(currentUser.name, currentUser.email);
  }, [currentUser]);

  // The navbar isn't a fixed height: the logo animates between h-20 and h-14 on
  // scroll, so it breathes between roughly 93px and 69px. The admin sidebar is
  // pinned beneath it and used to guess 64px, which left the navbar covering the
  // top of the sidebar. Publish the real height instead of making anyone guess.
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const publish = () =>
      document.documentElement.style.setProperty("--nav-h", `${el.getBoundingClientRect().height}px`);

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.header
      ref={headerRef}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={`sticky top-0 z-50 text-white transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-asphalt/80 backdrop-blur-xl shadow-lg"
          : "border-b border-white/10 bg-asphalt"
      }`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-1.5 sm:px-6 lg:px-8">
        <Link href="/" aria-label="District 76 home">
          <img
            src="/images/logo.png"
            alt="District 76 Riders"
            className={`w-auto transition-all duration-300 ${scrolled ? "h-14" : "h-20"}`}
          />
        </Link>

        {/* Logged-in riders navigate via the persistent app rail, so the top nav
            collapses to brand + search + alerts + account for them. */}
        {!currentUser && (
        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Main navigation">
          {navItems.map((item) => {
            if ("href" in item) {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-lg px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.14em] transition-colors ${
                    isActive ? "text-white" : "text-slate-300 hover:text-white"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="nav-indicator"
                      className="absolute inset-0 rounded-lg bg-white/10"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                  <span className="relative z-10">{item.label}</span>
                </Link>
              );
            }

            const isChildActive = item.children.some((child) => pathname === child.href || pathname.startsWith(child.href + "/"));
            return (
              <NavDropdown
                key={item.label}
                label={item.label}
                items={item.children}
                isActive={isChildActive}
                pathname={pathname}
              />
            );
          })}
        </nav>
        )}

        <div className="relative flex items-center gap-3">
          {currentUser ? (
            <>
              <Link
                href="/search"
                className="hidden rounded-full p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:block"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </Link>
              <div ref={notifRef} className="relative hidden lg:block">
                <button
                  type="button"
                  onClick={() => setNotifOpen((v) => !v)}
                  className="relative rounded-full p-2 text-slate-300 transition hover:bg-white/10 hover:text-white"
                  aria-label="Open notifications"
                  aria-expanded={notifOpen}
                >
                  <Bell className="h-4 w-4" />
                  {notificationCount > 0 ? (
                    <span className="absolute -right-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-sunset px-1 text-[0.6rem] font-bold leading-4 text-white">
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </span>
                  ) : null}
                </button>

                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-xl border border-white/10 bg-asphalt shadow-xl"
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                        <h3 className="text-sm font-bold text-white">Notifications</h3>
                        {notificationCount > 0 && (
                          <button
                            type="button"
                            onClick={async () => {
                              await markAllReadAction();
                              setNotifOpen(false);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 transition hover:text-white"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Mark all read
                          </button>
                        )}
                      </div>

                      {/* Activity list */}
                      <div className="max-h-96 overflow-y-auto">
                        {recentActivities.length === 0 ? (
                          <div className="px-4 py-8 text-center text-sm text-slate-400">
                            No notifications yet.
                          </div>
                        ) : (
                          recentActivities.map((item) => {
                            const body = (
                              <>
                                <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-sunset" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-white">{item.summary}</p>
                                  <p className="mt-0.5 text-[0.65rem] uppercase tracking-wide text-slate-400">{item.type}</p>
                                  <p className="mt-0.5 text-xs text-slate-500">{timeAgo(item.createdAt)}</p>
                                </div>
                                {!item.readAt && (
                                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                                )}
                              </>
                            );
                            const cls = "flex items-start gap-3 border-b border-white/5 px-4 py-3 last:border-0";
                            return item.href ? (
                              <Link key={item.id} href={item.href} onClick={() => setNotifOpen(false)} className={`${cls} transition hover:bg-white/5`}>
                                {body}
                              </Link>
                            ) : (
                              <div key={item.id} className={cls}>
                                {body}
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Footer */}
                      <div className="border-t border-white/10 px-4 py-2.5 text-center">
                        <Link
                          href="/notifications"
                          className="text-xs font-semibold text-slate-400 transition hover:text-white"
                          onClick={() => setNotifOpen(false)}
                        >
                          View all notifications
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="button"
                className="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white lg:inline-flex"
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
                    <Link href={`/r/${currentUser.handle}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
                      <UserRound className="h-4 w-4 text-slate-300" />
                      <span>{currentUser.name || "Rider"}</span>
                    </Link>
                    <Link href={`/r/${currentUser.handle}?tab=garage`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
                      <Bike className="h-4 w-4 text-slate-300" />
                      <span>Garage</span>
                    </Link>
                    <Link href={`/r/${currentUser.handle}?tab=garage`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
                      <Wrench className="h-4 w-4 text-slate-300" />
                      <span>Gear</span>
                    </Link>
                    <Link href="/events/new" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
                      <CalendarPlus2 className="h-4 w-4 text-slate-300" />
                      <span>Create Event</span>
                    </Link>
                    <Link href="/messages" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
                      <MessageSquare className="h-4 w-4 text-slate-300" />
                      <span>Messages</span>
                      {dmUnreadCount > 0 && (
                        <span className="ml-auto rounded-full bg-sunset px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
                          {dmUnreadCount > 99 ? "99+" : dmUnreadCount}
                        </span>
                      )}
                    </Link>
                    <Link href="/saved" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
                      <Bookmark className="h-4 w-4 text-slate-300" />
                      <span>Saved</span>
                    </Link>
                    <Link href="/account" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
                      <UserCog className="h-4 w-4 text-slate-300" />
                      <span>Account</span>
                    </Link>
                    <Link href="/settings" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
                      <Settings className="h-4 w-4 text-slate-300" />
                      <span>Settings</span>
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
              {navItems.map((item) => {
                if ("href" in item) {
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-lg px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] ${
                        pathname === item.href ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      {item.label}
                    </Link>
                  );
                }

                return (
                  <div key={item.label}>
                    <p className="px-3 pt-3 pb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">{item.label}</p>
                    {item.children.map((child) => (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`rounded-lg px-3 py-2 pl-6 text-sm font-medium ${
                          pathname === child.href ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5"
                        }`}
                        onClick={() => setIsOpen(false)}
                      >
                        {child.label}
                      </Link>
                    ))}
                  </div>
                );
              })}

              {currentUser ? (
                <>
                  <Link
                    href={`/r/${currentUser.handle}`}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
                    onClick={() => setIsOpen(false)}
                  >
                    Profile
                  </Link>
                  <Link
                    href={`/r/${currentUser.handle}?tab=garage`}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
                    onClick={() => setIsOpen(false)}
                  >
                    Garage
                  </Link>
                  <Link
                    href={`/r/${currentUser.handle}?tab=garage`}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
                    onClick={() => setIsOpen(false)}
                  >
                    Gear
                  </Link>
                  <Link
                    href="/notifications"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
                    onClick={() => setIsOpen(false)}
                  >
                    Notifications
                  </Link>
                  <Link
                    href="/events/new"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
                    onClick={() => setIsOpen(false)}
                  >
                    Create Event
                  </Link>
                  <Link
                    href="/messages"
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
                    onClick={() => setIsOpen(false)}
                  >
                    Messages
                    {dmUnreadCount > 0 && (
                      <span className="rounded-full bg-sunset px-1.5 py-0.5 text-[0.65rem] font-bold text-white">
                        {dmUnreadCount > 99 ? "99+" : dmUnreadCount}
                      </span>
                    )}
                  </Link>
                  <Link
                    href="/saved"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
                    onClick={() => setIsOpen(false)}
                  >
                    Saved
                  </Link>
                  <Link
                    href="/account"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
                    onClick={() => setIsOpen(false)}
                  >
                    Account
                  </Link>
                  <Link
                    href="/settings"
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5"
                    onClick={() => setIsOpen(false)}
                  >
                    Settings
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
    </motion.header>
  );
}
