"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, UserRound, Bike, CalendarPlus2, LogOut, Shield, Bell, BellRing, Bookmark, MessageSquare, Search, Wrench, CheckCheck, UserCog, Settings, Plus, Rss, Newspaper, Route } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { logoutAction } from "@/app/(site)/(auth)/actions";
import { markActivityReadAction, markAllReadAction } from "@/app/(site)/notifications/actions";
import { MobileNav } from "@/components/layout/mobile-nav";
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
  const pathname = usePathname() ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const createRef = useRef<HTMLDivElement>(null);
  const scrolled = useScrolled();
  const isAdministrator = currentUser?.roles.includes("ADMINISTRATOR") ?? false;

  // Close all menus on navigation — adjusted at render on a pathname change.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMenuOpen(false);
    setNotifOpen(false);
    setCreateOpen(false);
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

  useEffect(() => {
    if (!createOpen) return;
    function handleClick(e: MouseEvent) {
      if (createRef.current && !createRef.current.contains(e.target as Node)) {
        setCreateOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [createOpen]);

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
      // safe-pt is the site-wide half of the PWA fix: the header is the only
      // thing anchored to the top of the viewport, so insetting it pushes every
      // page below the status bar. Its background still runs edge to edge, which
      // is what black-translucent expects. --nav-h is measured off this element,
      // so the app rail and admin sidebar follow the new height on their own.
      className={`safe-pt sticky top-0 z-50 text-white transition-all duration-300 ${
        scrolled
          ? "border-b border-white/10 bg-asphalt/80 backdrop-blur-xl shadow-lg"
          : "border-b border-white/10 bg-asphalt"
      }`}
    >
      <div className="flex w-full items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
        <Link href="/" aria-label="District 76 home" className="shrink-0">
          <img
            src="/images/logo.png"
            alt="District 76 Riders"
            className={`w-auto transition-all duration-300 ${scrolled ? "h-10" : "h-12"}`}
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

        {/* Center search bar for signed-in riders — matches the app shell */}
        {currentUser && (
          <form
            action="/search"
            className="mr-auto hidden w-full max-w-md items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.07] px-4 py-2 transition focus-within:border-white/25 lg:flex"
          >
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              name="q"
              type="search"
              placeholder="Search riders, roads, events…"
              className="w-full bg-transparent text-sm text-white placeholder:text-slate-400 focus:outline-none"
            />
          </form>
        )}

        <div className="relative flex items-center gap-3">
          {currentUser ? (
            <>
              <div ref={createRef} className="relative hidden lg:block">
                <button
                  type="button"
                  onClick={() => setCreateOpen((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-sunset px-3.5 py-2 text-sm font-bold text-white transition hover:bg-[#cf5a26]"
                  aria-expanded={createOpen}
                  aria-label="Create"
                >
                  <Plus className="h-4 w-4" /> Create
                </button>
                <AnimatePresence>
                  {createOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-asphalt p-1.5 shadow-xl"
                    >
                      <Link href="/feed" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10">
                        <Rss className="h-4 w-4 text-sunset" /> Share a ride
                      </Link>
                      {currentUser ? (
                        <Link href={`/r/${currentUser.handle}?log=ride`} className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10">
                          <Bike className="h-4 w-4 text-sunset" /> Log a ride
                        </Link>
                      ) : null}
                      <Link href="/events/new" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10">
                        <CalendarPlus2 className="h-4 w-4 text-sunset" /> New event
                      </Link>
                      <Link href="/roads?new=1" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10">
                        <Route className="h-4 w-4 text-sunset" /> New road
                      </Link>
                      <Link href="/magazine/new" className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-200 transition hover:bg-white/10">
                        <Newspaper className="h-4 w-4 text-sunset" /> New article
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
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
                            const cls = "flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left last:border-0";
                            // Opening a notification is what "seeing it" means —
                            // clearing the badge shouldn't need a separate action.
                            const open = () => {
                              setNotifOpen(false);
                              if (!item.readAt) void markActivityReadAction(item.id);
                            };
                            return item.href ? (
                              <Link key={item.id} href={item.href} onClick={open} className={`${cls} transition hover:bg-white/5`}>
                                {body}
                              </Link>
                            ) : (
                              <button
                                key={item.id}
                                type="button"
                                onClick={open}
                                disabled={!!item.readAt}
                                className={`${cls} transition hover:bg-white/5 disabled:cursor-default disabled:hover:bg-transparent`}
                              >
                                {body}
                              </button>
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
                    <Link href={`/r/${currentUser.handle}?tab=garage&sub=gear`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-200 hover:bg-white/10">
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

          {/* Signed-out riders had no visible way in on mobile — Log In and Join
              were both lg-only, leaving just the logo and a hamburger. */}
          {!currentUser && (
            <div className="flex items-center gap-2 lg:hidden">
              <Link
                href="/login"
                className="rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-white active:bg-white/10"
              >
                Log In
              </Link>
              <Link
                href="/join"
                className="rounded-md bg-sunset px-3 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-white active:bg-[#cf5a26]"
              >
                Join
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile navigation is a bottom tab bar + sheets, not a drawer hanging
          off the top of the screen. */}
      <MobileNav
        currentUser={currentUser}
        notificationCount={notificationCount}
        dmUnreadCount={dmUnreadCount}
        isAdministrator={isAdministrator}
        userInitials={userInitials}
        pathname={pathname}
      />
    </motion.header>
  );
}
