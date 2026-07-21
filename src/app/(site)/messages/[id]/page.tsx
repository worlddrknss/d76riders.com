import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Ban, RotateCcw } from "lucide-react";

import { blockRiderAction, unblockRiderAction } from "@/app/(site)/messages/actions";
import { DmThread } from "@/components/messages/dm-thread";
import { getBlockState, otherParticipant } from "@/lib/dm";
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
        select: { id: true, body: true, senderId: true, createdAt: true, readAt: true, imageUrl: true },
      },
    },
  });
  if (!convo || otherParticipant(convo, me.id) === null) notFound();

  const other = convo.riderAId === me.id ? convo.riderB : convo.riderA;
  const avatar = mediaUrl(other.avatarUrl);
  const { iBlocked, blockedByThem } = await getBlockState(me.id, other.id);
  const canSend = !iBlocked && !blockedByThem;
  const blockedNote = iBlocked
    ? `You blocked ${other.name}. Unblock to message again.`
    : "You can't reply to this conversation.";
  const initialMessages = convo.messages.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
    readAt: m.readAt?.toISOString() ?? null,
  }));

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

          {iBlocked ? (
            <form action={unblockRiderAction.bind(null, id)} className="ml-auto">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-ink/30 hover:text-ink"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Unblock
              </button>
            </form>
          ) : (
            <form action={blockRiderAction.bind(null, id)} className="ml-auto">
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-muted transition hover:border-red-300 hover:text-red-600"
              >
                <Ban className="h-3.5 w-3.5" /> Block
              </button>
            </form>
          )}
        </div>

        <DmThread
          conversationId={id}
          viewerId={me.id}
          otherName={other.name}
          initialMessages={initialMessages}
          canSend={canSend}
          blockedNote={blockedNote}
        />
      </div>
    </section>
  );
}
