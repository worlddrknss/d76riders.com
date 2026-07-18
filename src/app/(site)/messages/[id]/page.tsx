import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

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

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const currentUser = await getCurrentUser();
  if (!currentUser) redirect(`/login?next=/messages/${id}`);
  const me = await prisma.rider.findUnique({ where: { userId: currentUser.id }, select: { id: true } });
  if (!me) redirect("/login");

  const convo = await prisma.conversation.findUnique({
    where: { id },
    select: {
      riderAId: true,
      riderBId: true,
      riderA: { select: { id: true, name: true, handle: true, avatarUrl: true } },
      riderB: { select: { id: true, name: true, handle: true, avatarUrl: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        take: 200,
        select: { id: true, body: true, senderId: true, createdAt: true },
      },
    },
  });
  if (!convo || otherParticipant(convo, me.id) === null) notFound();

  const other = convo.riderAId === me.id ? convo.riderB : convo.riderA;
  const avatar = mediaUrl(other.avatarUrl);
  const initialMessages = convo.messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }));

  // Opening the thread clears the unread state.
  await prisma.directMessage.updateMany({
    where: { conversationId: id, senderId: { not: me.id }, readAt: null },
    data: { readAt: new Date() },
  });

  return (
    <section className="page-shell">
      <div className="content-wrap mx-auto max-w-2xl space-y-4">
        <div className="flex items-center gap-3">
          <Link href="/messages" className="text-muted hover:text-ink" aria-label="Back to messages">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Link href={`/r/${other.handle}`} className="flex items-center gap-2">
            {avatar ? (
              <img src={avatar} alt={other.name} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sunset/15 text-sm font-bold text-sunset">
                {other.name.charAt(0)}
              </span>
            )}
            <span className="font-semibold text-ink">{other.name}</span>
          </Link>
        </div>

        <DmThread
          conversationId={id}
          viewerId={me.id}
          otherName={other.name}
          initialMessages={initialMessages}
        />
      </div>
    </section>
  );
}
