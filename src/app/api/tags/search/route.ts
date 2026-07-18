import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Hashtag typeahead for #tag autocomplete — suggests existing tags (most-used
// first) so posts converge on shared tags instead of near-duplicates.
export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return Response.json([]);

  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";

  const grouped = await prisma.journalHashtag.groupBy({
    by: ["tag"],
    where: q ? { tag: { startsWith: q } } : {},
    _count: { tag: true },
    orderBy: { _count: { tag: "desc" } },
    take: 8,
  });

  return Response.json(grouped.map((g) => ({ tag: g.tag, count: g._count.tag })));
}
