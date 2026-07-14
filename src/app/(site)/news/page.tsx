import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NewsPostStatus } from "@prisma/client";
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

  const articles = dbPosts.map((post) => ({
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
  }));

  const featured = articles[0] ?? null;
  const rest = articles.slice(1);

  return (
    <div>
      <PageHero
        image={siteImages.pageHeroes.gallery}
        eyebrow="News"
        title="District 76 News"
        description="Ride reports, gear talk, and stories from the road. Notes from riders who actually log the miles."
      />

      <section className="w-full bg-canvas">
        <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8">

          {/* Submit button */}
          {currentUser ? (
            <div className="mb-8 flex justify-end">
              <Link href="/news/new" className="rounded-lg bg-sunset px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#cf5a26]">
                Submit Article
              </Link>
            </div>
          ) : null}

          {articles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-16 text-center">
              <p className="text-lg font-semibold text-ink">No news posts yet</p>
              <p className="mt-2 text-sm text-muted">Check back soon for ride reports and community updates.</p>
            </div>
          ) : (
            <>
              {/* Featured article — large hero card */}
              {featured && (
                <Link href={`/news/${featured.id}`} className="group mb-10 block overflow-hidden rounded-2xl border border-border bg-surface shadow-soft transition hover:shadow-lift">
                  <div className="grid lg:grid-cols-[1.4fr_1fr]">
                    <div
                      className="h-64 bg-cover bg-center lg:h-full lg:min-h-[20rem]"
                      style={{ backgroundImage: `url(${featured.coverImageUrl || siteImages.galleryPage[0]})` }}
                    />
                    <div className="flex flex-col justify-center p-8 lg:p-10">
                      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">{featured.category}</span>
                      <h2 className="mt-2 font-display text-2xl font-bold text-ink transition group-hover:text-sunset lg:text-3xl">
                        {featured.title}
                      </h2>
                      <p className="mt-3 text-sm leading-relaxed text-muted">{featured.excerpt}</p>
                      <div className="mt-4 flex items-center gap-3 text-xs text-muted">
                        <span>{featured.author}</span>
                        <span>·</span>
                        <span>{featured.date}</span>
                      </div>
                      <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-sunset">
                        Read Article <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </div>
                </Link>
              )}

              {/* Article grid */}
              {rest.length > 0 && (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.map((article, i) => (
                    <article key={article.id} className="group overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition hover:shadow-lift">
                      <Link href={`/news/${article.id}`} className="block">
                        <div
                          className="h-44 bg-cover bg-center transition group-hover:scale-[1.02]"
                          style={{ backgroundImage: `url(${article.coverImageUrl || siteImages.galleryPage[(i + 1) % siteImages.galleryPage.length]})` }}
                        />
                      </Link>
                      <div className="p-5">
                        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-sunset">{article.category}</span>
                        <Link href={`/news/${article.id}`}>
                          <h3 className="mt-1 font-display text-base font-bold text-ink transition group-hover:text-sunset">
                            {article.title}
                          </h3>
                        </Link>
                        <p className="mt-2 line-clamp-2 text-sm text-muted">{article.excerpt}</p>
                        <div className="mt-3 flex items-center justify-between text-xs text-muted">
                          <span>{article.author}</span>
                          <span>{article.date}</span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Categories + Tags — horizontal below articles */}
          {(newsCategories.length > 0 || popularTags.length > 0) && (
            <div className="mt-12 grid gap-6 sm:grid-cols-2">
              {newsCategories.length > 0 && (
                <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
                  <h3 className="font-display text-sm font-bold uppercase tracking-widest text-asphalt">Categories</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {newsCategories.map((cat) => (
                      <span key={cat.name} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted">
                        <span className="h-1.5 w-1.5 rounded-full bg-sunset" />
                        {cat.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {popularTags.length > 0 && (
                <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
                  <h3 className="font-display text-sm font-bold uppercase tracking-widest text-asphalt">Popular Tags</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {popularTags.map((tag) => (
                      <span key={tag.name} className="rounded-lg bg-canvas px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-sunset/10 hover:text-sunset">
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
