"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Bike,
  Bookmark,
  CalendarDays,
  CalendarPlus2,
  ChevronRight,
  Home,
  LogOut,
  MessageSquare,
  MoreHorizontal,
  Newspaper,
  Plus,
  Route as RouteIcon,
  Rss,
  Settings as SettingsIcon,
  Shield,
  UserCog,
  Users,
} from "lucide-react";

import { logoutAction } from "@/app/(site)/(auth)/actions";
import { navItems, type NavItem } from "@/data/community";
import { type CurrentUser } from "@/lib/session";

type MobileNavProps = {
  currentUser: (CurrentUser & { avatarUrl: string | null }) | null;
  notificationCount: number;
  dmUnreadCount: number;
  isAdministrator: boolean;
  userInitials: string;
  pathname: string;
};

type SheetKind = "more" | "create" | null;

// Never-changing subscription: this store only reports "are we on the client",
// which flips once at hydration and never again.
const subscribeNever = () => () => {};

const isGroup = (item: NavItem): item is Extract<NavItem, { children: unknown }> => "children" in item;
const isLink = (item: NavItem): item is Extract<NavItem, { href: string }> => "href" in item;

/**
 * A path is "current" when it's the page or an ancestor of it — compared by
 * segment, not by raw prefix, so /roads doesn't light up the /r (Riders) tab.
 */
function isCurrent(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

// The destinations that earn a permanent slot under the thumb. Everything else
// in navItems is reachable from the More sheet.
const TAB_HREFS = ["/", "/events", "/roads"] as const;
const TAB_META: Record<string, { label: string; icon: typeof Home }> = {
  "/": { label: "Home", icon: Home },
  "/events": { label: "Events", icon: CalendarDays },
  "/roads": { label: "Roads", icon: RouteIcon },
  "/r": { label: "Riders", icon: Users },
};

export function MobileNav({
  currentUser,
  notificationCount,
  dmUnreadCount,
  isAdministrator,
  userInitials,
  pathname,
}: MobileNavProps) {
  const [sheet, setSheet] = useState<SheetKind>(null);

  // Rendered through a portal on document.body. The navbar that mounts this is
  // a motion.header, and a transformed ancestor becomes the containing block
  // for position:fixed — which pinned the bar to the header and let it scroll
  // away instead of staying on the viewport.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false);

  // Close on navigation — adjusted at render on a pathname change rather than
  // in an effect, matching the other menus in the navbar.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setSheet(null);
  }

  // Lock the page behind the sheet and let Escape dismiss it.
  useEffect(() => {
    if (!sheet) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setSheet(null);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [sheet]);

  const close = () => setSheet(null);
  const groups = navItems.filter(isGroup);
  // Top-level destinations that didn't get a tab slot still need a home.
  const overflowTabs = navItems
    .filter(isLink)
    .filter((item) => !TAB_HREFS.includes(item.href as (typeof TAB_HREFS)[number]));
  const alertTotal = notificationCount + dmUnreadCount;

  // Signed-out riders can't post, so the centre slot is a plain destination for
  // them rather than a create button that would only bounce them to /login.
  const tabs = currentUser
    ? TAB_HREFS.map((href) => ({ href, ...TAB_META[href] }))
    : [...TAB_HREFS, "/r"].map((href) => ({ href, ...TAB_META[href] }));

  if (!mounted) return null;

  return createPortal(
    <>
      {/* BOTTOM TAB BAR */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-asphalt/95 backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch">
          {tabs.slice(0, 2).map((tab) => (
            <Tab key={tab.href} {...tab} pathname={pathname} />
          ))}

          {/* Riders post from their phones — the create action gets the centre
              slot rather than living three taps deep in a menu. */}
          {currentUser && (
            <button
              type="button"
              onClick={() => setSheet("create")}
              aria-label="Create"
              aria-expanded={sheet === "create"}
              className="flex flex-1 flex-col items-center justify-center py-2"
            >
              <span
                className={`grid h-11 w-11 place-items-center rounded-full bg-sunset text-white shadow-lg shadow-sunset/25 transition ${
                  sheet === "create" ? "scale-95 bg-[#cf5a26]" : ""
                }`}
              >
                <Plus className="h-6 w-6" strokeWidth={2.5} />
              </span>
            </button>
          )}

          {tabs.slice(2).map((tab) => (
            <Tab key={tab.href} {...tab} pathname={pathname} />
          ))}

          <button
            type="button"
            onClick={() => setSheet("more")}
            aria-expanded={sheet === "more"}
            aria-label="More"
            className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-2 transition active:bg-white/5 ${
              sheet === "more" ? "text-sunset" : "text-slate-400"
            }`}
          >
            <MoreHorizontal className="h-[1.35rem] w-[1.35rem]" strokeWidth={sheet === "more" ? 2.4 : 1.8} />
            <span className="text-[0.65rem] font-semibold tracking-wide">More</span>
            {alertTotal > 0 && (
              <span className="absolute right-[24%] top-1.5 h-2 w-2 rounded-full bg-sunset ring-2 ring-asphalt" />
            )}
          </button>
        </div>
      </nav>

      {/* CREATE SHEET — mirrors the desktop Create menu. */}
      <Sheet open={sheet === "create"} onClose={close} label="Create">
        <h2 className="px-1 pb-1 font-display text-xl font-semibold text-white">Create</h2>
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/4">
          <CreateRow href="/feed" label="Share a ride" hint="Post an update or photos" icon={Rss} onNavigate={close} />
          {currentUser && (
            <CreateRow
              href={`/r/${currentUser.handle}?log=ride`}
              label="Log a ride"
              hint="Add it to your journal"
              icon={Bike}
              onNavigate={close}
              bordered
            />
          )}
          <CreateRow
            href="/events/new"
            label="New event"
            hint="Plan a group ride"
            icon={CalendarPlus2}
            onNavigate={close}
            bordered
          />
          <CreateRow
            href="/roads?new=1"
            label="New road"
            hint="Share a route worth riding"
            icon={RouteIcon}
            onNavigate={close}
            bordered
          />
          <CreateRow
            href="/magazine/new"
            label="New article"
            hint="Write for the magazine"
            icon={Newspaper}
            onNavigate={close}
            bordered
          />
        </div>
      </Sheet>

      {/* MORE SHEET */}
      <Sheet open={sheet === "more"} onClose={close} label="More navigation">
        {currentUser ? (
          <>
            <Link
              href={`/r/${currentUser.handle}`}
              onClick={close}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/4 p-3 transition active:bg-white/10"
            >
              {currentUser.avatarUrl ? (
                <img src={currentUser.avatarUrl} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sunset text-sm font-bold text-white">
                  {userInitials}
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.95rem] font-semibold text-white">
                  {currentUser.name || "Rider"}
                </span>
                <span className="block truncate text-xs text-slate-400">@{currentUser.handle}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
            </Link>

            <div className="grid grid-cols-4 gap-2">
              <QuickAction
                href="/messages"
                label="Messages"
                icon={MessageSquare}
                badge={dmUnreadCount}
                onNavigate={close}
              />
              <QuickAction
                href="/notifications"
                label="Alerts"
                icon={Bell}
                badge={notificationCount}
                onNavigate={close}
              />
              <QuickAction href="/saved" label="Saved" icon={Bookmark} onNavigate={close} />
              <QuickAction href="/settings" label="Settings" icon={SettingsIcon} onNavigate={close} />
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/login"
              onClick={close}
              className="flex min-h-12 items-center justify-center rounded-xl border border-white/20 text-sm font-semibold text-white transition active:bg-white/10"
            >
              Log In
            </Link>
            <Link
              href="/join"
              onClick={close}
              className="flex min-h-12 items-center justify-center rounded-xl bg-sunset text-sm font-semibold text-white transition active:bg-[#cf5a26]"
            >
              Join
            </Link>
          </div>
        )}

        {overflowTabs.length > 0 && (
          <LinkGroup label="Explore" items={overflowTabs} pathname={pathname} onNavigate={close} />
        )}

        {groups.map((group) => (
          <LinkGroup
            key={group.label}
            label={group.label}
            items={group.children}
            pathname={pathname}
            onNavigate={close}
          />
        ))}

        {currentUser && (
          <>
            <section>
              <h3 className="px-1 pb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
                Your Account
              </h3>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white/4">
                <AccountRow href="/account" label="Account" icon={UserCog} onNavigate={close} />
                {isAdministrator && (
                  <AccountRow href="/admin" label="Admin Console" icon={Shield} onNavigate={close} bordered />
                )}
              </div>
            </section>

            <form action={logoutAction}>
              <button
                type="submit"
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 text-sm font-semibold text-red-300 transition active:bg-red-500/10"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </form>
          </>
        )}
      </Sheet>
    </>,
    document.body,
  );
}

function Tab({
  href,
  label,
  icon: Icon,
  pathname,
}: {
  href: string;
  label: string;
  icon: typeof Home;
  pathname: string;
}) {
  const active = isCurrent(pathname, href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 transition active:bg-white/5 ${
        active ? "text-sunset" : "text-slate-400"
      }`}
    >
      <Icon className="h-[1.35rem] w-[1.35rem]" strokeWidth={active ? 2.4 : 1.8} />
      <span className="text-[0.65rem] font-semibold tracking-wide">{label}</span>
    </Link>
  );
}

/**
 * Shared bottom-sheet chrome: scrim, spring-in panel, drag-to-dismiss, and a
 * scroll area that stops above the home indicator.
 */
function Sheet({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-60 lg:hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            className="absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col rounded-t-2xl border-t border-white/12 bg-asphalt text-white shadow-2xl"
          >
            {/* The whole sheet is draggable — this is the affordance for it. */}
            <div className="flex shrink-0 cursor-grab justify-center py-3 active:cursor-grabbing">
              <span className="h-1 w-10 rounded-full bg-white/25" />
            </div>
            <div
              className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4"
              style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/** iOS-style grouped list: hairline-separated rows inside one rounded card. */
function LinkGroup({
  label,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  items: { href: string; label: string }[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <section>
      <h3 className="px-1 pb-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </h3>
      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/4">
        {items.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`flex min-h-12 items-center justify-between gap-3 px-4 py-3 text-[0.95rem] transition active:bg-white/10 ${
              i > 0 ? "border-t border-white/8" : ""
            } ${isCurrent(pathname, item.href) ? "text-sunset" : "text-slate-200"}`}
          >
            <span>{item.label}</span>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function CreateRow({
  href,
  label,
  hint,
  icon: Icon,
  bordered = false,
  onNavigate,
}: {
  href: string;
  label: string;
  hint: string;
  icon: typeof Plus;
  bordered?: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-4 py-3.5 transition active:bg-white/10 ${
        bordered ? "border-t border-white/8" : ""
      }`}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-sunset/15">
        <Icon className="h-4 w-4 text-sunset" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.95rem] font-medium text-white">{label}</span>
        <span className="block truncate text-xs text-slate-400">{hint}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
    </Link>
  );
}

function QuickAction({
  href,
  label,
  icon: Icon,
  badge = 0,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof Plus;
  badge?: number;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className="relative flex flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/4 p-3 text-slate-200 transition active:scale-95"
    >
      <Icon className="h-5 w-5" />
      <span className="text-[0.7rem] font-semibold">{label}</span>
      {badge > 0 && (
        <span className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-sunset px-1 text-center text-[0.6rem] font-bold leading-4 text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

function AccountRow({
  href,
  label,
  icon: Icon,
  bordered = false,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: typeof Plus;
  bordered?: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex min-h-12 items-center gap-3 px-4 py-3 text-[0.95rem] text-slate-200 transition active:bg-white/10 ${
        bordered ? "border-t border-white/8" : ""
      }`}
    >
      <Icon className="h-4 w-4 shrink-0 text-slate-400" />
      <span className="flex-1">{label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
    </Link>
  );
}
