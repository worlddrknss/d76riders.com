import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { SubmitNewsForm } from "@/components/news/submit-news-form";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Submit Article",
  description: "Submit a news article to the District 76 community.",
};

export default async function SubmitNewsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const categories = await prisma.newsCategory.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const tags = await prisma.newsTag.findMany({
    orderBy: { usageCount: "desc" },
    take: 50,
    select: { name: true },
  });

  return (
    <section className="w-full bg-canvas">
      <div className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <SubmitNewsForm
          categories={categories}
          existingTags={tags.map((t) => t.name)}
        />
      </div>
    </section>
  );
}
