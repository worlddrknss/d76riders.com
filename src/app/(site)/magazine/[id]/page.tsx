import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronRight, Quote, UserRound } from "lucide-react";
import { NewsPostStatus } from "@prisma/client";
import { deleteNewsPostAction } from "@/app/(site)/magazine/[id]/actions";
import { AppShell } from "@/components/layout/app-shell";
import { siteImages } from "@/data/images";
import { prisma } from "@/lib/prisma";
import { sanitizeRichText } from "@/lib/sanitize";
import { getCurrentUser } from "@/lib/session";

async function safeQuery<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch {
    return fallback;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const dbPost = await safeQuery(
    () => prisma.newsPost.findFirst({ where: { slug: id, status: NewsPostStatus.PUBLISHED }, select: { title: true, excerpt: true, coverImageUrl: true } }),
    null,
  );
  const title = dbPost?.title || "Article Not Found";
  const description = dbPost?.excerpt || "";

  return {
    title,
    description: description.slice(0, 160) || `Read ${title} on District 76 Riders.`,
    alternates: { canonical: `/magazine/${id}` },
    openGraph: {
      title,
      description: description.slice(0, 160) || `Read ${title} on District 76 Riders.`,
      type: "article",
      ...(dbPost?.coverImageUrl && { images: [{ url: dbPost.coverImageUrl }] }),
    },
  };
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentUser = await getCurrentUser();
  const dbPost = await safeQuery(() => prisma.newsPost.findFirst({
        where: { slug: id, status: NewsPostStatus.PUBLISHED },
        include: {
          newsCategory: { select: { name: true } },
          postTags: { include: { tag: { select: { name: true } } } },
        },
      }), null);

  const article = dbPost
    ? {
        id: dbPost.slug,
        title: dbPost.title,
        category: dbPost.newsCategory?.name || dbPost.category,
        date: dbPost.publishedAt.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        }),
        author: dbPost.authorName,
        excerpt: dbPost.excerpt,
        body: [sanitizeRichText(dbPost.contentHtml)],
        pullQuote: undefined,
        tags: dbPost.postTags.map((pt) => pt.tag.name),
        coverImageUrl: dbPost.coverImageUrl,
        isHtml: true,
      }
    : null;

  if (!article) {
    notFound();
  }

  const articleIndex = 0;
  const heroPhoto = article.coverImageUrl || siteImages.galleryPage[articleIndex % siteImages.galleryPage.length];
  const recentDbPosts = await safeQuery(
    () =>
      prisma.newsPost.findMany({
        where: { slug: { not: id }, status: NewsPostStatus.PUBLISHED },
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
        take: 3,
      }),
    [],
  );
  const recent = recentDbPosts.map((post) => ({
    id: post.slug,
    title: post.title,
    date: post.publishedAt.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
    coverImageUrl: post.coverImageUrl,
  }));

  const [dbCategories, dbTags] = await Promise.all([
    prisma.newsCategory.findMany({ orderBy: { name: "asc" }, select: { name: true } }),
    prisma.newsTag.findMany({ orderBy: { usageCount: "desc" }, take: 20, select: { name: true } }),
  ]);
  const newsCategories = dbCategories.map((c) => c.name);
  const popularTags = dbTags.map((t) => t.name);

  const isAdmin = currentUser?.roles.includes("ADMINISTRATOR") ?? false;

  return (
    <AppShell>
      {/* HEADER */}
      <section className="relative w-full overflow-hidden bg-asphalt">
        <div className="route-lines absolute inset-0 opacity-30" aria-hidden="true" />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-slate-400">
            <Link href="/" className="hover:text-white">Home</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/magazine" className="hover:text-white">Magazine</Link>
            <ChevronRight className="h-3 w-3 text-sunset" />
            <span className="text-sunset">{article.category}</span>
          </nav>
          <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold uppercase tracking-tight text-white sm:text-5xl">
            {article.title}
          </h1>
        </div>
      </section>

      <section className="w-full bg-canvas">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_20rem] lg:px-8">
          {/* ARTICLE BODY */}
          <article>
            <div
              className="aspect-16/10 w-full rounded-xl bg-cover bg-center shadow-soft"
              style={{ backgroundImage: `url(${heroPhoto})` }}
            />
            <div className="mt-5 flex items-center gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 text-sunset" />{article.date}</span>
              <span className="inline-flex items-center gap-1"><UserRound className="h-3.5 w-3.5 text-sunset" />{article.author}</span>
            </div>

            <div className="mt-6 space-y-5 text-muted">
              {article.body.map((paragraph, i) => (
                <div key={i}>
                  {article.isHtml ? (
                    <div className="prose prose-neutral max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: paragraph }} />
                  ) : (
                    <p className="leading-relaxed">{paragraph}</p>
                  )}
                  {article.pullQuote && i === 0 ? (
                    <blockquote className="my-8 flex gap-4 rounded-xl bg-surface p-6 shadow-soft">
                      <Quote className="h-8 w-8 shrink-0 fill-sunset text-sunset" />
                      <p className="font-display text-lg font-semibold uppercase leading-snug tracking-tight text-asphalt">
                        {article.pullQuote}
                      </p>
                    </blockquote>
                  ) : null}
                </div>
              ))}
            </div>

            {/* TAGS */}
            <div className="mt-8 flex flex-wrap gap-2 border-t border-border pt-6">
              {article.tags.map((tag) => (
                <span key={tag} className="rounded-md border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  {tag}
                </span>
              ))}
            </div>

            {/* AUTHOR */}
            <div className="mt-8 flex items-start gap-4 rounded-xl border border-border bg-surface p-6 shadow-soft">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sunset text-lg font-bold text-white">
                {article.author.split(" ").map((n) => n[0]).join("")}
              </span>
              <div>
                <p className="font-display text-sm font-bold uppercase tracking-tight text-asphalt">{article.author}</p>
                <p className="mt-1 text-sm text-muted">
                  District 76 member and contributor. Writes about riding, gear, and the roads around Tennessee.
                </p>
              </div>
            </div>

            <Link href="/magazine" className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-sunset hover:text-[#cf5a26]">
              <ArrowLeft className="h-4 w-4" /> Back to News
            </Link>
            {dbPost && isAdmin ? (
              <form action={deleteNewsPostAction.bind(null, dbPost.slug)} className="mt-4">
                <button className="rounded-md border border-red-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-red-700">
                  Delete News Post
                </button>
              </form>
            ) : null}
          </article>

          {/* SIDEBAR */}
          <aside className="space-y-8">
            <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-asphalt">Categories</h3>
              <ul className="mt-4 space-y-2">
                {newsCategories.map((cat) => (
                  <li key={cat} className="flex items-center gap-2 text-sm text-muted">
                    <span className="h-2 w-2 bg-sunset" />
                    {cat}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-asphalt">Recent Posts</h3>
              <ul className="mt-4 space-y-4">
                {recent.map((post, i) => (
                  <li key={post.id}>
                    <Link href={`/magazine/${post.id}`} className="flex items-center gap-3">
                      <span
                        className="h-14 w-14 shrink-0 rounded-md bg-cover bg-center"
                        style={{ backgroundImage: `url(${post.coverImageUrl || siteImages.galleryPage[(articleIndex + i + 1) % siteImages.galleryPage.length]})` }}
                      />
                      <span>
                        <span className="block text-sm font-semibold uppercase leading-tight tracking-tight text-asphalt hover:text-sunset">
                          {post.title}
                        </span>
                        <span className="mt-1 block text-xs text-muted">{post.date}</span>
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
                  <span key={tag} className="rounded-md border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
