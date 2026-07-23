import type { ComponentType } from "react";
import Link from "next/link";
import {
  AtSign,
  Award,
  Bike,
  CalendarDays,
  CalendarX,
  CheckCircle2,
  Flag,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  PenLine,
  Settings2,
  Sparkles,
  TriangleAlert,
  UserPlus,
  Wrench,
} from "lucide-react";

import type { ActivityType } from "@prisma/client";
import { TwoWheelsDownIcon } from "@/components/ui/two-wheels-down-icon";

export type ActivityFeedItem = {
  id: string;
  type: ActivityType;
  summary: string;
  createdAt: Date;
};

// Each activity kind gets an icon + accent so the feed reads at a glance — the
// same visual language as the mockups, in d76's sunset/forest palette.
const STYLES: Partial<Record<ActivityType, { icon: ComponentType<{ className?: string }>; tint: string }>> = {
  ADDED_BIKE: { icon: Bike, tint: "text-sunset bg-sunset/10" },
  ADDED_MODIFICATION: { icon: Settings2, tint: "text-sunset bg-sunset/10" },
  LOGGED_SERVICE: { icon: Wrench, tint: "text-asphalt bg-asphalt/5" },
  UPLOADED_PHOTO: { icon: ImageIcon, tint: "text-forest bg-forest/10" },
  POSTED_JOURNAL: { icon: PenLine, tint: "text-sunset bg-sunset/10" },
  CREATED_EVENT: { icon: CalendarDays, tint: "text-sunset bg-sunset/10" },
  RSVP: { icon: CalendarDays, tint: "text-forest bg-forest/10" },
  RSVP_WAITLISTED: { icon: CalendarDays, tint: "text-muted bg-asphalt/5" },
  WAITLIST_PROMOTED: { icon: CheckCircle2, tint: "text-forest bg-forest/10" },
  COMPLETED_RIDE: { icon: Flag, tint: "text-forest bg-forest/10" },
  CHECK_IN: { icon: MapPin, tint: "text-forest bg-forest/10" },
  CHECK_OUT: { icon: MapPin, tint: "text-muted bg-asphalt/5" },
  EVENT_UPDATED: { icon: CalendarDays, tint: "text-sunset bg-sunset/10" },
  EVENT_CANCELLED: { icon: CalendarX, tint: "text-red-600 bg-red-500/10" },
  FOLLOWED_RIDER: { icon: UserPlus, tint: "text-sunset bg-sunset/10" },
  FAVORITED_BUILD: { icon: Sparkles, tint: "text-sunset bg-sunset/10" },
  BADGE_EARNED: { icon: Award, tint: "text-sunset bg-sunset/10" },
  SKILL_VERIFIED: { icon: CheckCircle2, tint: "text-forest bg-forest/10" },
  TWO_WHEELS_DOWN: { icon: TwoWheelsDownIcon, tint: "text-forest bg-forest/10" },
  COMMENTED: { icon: MessageCircle, tint: "text-sunset bg-sunset/10" },
  MENTIONED: { icon: AtSign, tint: "text-sunset bg-sunset/10" },
  JOINED: { icon: Sparkles, tint: "text-sunset bg-sunset/10" },
  HAZARD_REPORTED: { icon: TriangleAlert, tint: "text-sunset bg-sunset/10" },
  RIDER_DOWN: { icon: TriangleAlert, tint: "text-red-600 bg-red-500/10" },
};

const FALLBACK = { icon: Sparkles, tint: "text-muted bg-asphalt/5" } as const;

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function ActivityFeed({
  items,
  viewAllHref,
}: {
  items: ActivityFeedItem[];
  viewAllHref?: string;
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface shadow-soft">
      <header className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Activity Feed</h2>
        {viewAllHref && items.length > 0 && (
          <Link href={viewAllHref} className="text-sm font-medium text-sunset hover:underline">
            View all
          </Link>
        )}
      </header>

      {items.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-muted sm:px-6">
          No activity yet. Rides, builds, and posts show up here.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => {
            const style = STYLES[item.type] ?? FALLBACK;
            const Icon = style.icon;
            return (
              <li key={item.id} className="flex items-start gap-4 px-5 py-4 sm:px-6">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${style.tint}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-snug text-ink">{item.summary}</p>
                  <p className="mt-1 text-xs text-muted">{formatDate(item.createdAt)}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
