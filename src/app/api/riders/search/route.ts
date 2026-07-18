import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Rider typeahead for @mention autocomplete in the journal composer. Auth-only
// (only signed-in riders compose), which also keeps it from being a public
// handle-enumeration endpoint.
export async function GET(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return Response.json([]);

  const q = new URL(request.url).searchParams.get("q")?.trim().toLowerCase() ?? "";

  const riders = await prisma.rider.findMany({
    where: q
      ? {
          OR: [
            { handle: { startsWith: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
          ],
        }
      : {},
    take: 6,
    orderBy: { handle: "asc" },
    select: { handle: true, name: true, avatarUrl: true },
  });

  return Response.json(
    riders.map((r) => ({ handle: r.handle, name: r.name, avatarUrl: mediaUrl(r.avatarUrl) || null })),
  );
}
