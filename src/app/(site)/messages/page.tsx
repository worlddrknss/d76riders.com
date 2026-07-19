import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";

import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Messages — D76 Riders",
  robots: { index: false, follow: false },
};

export default async function MessagesPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?next=/messages");
  const me = await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } });
  if (!me) redirect("/login");

  const convos = await prisma.conversation.findMany({
    where: { OR: [{ riderAId: me.id }, { riderBId: me.id }], messages: { some: {} } },
    orderBy: { lastMessageAt: "desc" },
    take: 50,
    select: {
      id: true,
      riderAId: true,
      riderA: { select: { name: true, handle: true, avatarUrl: true } },
      riderB: { select: { name: true, handle: true, avatarUrl: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, senderId: true, readAt: true, imageUrl: true },
      },
    },
  });

  return (
    <section className="page-shell">
      <div className="content-wrap mx-auto max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sunset/10 text-sunset">
            <MessageSquare className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink">Messages</h1>
            <p className="text-sm text-muted">Direct messages with riders you both follow.</p>
          </div>
        </div>

        {convos.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
            <MessageSquare className="mx-auto h-8 w-8 text-muted/50" />
            <p className="mt-3 text-sm text-muted">
              No conversations yet. Follow a rider who follows you back, then hit Message on their profile.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {convos.map((c) => {
              const other = c.riderAId === me.id ? c.riderB : c.riderA;
              const last = c.messages[0];
              const unread = Boolean(last && last.senderId !== me.id && !last.readAt);
              const avatar = mediaUrl(other.avatarUrl);
              return (
                <Link
                  key={c.id}
                  href={`/messages/${c.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-canvas"
                >
                  {avatar ? (
                    <img src={avatar} alt={other.name} className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sunset/15 text-base font-bold text-sunset">
                      {other.name.charAt(0)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate ${unread ? "font-semibold text-ink" : "font-medium text-ink"}`}>
                      {other.name}
                    </p>
                    <p className={`truncate text-sm ${unread ? "text-ink" : "text-muted"}`}>
                      {last
                        ? `${last.senderId === me.id ? "You: " : ""}${last.body || (last.imageUrl ? "📷 Photo" : "")}`
                        : "No messages yet"}
                    </p>
                  </div>
                  {unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-sunset" />}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
