import type { Metadata } from "next";
import { OG_IMAGE } from "@/lib/og";
import Link from "next/link";
import { ArrowRight, CalendarDays, MessageSquare, Newspaper, X } from "lucide-react";
import { NewsPostStatus } from "@prisma/client";
import { siteImages } from "@/data/images";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerList, StaggerItem } from "@/components/ui/motion";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
  title: "Magazine",
  description:
    "The latest news, ride recaps, and announcements from District 76 Riders — your source for Clarksville motorcycle community updates.",
  alternates: { canonical: "/magazine" },
  openGraph: {
    images: OG_IMAGE,
    title: "Magazine — District 76 Riders",
    description: "Community news, ride recaps, and announcements.",
  },
};

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; tag?: string }>;
}) {
  const currentUser = await getCurrentUser();
  const { category: categoryFilter, tag: tagFilter } = await searchParams;

  const dbPosts = "newsPost" in prisma
    ? await prisma.newsPost.findMany({
        where: {
          status: NewsPostStatus.PUBLISHED,
          // Category is matched by name because that is what the links carry,
          // and older posts store it as a plain string rather than a relation.
          ...(categoryFilter
            ? {
                OR: [
                  { newsCategory: { name: { equals: categoryFilter, mode: "insensitive" } } },
                  { category: { equals: categoryFilter, mode: "insensitive" } },
                ],
              }
            : {}),
          ...(tagFilter
            ? { postTags: { some: { tag: { name: { equals: tagFilter, mode: "insensitive" } } } } }
            : {}),
        },
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

  const recent = articles.slice(0, 3);
  const activeFilter = categoryFilter || tagFilter || null;

  return (
    <AppShell>
      <PageHeader
        icon={Newspaper}
        eyebrow="Magazine"
        title="District 76 News"
        subtitle="Ride reports, gear talk, and stories from the road. Notes from riders who actually log the miles."
      />

      <section className="py-10">
        <div className="grid w-full gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_20rem] lg:px-8">
          {/* ARTICLE GRID */}
          <div>
            {currentUser ? (
              <div className="mb-6 flex items-center justify-end">
                <Link href="/magazine/new" className="rounded-lg bg-sunset px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#cf5a26]">
                  Submit Article
                </Link>
              </div>
            ) : null}
            {activeFilter ? (
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted">
                  {articles.length} article{articles.length === 1 ? "" : "s"} in{" "}
                  <span className="font-semibold text-ink">{activeFilter}</span>
                </span>
                <Link
                  href="/magazine"
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted transition hover:border-sunset/50 hover:text-sunset"
                >
                  <X className="h-3 w-3" />
                  Clear filter
                </Link>
              </div>
            ) : null}

            {articles.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-surface p-8 text-center text-sm text-muted">
                Nothing here yet{activeFilter ? ` for “${activeFilter}”` : ""}.
              </p>
            ) : null}

            <StaggerList className="grid gap-8 sm:grid-cols-2">
            {articles.map((article, i) => (
              <StaggerItem key={article.id}>
              <article className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
                <Link href={`/magazine/${article.id}`} className="block">
                  <div className="relative h-52 bg-cover bg-center" style={{ backgroundImage: `url(${article.coverImageUrl || siteImages.galleryPage[i % siteImages.galleryPage.length]})` }}>
                    <span className="absolute bottom-0 left-0 bg-sunset px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-white">
                      {article.category}
                    </span>
                  </div>
                </Link>
                <div className="p-5">
                  <Link href={`/magazine/${article.id}`}>
                    <h2 className="font-display text-lg uppercase tracking-tight text-asphalt hover:text-sunset">
                      {article.title}
                    </h2>
                  </Link>
                  <div className="mt-2 flex items-center gap-4 text-xs text-muted">
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-sunset" />{article.date}</span>
                    <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5 text-sunset" />No Comments</span>
                  </div>
                  <p className="mt-3 text-sm text-muted">{article.excerpt}</p>
                  <Link href={`/magazine/${article.id}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-sunset hover:text-[#cf5a26]">
                    Read More <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </article>
              </StaggerItem>
            ))}
          </StaggerList>
          </div>

          {/* SIDEBAR */}
          <aside className="space-y-8">
            <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
              <h3 className="text-sm font-bold uppercase tracking-widest text-asphalt">Categories</h3>
              <ul className="mt-4 space-y-2">
                {newsCategories.map((cat) => (
                  <li key={cat.name}>
                    <Link
                      href={`/magazine?category=${encodeURIComponent(cat.name)}`}
                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-canvas ${
                        cat.name === categoryFilter ? "font-semibold text-sunset" : "text-muted hover:text-ink"
                      }`}
                    >
                      <span className="h-2 w-2 shrink-0 bg-sunset" />
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
              <h3 className="text-sm font-bold uppercase tracking-widest text-asphalt">Recent Posts</h3>
              <ul className="mt-4 space-y-4">
                {recent.map((article, i) => (
                  <li key={article.id}>
                    <Link href={`/magazine/${article.id}`} className="flex items-center gap-3">
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
              <h3 className="text-sm font-bold uppercase tracking-widest text-asphalt">Popular Tags</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <Link
                    key={tag.name}
                    href={`/magazine?tag=${encodeURIComponent(tag.name)}`}
                    className={`rounded-md border px-3 py-1 text-xs font-semibold uppercase tracking-wider transition ${
                      tag.name === tagFilter
                        ? "border-sunset bg-sunset/10 text-sunset"
                        : "border-border text-muted hover:border-sunset/50 hover:text-sunset"
                    }`}
                  >
                    {tag.name}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
