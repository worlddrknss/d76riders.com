import Link from "next/link";
import { Award, Bike, BookText, Bookmark, CalendarDays, MessageSquare, Users } from "lucide-react";

import { mediaUrl } from "@/lib/media-url";

/** Left rail of the home feed — the rider's identity + quick nav. */
export function FeedLeftRail({
  viewer,
}: {
  viewer: { name: string; handle: string; avatarUrl: string | null };
}) {
  const avatar = mediaUrl(viewer.avatarUrl);
  const links = [
    { href: `/r/${viewer.handle}`, label: "My Profile", icon: Bike },
    { href: `/r/${viewer.handle}?tab=journal`, label: "My Journal", icon: BookText },
    { href: `/r/${viewer.handle}?tab=garage`, label: "My Garage", icon: Bike },
    { href: "/messages", label: "Messages", icon: MessageSquare },
    { href: "/saved", label: "Saved", icon: Bookmark },
    { href: "/events", label: "Events", icon: CalendarDays },
    { href: "/r", label: "Riders", icon: Users },
    { href: "/ambassadors", label: "Ambassadors", icon: Award },
  ];

  return (
    <div className="sticky top-24 space-y-2">
      <Link
        href={`/r/${viewer.handle}`}
        className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 shadow-soft transition hover:border-sunset/30"
      >
        {avatar ? (
          <img src={avatar} alt={viewer.name} className="h-11 w-11 rounded-full object-cover" />
        ) : (
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sunset/15 text-lg font-bold text-sunset">
            {viewer.name.charAt(0)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{viewer.name}</p>
          <p className="truncate text-xs text-muted">@{viewer.handle}</p>
        </div>
      </Link>

      <nav className="rounded-xl border border-border bg-surface p-2 shadow-soft">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.label}
              href={l.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-ink transition hover:bg-canvas"
            >
              <Icon className="h-4 w-4 text-sunset" />
              {l.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
