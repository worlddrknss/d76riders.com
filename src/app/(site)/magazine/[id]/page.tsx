import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronRight, Clock, Tag as TagIcon } from "lucide-react";
import { NewsPostStatus } from "@prisma/client";

import { deleteNewsPostAction } from "@/app/(site)/magazine/[id]/actions";
import { AppShell } from "@/components/layout/app-shell";
import { ShareRow } from "@/components/magazine/share-row";
import { JsonLd, breadcrumbJsonLd } from "@/components/seo/json-ld";
import { siteImages } from "@/data/images";
import { absoluteUrl } from "@/lib/absolute-url";
import { mediaUrl } from "@/lib/media-url";
import { prisma } from "@/lib/prisma";
import { readingMinutes } from "@/lib/reading-time";
import { sanitizeRichText } from "@/lib/sanitize";
import { getCurrentUser } from "@/lib/session";

async function safeQuery<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch {
    return fallback;
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const dbPost = await safeQuery(
    () =>
      prisma.newsPost.findFirst({
        where: { slug: id, status: NewsPostStatus.PUBLISHED },
        select: { title: true, excerpt: true, coverImageUrl: true, seoTitle: true, seoDescription: true },
      }),
    null,
  );
  const title = dbPost?.seoTitle || dbPost?.title || "Article Not Found";
  const description = (dbPost?.seoDescription || dbPost?.excerpt || "").slice(0, 160);

  return {
    title,
    description: description || `Read ${title} on District 76 Riders.`,
    alternates: { canonical: `/magazine/${id}` },
    openGraph: {
      title,
      description: description || `Read ${title} on District 76 Riders.`,
      type: "article",
      ...(dbPost?.coverImageUrl && { images: [{ url: mediaUrl(dbPost.coverImageUrl) }] }),
    },
  };
}

export default async function NewsArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const currentUser = await getCurrentUser();

  const post = await safeQuery(
    () =>
      prisma.newsPost.findFirst({
        where: { slug: id, status: NewsPostStatus.PUBLISHED },
        include: {
          newsCategory: { select: { name: true } },
          postTags: { include: { tag: { select: { name: true } } } },
          // The author's real profile, so the byline links somewhere and the bio
          // is theirs rather than the same invented sentence on every article.
          authorUser: {
            select: { rider: { select: { handle: true, name: true, avatarUrl: true, bio: true } } },
          },
        },
      }),
    null,
  );

  if (!post) {
    notFound();
  }

  const body = sanitizeRichText(post.contentHtml);
  const category = post.newsCategory?.name || post.category;
  const tags = post.postTags.map((pt) => pt.tag.name);
  const cover = mediaUrl(post.coverImageUrl) || siteImages.galleryPage[0];
  const hasCover = Boolean(post.coverImageUrl);
  const minutes = readingMinutes(post.contentHtml);
  const rider = post.authorUser?.rider ?? null;
  const authorAvatar = mediaUrl(rider?.avatarUrl ?? null);
  const authorName = rider?.name || post.authorName;
  const initials = authorName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  // Related first, falling back to recent — a lone article shouldn't render an
  // empty card, which is what the old "Recent Posts" box did.
  const related = await safeQuery(
    () =>
      prisma.newsPost.findMany({
        where: {
          slug: { not: id },
          status: NewsPostStatus.PUBLISHED,
          ...(post.categoryId ? { categoryId: post.categoryId } : {}),
        },
        orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
        take: 3,
        select: { slug: true, title: true, excerpt: true, publishedAt: true, coverImageUrl: true },
      }),
    [],
  );

  const [dbCategories, dbTags] = await Promise.all([
    safeQuery(
      () =>
        prisma.newsCategory.findMany({
          orderBy: { name: "asc" },
          select: { name: true, _count: { select: { posts: true } } },
        }),
      [],
    ),
    safeQuery(
      () => prisma.newsTag.findMany({ orderBy: { usageCount: "desc" }, take: 16, select: { name: true } }),
      [],
    ),
  ]);

  const isAdmin = currentUser?.roles.includes("ADMINISTRATOR") ?? false;
  const shareUrl = absoluteUrl(`/magazine/${post.slug}`);

  return (
    <AppShell>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", href: "/" },
          { name: "Magazine", href: "/magazine" },
          { name: post.title, href: `/magazine/${post.slug}` },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: post.title,
          description: post.excerpt,
          datePublished: post.publishedAt.toISOString(),
          dateModified: post.updatedAt.toISOString(),
          author: { "@type": "Person", name: authorName },
          publisher: { "@type": "Organization", name: "District 76 Riders" },
          ...(post.coverImageUrl && { image: [absoluteUrl(mediaUrl(post.coverImageUrl))] }),
          mainEntityOfPage: shareUrl,
        }}
      />

      {/* HERO — the cover carries the title instead of a black bar sitting on
          top of a separate photo, which read as two disconnected blocks. */}
      <section className="relative overflow-hidden rounded-2xl bg-asphalt">
        {hasCover ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${cover})` }}
              aria-hidden="true"
            />
            {/* Weighted to the bottom so the type sits on the darkest area. */}
            <div
              className="absolute inset-0 bg-linear-to-t from-black/90 via-black/60 to-black/25"
              aria-hidden="true"
            />
          </>
        ) : (
          <div className="route-lines absolute inset-0 opacity-30" aria-hidden="true" />
        )}

        <div className={`relative px-5 sm:px-8 ${hasCover ? "pb-8 pt-40 sm:pb-10 sm:pt-64" : "py-12"}`}>
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1 text-xs font-semibold uppercase tracking-widest text-slate-300"
          >
            <Link href="/" className="transition hover:text-white">
              Home
            </Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/magazine" className="transition hover:text-white">
              Magazine
            </Link>
            {category ? (
              <>
                <ChevronRight className="h-3 w-3" />
                <Link
                  href={`/magazine?category=${encodeURIComponent(category)}`}
                  className="text-sunset transition hover:text-white"
                >
                  {category}
                </Link>
              </>
            ) : null}
          </nav>

          <h1 className="mt-3 max-w-4xl text-balance font-display text-3xl uppercase leading-[1.05] tracking-tight text-white sm:text-5xl">
            {post.title}
          </h1>

          {/* Byline on the hero: who wrote it, when, and how long it takes —
              the three things a reader decides on before committing. */}
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300">
            <span className="inline-flex items-center gap-2">
              {authorAvatar ? (
                <img src={authorAvatar} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-white/20" />
              ) : (
                <span className="grid h-8 w-8 place-items-center rounded-full bg-sunset text-xs font-bold text-white">
                  {initials}
                </span>
              )}
              {rider ? (
                <Link href={`/r/${rider.handle}`} className="font-semibold text-white transition hover:text-sunset">
                  {authorName}
                </Link>
              ) : (
                <span className="font-semibold text-white">{authorName}</span>
              )}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 text-sunset" />
              {formatDate(post.publishedAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-sunset" />
              {minutes} min read
            </span>
          </div>
        </div>
      </section>

      <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        {/* The body sits on a surface card like everything else on the site —
            long-form copy directly on the canvas read as an unfinished page. */}
        <article className="min-w-0 rounded-2xl border border-border bg-surface p-6 shadow-soft sm:p-9">
          {/* The excerpt was written for every article and shown on none of
              them — it earns its place as the standfirst. */}
          {post.excerpt ? (
            <p className="border-l-2 border-sunset pl-4 text-lg leading-relaxed text-ink sm:text-xl">
              {post.excerpt}
            </p>
          ) : null}

          <div
            className="prose prose-reading mt-8 max-w-[68ch] prose-headings:uppercase prose-headings:tracking-tight prose-img:rounded-xl"
            dangerouslySetInnerHTML={{ __html: body }}
          />

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
            <ShareRow url={shareUrl} title={post.title} />
            <Link
              href="/magazine"
              className="inline-flex items-center gap-2 text-sm font-semibold text-sunset transition hover:text-[#cf5a26]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Magazine
            </Link>
          </div>

          {tags.length > 0 ? (
            <div className="mt-6 flex flex-wrap items-center gap-2">
              <TagIcon className="h-3.5 w-3.5 text-muted" />
              {tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/magazine?tag=${encodeURIComponent(tag)}`}
                  className="rounded-md border border-border px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted transition hover:border-sunset/50 hover:text-sunset"
                >
                  {tag}
                </Link>
              ))}
            </div>
          ) : null}

          {/* AUTHOR — inset on canvas rather than another surface card, which
              would stack a card inside a card now that the article has one. */}
          <div className="mt-8 flex items-start gap-4 rounded-xl border border-border bg-canvas p-5">
            {authorAvatar ? (
              <img src={authorAvatar} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
            ) : (
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-sunset text-lg font-bold text-white">
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold uppercase tracking-tight text-asphalt">
                {rider ? (
                  <Link href={`/r/${rider.handle}`} className="transition hover:text-sunset">
                    {authorName}
                  </Link>
                ) : (
                  authorName
                )}
              </p>
              {rider?.handle ? <p className="text-xs text-muted">@{rider.handle}</p> : null}
              <p className="mt-2 text-sm text-muted">
                {rider?.bio?.trim() || "Writes for the District 76 magazine."}
              </p>
            </div>
          </div>

          {isAdmin ? (
            <form action={deleteNewsPostAction.bind(null, post.slug)} className="mt-6">
              <button className="rounded-md border border-red-300 px-4 py-2 text-xs font-semibold uppercase tracking-[0.06em] text-red-700 transition hover:bg-red-50">
                Delete Article
              </button>
            </form>
          ) : null}
        </article>

        {/* SIDEBAR — sticky so it stays useful through a long read. */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-6">
            {dbCategories.length > 0 ? (
              <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
                <h2 className="text-sm font-bold uppercase tracking-widest text-asphalt">Categories</h2>
                <ul className="mt-3 space-y-1">
                  {dbCategories.map((cat) => (
                    <li key={cat.name}>
                      <Link
                        href={`/magazine?category=${encodeURIComponent(cat.name)}`}
                        className={`flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-canvas ${
                          cat.name === category ? "font-semibold text-sunset" : "text-muted hover:text-ink"
                        }`}
                      >
                        <span className="inline-flex items-center gap-2">
                          <span className="h-2 w-2 shrink-0 bg-sunset" />
                          {cat.name}
                        </span>
                        <span className="text-xs tabular-nums text-muted">{cat._count.posts}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {dbTags.length > 0 ? (
              <div className="rounded-xl border border-border bg-surface p-5 shadow-soft">
                <h2 className="text-sm font-bold uppercase tracking-widest text-asphalt">Popular Tags</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {dbTags.map((tag) => (
                    <Link
                      key={tag.name}
                      href={`/magazine?tag=${encodeURIComponent(tag.name)}`}
                      className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-muted transition hover:border-sunset/50 hover:text-sunset"
                    >
                      {tag.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </aside>
      </div>

      {/* KEEP READING — full width, and simply absent when there's nothing to
          show rather than an empty box. */}
      {related.length > 0 ? (
        <section className="mt-14 border-t border-border pt-10">
          <h2 className="font-display text-xl uppercase tracking-tight text-ink">Keep Reading</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((item, i) => (
              <Link
                key={item.slug}
                href={`/magazine/${item.slug}`}
                className="group overflow-hidden rounded-xl border border-border bg-surface shadow-soft transition hover:border-sunset/40"
              >
                <div
                  className="h-36 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${
                      mediaUrl(item.coverImageUrl) ||
                      siteImages.galleryPage[(i + 1) % siteImages.galleryPage.length]
                    })`,
                  }}
                />
                <div className="p-4">
                  <h3 className="text-sm font-bold uppercase leading-tight tracking-tight text-asphalt transition group-hover:text-sunset">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-muted">{formatDate(item.publishedAt)}</p>
                  {item.excerpt ? (
                    <p className="mt-2 line-clamp-2 text-sm text-muted">{item.excerpt}</p>
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </AppShell>
  );
}
