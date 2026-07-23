import { redirect } from "next/navigation";

import { SubmitNewsForm } from "@/components/news/submit-news-form";
import { FullPageModal } from "@/components/ui/full-page-modal";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Intercepts client-side navigations to /magazine/new and shows the submit form
// in a full-screen modal over the current page. Hard nav / refresh / direct visit
// falls through to the real page at (site)/magazine/new/page.tsx instead.
export default async function InterceptedSubmitNewsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?next=/magazine/new");

  const [categories, tags, rider] = await Promise.all([
    prisma.newsCategory.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.newsTag.findMany({ orderBy: { usageCount: "desc" }, take: 50, select: { name: true } }),
    prisma.rider.findUnique({
      where: { userId: currentUser.id },
      select: { name: true, avatarUrl: true },
    }),
  ]);

  return (
    <FullPageModal eyebrow="Community" title="Submit an Article">
      <SubmitNewsForm
        categories={categories}
        existingTags={tags.map((t) => t.name)}
        hideHeading
        withPreview
        authorName={rider?.name ?? currentUser.name ?? "You"}
        authorAvatarUrl={mediaUrl(rider?.avatarUrl ?? null) || null}
      />
    </FullPageModal>
  );
}
