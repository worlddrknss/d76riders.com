import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { DmThread } from "@/components/messages/dm-thread";
import { otherParticipant } from "@/lib/dm";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Messages — D76 Riders",
  robots: { index: false, follow: false },
};

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
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

  // Selected conversation: the ?c= param if it's one of mine, else the newest.
  const { c } = await searchParams;
  const selectedId = c && convos.some((v) => v.id === c) ? c : convos[0]?.id ?? null;

  let thread:
    | { other: { name: string; handle: string; avatarUrl: string | null }; initialMessages: ReturnType<typeof mapMessages> }
    | null = null;
  if (selectedId) {
    const convo = await prisma.conversation.findUnique({
      where: { id: selectedId },
      select: {
        riderAId: true,
        riderBId: true,
        riderA: { select: { id: true, name: true, handle: true, avatarUrl: true } },
        riderB: { select: { id: true, name: true, handle: true, avatarUrl: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 200,
          select: { id: true, body: true, senderId: true, createdAt: true, readAt: true, imageUrl: true },
        },
      },
    });
    if (convo && otherParticipant(convo, me.id) !== null) {
      const other = convo.riderAId === me.id ? convo.riderB : convo.riderA;
      await prisma.directMessage.updateMany({
        where: { conversationId: selectedId, senderId: { not: me.id }, readAt: null },
        data: { readAt: new Date() },
      });
      thread = { other, initialMessages: mapMessages(convo.messages) };
    }
  }

  return (
    <AppShell>
      <div className="mb-5 flex items-center gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sunset/10 text-sunset">
          <MessageSquare className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl text-ink">Messages</h1>
          <p className="text-sm text-muted">Direct messages with riders you both follow.</p>
        </div>
      </div>

      {convos.length === 0 ? (
        <div className="max-w-2xl rounded-xl border border-dashed border-border bg-canvas p-12 text-center">
          <MessageSquare className="mx-auto h-8 w-8 text-muted/50" />
          <p className="mt-3 text-sm text-muted">
            No conversations yet. Follow a rider who follows you back, then hit Message on their profile.
          </p>
        </div>
      ) : (
        <div className="grid min-h-[520px] overflow-hidden rounded-2xl border border-border bg-surface shadow-soft lg:grid-cols-[340px_minmax(0,1fr)]">
          {/* Conversation list */}
          <div className={`divide-y divide-border lg:border-r lg:border-border ${selectedId ? "hidden lg:block" : "block"}`}>
            {convos.map((cv) => {
              const other = cv.riderAId === me.id ? cv.riderB : cv.riderA;
              const last = cv.messages[0];
              const unread = Boolean(last && last.senderId !== me.id && !last.readAt);
              const avatar = mediaUrl(other.avatarUrl);
              const isActive = cv.id === selectedId;
              return (
                <Link
                  key={cv.id}
                  href={`/messages?c=${cv.id}`}
                  className={`flex items-center gap-3 px-4 py-3 transition hover:bg-canvas ${isActive ? "bg-sunset/8" : ""}`}
                >
                  {avatar ? (
                    <img src={avatar} alt={other.name} className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-sunset/15 text-base font-bold text-sunset">
                      {other.name.charAt(0)}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate ${unread ? "font-semibold text-ink" : "font-medium text-ink"}`}>{other.name}</p>
                    <p className={`truncate text-sm ${unread ? "text-ink" : "text-muted"}`}>
                      {last ? `${last.senderId === me.id ? "You: " : ""}${last.body || (last.imageUrl ? "📷 Photo" : "")}` : "No messages yet"}
                    </p>
                  </div>
                  {unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-sunset" />}
                </Link>
              );
            })}
          </div>

          {/* Thread pane */}
          <div className={`min-w-0 flex-col ${selectedId ? "flex" : "hidden lg:flex"}`}>
            {thread ? (
              <>
                <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                  <Link href="/messages" className="text-muted hover:text-ink lg:hidden" aria-label="Back to messages">
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                  <Link href={`/r/${thread.other.handle}`} className="flex items-center gap-2">
                    {mediaUrl(thread.other.avatarUrl) ? (
                      <img src={mediaUrl(thread.other.avatarUrl) ?? ""} alt={thread.other.name} className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sunset/15 text-sm font-bold text-sunset">
                        {thread.other.name.charAt(0)}
                      </span>
                    )}
                    <span className="font-semibold text-ink">{thread.other.name}</span>
                  </Link>
                </div>
                <div className="min-h-0 flex-1 p-4">
                  <DmThread
                    key={selectedId}
                    conversationId={selectedId!}
                    viewerId={me.id}
                    otherName={thread.other.name}
                    initialMessages={thread.initialMessages}
                  />
                </div>
              </>
            ) : (
              <div className="hidden flex-1 items-center justify-center p-10 text-center text-sm text-muted lg:flex">
                Select a conversation to start chatting.
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}

function mapMessages(
  messages: { id: string; body: string; senderId: string; createdAt: Date; readAt: Date | null; imageUrl: string | null }[],
) {
  return messages.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
  }));
}
