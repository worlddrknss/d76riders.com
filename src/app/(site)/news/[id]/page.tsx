import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Quote, UserRound } from "lucide-react";
import { NewsPostStatus } from "@prisma/client";
import { deleteNewsPostAction } from "@/app/(site)/news/[id]/actions";
import { siteImages } from "@/data/images";
import { prisma } from "@/lib/prisma";
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
    alternates: { canonical: `/news/${id}` },
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
        body: [dbPost.contentHtml],
        pullQuote: undefined,
        tags: dbPost.postTags.map((pt) => pt.tag.name),
        coverImageUrl: dbPost.coverImageUrl,
        isHtml: true,
      }
    : null;

  if (!article) {
    notFound();
  }

  const heroPhoto = article.coverImageUrl || siteImages.galleryPage[0];
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

  const isAdmin = currentUser?.roles.includes("ADMINISTRATOR") ?? false;

  return (
    <div>
      {/* Hero cover */}
      <section className="relative w-full">
        <div
          className="h-64 bg-cover bg-center sm:h-80 lg:h-96"
          style={{ backgroundImage: `url(${heroPhoto})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-asphalt/80 via-asphalt/30 to-transparent" />
          <div className="relative mx-auto flex h-full max-w-4xl flex-col justify-end px-4 pb-10 sm:px-6">
            <span className="inline-flex w-fit rounded-full bg-sunset px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-widest text-white">
              {article.category}
            </span>
            <h1 className="mt-3 max-w-3xl font-display text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
              {article.title}
            </h1>
            <div className="mt-4 flex items-center gap-4 text-sm text-white/80">
              <span className="flex items-center gap-1.5"><UserRound className="h-4 w-4" />{article.author}</span>
              <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{article.date}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="w-full bg-canvas">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
          {/* Article body */}
          <article className="space-y-5">
            {article.body.map((paragraph, i) => (
              <div key={i}>
                {article.isHtml ? (
                  <div className="prose prose-neutral prose-lg max-w-none leading-relaxed text-muted prose-headings:font-display prose-headings:text-ink prose-a:text-sunset" dangerouslySetInnerHTML={{ __html: paragraph }} />
                ) : (
                  <p className="text-base leading-relaxed text-muted">{paragraph}</p>
                )}
                {article.pullQuote && i === 0 ? (
                  <blockquote className="my-8 rounded-xl border-l-4 border-sunset bg-surface p-6 shadow-soft">
                    <Quote className="h-6 w-6 text-sunset/50" />
                    <p className="mt-2 font-display text-lg font-semibold leading-snug text-ink">
                      {article.pullQuote}
                    </p>
                  </blockquote>
                ) : null}
              </div>
            ))}
          </article>

          {/* Tags */}
          {article.tags.length > 0 && (
            <div className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
              {article.tags.map((tag) => (
                <span key={tag} className="rounded-lg bg-canvas px-3 py-1.5 text-xs font-semibold text-muted transition hover:bg-sunset/10 hover:text-sunset">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Author card */}
          <div className="mt-8 flex items-start gap-4 rounded-xl border border-border bg-surface p-6 shadow-soft">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sunset text-sm font-bold text-white">
              {article.author.split(" ").map((n) => n[0]).join("")}
            </span>
            <div>
              <p className="text-sm font-bold text-ink">{article.author}</p>
              <p className="mt-1 text-sm text-muted">
                District 76 member and contributor.
              </p>
            </div>
          </div>

          {/* Recent posts */}
          {recent.length > 0 && (
            <div className="mt-12 border-t border-border pt-8">
              <h3 className="font-display text-lg font-bold text-ink">More from District 76</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {recent.map((post, i) => (
                  <Link key={post.id} href={`/news/${post.id}`} className="group overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition hover:shadow-lift">
                    <div
                      className="h-32 bg-cover bg-center"
                      style={{ backgroundImage: `url(${post.coverImageUrl || siteImages.galleryPage[(i + 1) % siteImages.galleryPage.length]})` }}
                    />
                    <div className="p-4">
                      <p className="text-sm font-semibold text-ink transition group-hover:text-sunset">{post.title}</p>
                      <p className="mt-1 text-xs text-muted">{post.date}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Navigation + admin */}
          <div className="mt-8 flex items-center justify-between">
            <Link href="/news" className="inline-flex items-center gap-2 text-sm font-semibold text-sunset hover:text-[#cf5a26]">
              <ArrowLeft className="h-4 w-4" /> All Articles
            </Link>
            {dbPost && isAdmin ? (
              <form action={deleteNewsPostAction.bind(null, dbPost.slug)}>
                <button className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50">
                  Delete
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}
