"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Award,
  Bookmark,
  CalendarDays,
  ChevronDown,
  Flag,
  GraduationCap,
  HeartPulse,
  Images,
  LayoutDashboard,
  LogOut,
  MapPinned,
  MessageSquare,
  MoreHorizontal,
  Newspaper,
  Route,
  Rss,
  Settings,
  Shield,
  ShoppingBag,
  Star,
  Store,
  Trophy,
  User,
  Users,
  Warehouse,
} from "lucide-react";

import { logoutAction } from "@/app/(site)/(auth)/actions";

type Item = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean; badge?: number; tab?: string };

/**
 * The persistent left navigation rail for the authenticated app shell. Client
 * component so it can highlight the active destination via the current path.
 * The server wrapper (app-rail.tsx) feeds it identity + unread counts.
 */
export function AppRailNav({
  name,
  handle,
  avatarUrl,
  trustLevel,
  unreadDms,
  rides,
  miles,
}: {
  name: string;
  handle: string;
  avatarUrl: string | null;
  trustLevel: string | null;
  unreadDms: number;
  rides: number;
  miles: number;
}) {
  const pathname = usePathname() ?? "";
  const params = useSearchParams();
  const [moreOpen, setMoreOpen] = useState(false);

  const tab = params?.get("tab") ?? null;
  const isActive = (item: Item) => {
    if (item.tab !== undefined) return pathname === item.href.split("?")[0] && tab === item.tab;
    const base = item.href.split("?")[0];
    // A profile link is only active on its own page with no garage tab selected.
    if (base === `/r/${handle}` && item.tab === undefined) return pathname === base && tab !== "garage";
    if (item.exact) return pathname === base;
    return pathname === base || pathname.startsWith(base + "/");
  };

  const you: Item[] = [
    { href: "/", label: "Home", icon: LayoutDashboard, exact: true },
    { href: "/feed", label: "Feed", icon: Rss },
    { href: `/r/${handle}`, label: "My Profile", icon: User },
    { href: `/r/${handle}?tab=garage`, label: "Garage", icon: Warehouse, tab: "garage" },
  ];
  const community: Item[] = [
    { href: "/events", label: "Events", icon: CalendarDays },
    { href: "/roads", label: "Roads", icon: Route },
    { href: "/nearby", label: "Nearby", icon: MapPinned },
    { href: "/marketplace", label: "Marketplace", icon: ShoppingBag },
    { href: "/shops", label: "Shops & Sponsors", icon: Store },
    { href: "/r", label: "Riders", icon: Users, exact: true },
  ];
  const inbox: Item[] = [
    { href: "/messages", label: "Messages", icon: MessageSquare, badge: unreadDms },
    { href: "/saved", label: "Saved", icon: Bookmark },
  ];
  const more: Item[] = [
    { href: "/sub-communities", label: "Sub-communities", icon: Users },
    { href: "/mentors", label: "Mentors", icon: GraduationCap },
    { href: "/challenges", label: "Challenges", icon: Flag },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
    { href: "/ride-of-the-month", label: "Ride of the Month", icon: Star },
    { href: "/magazine", label: "Magazine", icon: Newspaper },
    { href: "/gallery", label: "Gallery", icon: Images },
    { href: "/ambassadors", label: "Ambassadors", icon: Award },
    { href: "/safety", label: "Ride Safety", icon: Shield },
    { href: "/emergency-response", label: "Emergency Response", icon: HeartPulse },
  ];

  const renderItem = (item: Item) => {
    const Icon = item.icon;
    const active = isActive(item);
    return (
      <Link
        key={item.label}
        href={item.href}
        className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition ${
          active ? "bg-sunset/10 text-[#cf5a26]" : "text-ink hover:bg-canvas"
        }`}
      >
        {active && <span className="absolute inset-y-2 left-0.5 w-[3px] rounded-full bg-sunset" />}
        <Icon className={`h-[18px] w-[18px] ${active ? "text-sunset" : "text-muted"}`} />
        {item.label}
        {item.badge ? (
          <span className="ml-auto grid h-[18px] min-w-[18px] place-items-center rounded-full bg-sunset px-[5px] text-[0.68rem] font-bold text-white">
            {item.badge}
          </span>
        ) : null}
      </Link>
    );
  };

  const groupLabel = "px-2.5 pb-1 pt-2.5 text-[0.64rem] font-bold uppercase tracking-[0.14em] text-muted";

  return (
    <nav className="flex max-h-[calc(100dvh-var(--nav-h,5.5rem)-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      {/* Identity */}
      <Link href={`/r/${handle}`} className="flex shrink-0 items-center gap-3 px-3.5 pb-3 pt-4 transition hover:bg-canvas">
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="h-[46px] w-[46px] shrink-0 rounded-full object-cover" />
        ) : (
          <span className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-full bg-sunset/15 font-display text-lg text-sunset">
            {name.charAt(0)}
          </span>
        )}
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[0.92rem] font-bold leading-tight text-ink">{name}</span>
          <span className="truncate text-xs text-muted">@{handle}</span>
        </span>
      </Link>
      <div className="flex shrink-0 flex-wrap items-center gap-x-2.5 gap-y-1 px-3.5 pb-3 text-xs text-muted">
        <span><b className="font-semibold text-ink">{rides}</b> rides</span>
        <span><b className="font-semibold text-ink">{miles.toLocaleString()}</b> mi</span>
        {trustLevel && (
          <span className="font-semibold text-forest">{trustLevel.charAt(0) + trustLevel.slice(1).toLowerCase()}</span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-border p-2">
        <p className={groupLabel}>You</p>
        {you.map(renderItem)}
        <p className={groupLabel}>Community</p>
        {community.map(renderItem)}
        <p className={groupLabel}>Inbox</p>
        {inbox.map(renderItem)}

        <button
          type="button"
          onClick={() => setMoreOpen((v) => !v)}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-ink transition hover:bg-canvas"
        >
          <MoreHorizontal className="h-[18px] w-[18px] text-muted" /> More
          <ChevronDown className={`ml-auto h-4 w-4 text-muted transition-transform ${moreOpen ? "rotate-180" : ""}`} />
        </button>
        {moreOpen && (
          <div>
            <p className={groupLabel}>Explore</p>
            {more.map(renderItem)}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-border p-2">
        {renderItem({ href: "/settings", label: "Settings", icon: Settings })}
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold text-muted transition hover:bg-canvas"
          >
            <LogOut className="h-[18px] w-[18px] text-muted" /> Log out
          </button>
        </form>
        <div className="px-3 pb-1 pt-1.5 text-[0.72rem] text-muted">
          <Link href="/about" className="hover:text-[#cf5a26]">About</Link>
          <span className="px-1">·</span>
          <Link href="/policies" className="hover:text-[#cf5a26]">Policies</Link>
        </div>
      </div>
    </nav>
  );
}
