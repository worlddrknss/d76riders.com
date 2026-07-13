import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, MessageSquare } from "lucide-react";
import { NewsPostStatus } from "@prisma/client";
import { newsArticles } from "@/data/community";
import { siteImages } from "@/data/images";
import { PageHero } from "@/components/layout/page-hero";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "News & Updates",
  description:
    "The latest news, ride recaps, and announcements from District 76 Riders — your source for Clarksville motorcycle community updates.",
  alternates: { canonical: "/news" },
  openGraph: {
    title: "News — District 76 Riders",
    description: "Community news, ride recaps, and announcements.",
  },
};

export default async function NewsPage() {
  const currentUser = await getCurrentUser();

  const dbPosts = "newsPost" in prisma
    ? await prisma.newsPost.findMany({
        where: { status: NewsPostStatus.PUBLISHED },
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
        take: 24,
        include: {
          newsCategory: { select: { name: true } },
          postTags: { include: { tag: { select: { name: true } } } },
        },
      })
    : [];

  // Derive categories and tags from models
  const newsCategories = await prisma.newsCategory.findMany({ orderBy: { name: "asc" }, select: { name: true } });
  const popularTags = await prisma.newsTag.findMany({ orderBy: { usageCount: "desc" }, take: 20, select: { name: true } });

  const articles = dbPosts.length > 0
    ? dbPosts.map((post) => ({
        id: post.slug,
        title: post.title,
        category: post.newsCategory?.name || post.category,
        date: post.publishedAt.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        author: post.authorName,
        excerpt: post.excerpt,
        coverImageUrl: post.coverImageUrl,
      }))
    : newsArticles.map((article) => ({
        id: article.id,
        title: article.title,
        category: article.category,
        date: article.date,
        author: article.author,
        excerpt: article.excerpt,
        coverImageUrl: null,
      }));

  const recent = articles.slice(0, 3);

  return (
    <div>
      <PageHero
        image={siteImages.pageHeroes.gallery}
        eyebrow="News"
        title="District 76 News"
        description="Ride reports, gear talk, and stories from the road. Notes from riders who actually log the miles."
      />

      <section className="w-full bg-canvas">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_20rem] lg:px-8">
          {/* ARTICLE GRID */}
          <div>
            {currentUser ? (
              <div className="mb-6 flex items-center justify-end">
                <Link href="/news/new" className="rounded-lg bg-sunset px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#cf5a26]">
                  Submit Article
                </Link>
              </div>
            ) : null}
            <div className="grid gap-8 sm:grid-cols-2">
            {articles.map((article, i) => (
              <article key={article.id} className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
                <Link href={`/news/${article.id}`} className="block">
                  <div className="relative h-52 bg-cover bg-center" style={{ backgroundImage: `url(${article.coverImageUrl || siteImages.galleryPage[i % siteImages.galleryPage.length]})` }}>
                    <span className="absolute bottom-0 left-0 bg-sunset px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-white">
                      {article.category}
                    </span>
                  </div>
                </Link>
                <div className="p-5">
                  <Link href={`/news/${article.id}`}>
                    <h2 className="font-display text-lg font-bold uppercase tracking-tight text-asphalt hover:text-sunset">
                      {article.title}
                    </h2>
                  </Link>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-sunset" />{article.date}</span>
                    <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5 text-sunset" />No Comments</span>
                  </div>
                  <p className="mt-3 text-sm text-muted">{article.excerpt}</p>
                  <Link href={`/news/${article.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sunset hover:text-[#cf5a26]">
                    Read More <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
          </div>

          {/* SIDEBAR */}
          <aside className="space-y-8">
            <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-asphalt">Categories</h3>
              <ul className="mt-4 space-y-2">
                {newsCategories.map((cat) => (
                  <li key={cat.name} className="flex items-center gap-2 text-sm text-muted">
                    <span className="h-2 w-2 bg-sunset" />
                    {cat.name}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-asphalt">Recent Posts</h3>
              <ul className="mt-4 space-y-4">
                {recent.map((article, i) => (
                  <li key={article.id}>
                    <Link href={`/news/${article.id}`} className="flex items-center gap-3">
                      <span
                        className="h-14 w-14 shrink-0 rounded-md bg-cover bg-center"
                        style={{ backgroundImage: `url(${article.coverImageUrl || siteImages.galleryPage[i % siteImages.galleryPage.length]})` }}
                      />
                      <span>
                        <span className="block text-sm font-semibold uppercase leading-tight tracking-tight text-asphalt hover:text-sunset">
                          {article.title}
                        </span>
                        <span className="mt-1 block text-xs text-muted">{article.date}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-asphalt">Popular Tags</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <span key={tag.name} className="rounded-md border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted">
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
