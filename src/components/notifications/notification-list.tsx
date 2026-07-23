"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { BellRing, Check, CheckCheck } from "lucide-react";
import type { ActivityType } from "@prisma/client";

import { markActivityReadAction, markAllReadAction } from "@/app/(site)/notifications/actions";
import { ACTIVITY_STYLES } from "@/components/profile/activity-feed";

export type NotificationItem = {
  id: string;
  type: ActivityType;
  summary: string;
  /** Already formatted in the viewer's timezone by the server. */
  timeLabel: string;
  isUnread: boolean;
  href: string | null;
};

const FALLBACK = { icon: BellRing, tint: "text-sunset bg-sunset/10" };

/**
 * The notifications inbox.
 *
 * Every item is actionable: clicking one marks it read and, where the activity
 * points at something that still exists, opens it. Previously only three of the
 * ~25 activity types linked anywhere and nothing was ever markable except the
 * bell dropdown's "mark all" — which mobile never saw, because that dropdown is
 * desktop-only. There was no way to clear a notification on a phone at all.
 *
 * Read state updates optimistically. The action is fire-and-forget from a
 * client-side navigation, which keeps the JS context alive, so the request
 * completes even as the destination page loads.
 */
export function NotificationList({
  items,
  unreadCount,
}: {
  items: NotificationItem[];
  unreadCount: number;
}) {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [allRead, setAllRead] = useState(false);
  const [, startTransition] = useTransition();

  const remaining = allRead ? 0 : Math.max(0, unreadCount - readIds.size);

  function markOne(item: NotificationItem) {
    if (!item.isUnread || readIds.has(item.id) || allRead) return;
    setReadIds((prev) => new Set(prev).add(item.id));
    startTransition(async () => {
      await markActivityReadAction(item.id);
    });
  }

  function markAll() {
    setAllRead(true);
    startTransition(async () => {
      await markAllReadAction();
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-canvas p-10 text-center">
        <BellRing className="mx-auto h-8 w-8 text-muted/50" />
        <p className="mt-3 text-sm text-muted">Nothing yet. Rides, replies and reactions land here.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted">
          {remaining > 0 ? `${remaining} unread` : "All caught up"}
        </p>
        {remaining > 0 ? (
          <button
            type="button"
            onClick={markAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-sunset/50 hover:text-sunset"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        ) : null}
      </div>

      <div className="mt-4 space-y-2">
        {items.map((item) => {
          const style = ACTIVITY_STYLES[item.type] ?? FALLBACK;
          const Icon = style.icon;
          const unread = item.isUnread && !readIds.has(item.id) && !allRead;

          const inner = (
            <div className="flex items-start gap-3">
              <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full ${style.tint}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${unread ? "font-semibold text-ink" : "text-muted"}`}>{item.summary}</p>
                <p className="mt-0.5 text-xs text-muted">{item.timeLabel}</p>
              </div>
              {unread ? (
                <span aria-label="Unread" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-sunset" />
              ) : null}
            </div>
          );

          const shell = `block w-full rounded-xl border px-4 py-3 text-left transition ${
            unread ? "border-sunset/30 bg-sunset/5" : "border-border bg-surface"
          } hover:border-sunset/40`;

          // Linkable items navigate and mark read; the rest still mark read, so
          // nothing is stuck unread just because it has nowhere to point.
          return item.href ? (
            <Link key={item.id} href={item.href} onClick={() => markOne(item)} className={shell}>
              {inner}
            </Link>
          ) : (
            <button
              key={item.id}
              type="button"
              onClick={() => markOne(item)}
              disabled={!unread}
              className={`${shell} disabled:cursor-default disabled:hover:border-border`}
            >
              {inner}
            </button>
          );
        })}
      </div>

      {remaining === 0 && items.length > 0 ? (
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
          <Check className="h-3.5 w-3.5 text-forest" />
          Nothing unread
        </p>
      ) : null}
    </>
  );
}
