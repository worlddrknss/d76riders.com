import { logActivityForRiders } from "@/lib/activity";
import { extractHashtags, extractHandles } from "@/lib/journal-tags";
import { prisma } from "@/lib/prisma";

/**
 * Reconcile a journal entry's stored hashtags and mentions with its body, and
 * notify anyone newly @mentioned. Called after create and after edit, so the
 * join tables always match the current text: a tag removed in an edit stops
 * showing on its /tags page, and a rider added in an edit gets pinged once (the
 * diff against existing mentions means editing never re-notifies people).
 */
export async function syncJournalTagsAndMentions(params: {
  entryId: string;
  body: string;
  authorId: string;
}): Promise<void> {
  const { entryId, body, authorId } = params;
  const tags = extractHashtags(body);
  const handles = extractHandles(body);

  // Only real riders become mentions — and never the author themselves.
  const riders = handles.length
    ? await prisma.rider.findMany({
        where: { handle: { in: handles }, id: { not: authorId } },
        select: { id: true },
      })
    : [];
  const mentionedIds = riders.map((r) => r.id);

  const existing = await prisma.journalMention.findMany({
    where: { entryId },
    select: { mentionedRiderId: true },
  });
  const existingIds = new Set(existing.map((m) => m.mentionedRiderId));
  const newlyMentioned = mentionedIds.filter((id) => !existingIds.has(id));

  await prisma.$transaction([
    prisma.journalHashtag.deleteMany({ where: { entryId } }),
    prisma.journalMention.deleteMany({ where: { entryId } }),
    ...(tags.length ? [prisma.journalHashtag.createMany({ data: tags.map((tag) => ({ entryId, tag })) })] : []),
    ...(mentionedIds.length
      ? [prisma.journalMention.createMany({ data: mentionedIds.map((id) => ({ entryId, mentionedRiderId: id })) })]
      : []),
  ]);

  if (newlyMentioned.length) {
    const author = await prisma.rider.findUnique({
      where: { id: authorId },
      select: { name: true, handle: true },
    });
    await logActivityForRiders(newlyMentioned, {
      type: "MENTIONED",
      summary: `${author?.name ?? "A rider"} mentioned you in a journal post`,
      refId: entryId,
      metadata: { authorHandle: author?.handle ?? null },
    });
  }
}
