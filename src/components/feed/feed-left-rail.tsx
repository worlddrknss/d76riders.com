import Link from "next/link";
import { Award, Bike, BookText, Bookmark, CalendarDays, MessageSquare, Users } from "lucide-react";

/** Quick-nav card for the home feed's left sidebar. */
export function FeedLeftRail({ handle }: { handle: string }) {
  const links = [
    { href: `/r/${handle}`, label: "My Profile", icon: Bike },
    { href: `/r/${handle}?tab=garage`, label: "My Garage", icon: Bike },
    { href: "/messages", label: "Messages", icon: MessageSquare },
    { href: "/saved", label: "Saved", icon: Bookmark },
    { href: "/events", label: "Events", icon: CalendarDays },
    { href: "/r", label: "Riders", icon: Users },
    { href: "/ambassadors", label: "Ambassadors", icon: Award },
    { href: "/magazine", label: "Magazine", icon: BookText },
  ];

  return (
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
  );
}
