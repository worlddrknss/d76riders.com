"use client";

import { CalendarDays, ChevronRight, Clock } from "lucide-react";

import { readingMinutes } from "@/lib/reading-time";

type ArticlePreviewProps = {
  title: string;
  categoryName: string;
  contentHtml: string;
  /** Object URL of the chosen cover, before upload. */
  coverUrl: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
};

/**
 * How the article will look once published, mirroring the magazine detail page
 * — same hero treatment, standfirst and prose body — so what a writer frames
 * here is what a reader gets.
 *
 * Scaled down to sit in the composer's side column: the hero is shorter and the
 * body is clipped, since the point is checking the shape and the framing rather
 * than proofreading at full size. The excerpt is absent for the same reason it
 * is absent from the article — it belongs to the listing card, not the page.
 */
export function ArticlePreview({
  title,
  categoryName,
  contentHtml,
  coverUrl,
  authorName,
  authorAvatarUrl,
}: ArticlePreviewProps) {
  const minutes = readingMinutes(contentHtml);
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-soft">
      {/* HERO — cover under a bottom-weighted gradient, carrying the title. */}
      <div className="relative overflow-hidden bg-asphalt">
        {coverUrl ? (
          <>
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${coverUrl})` }}
              aria-hidden="true"
            />
            <div
              className="absolute inset-0 bg-linear-to-t from-black/90 via-black/60 to-black/25"
              aria-hidden="true"
            />
          </>
        ) : (
          <div className="route-lines absolute inset-0 opacity-30" aria-hidden="true" />
        )}

        <div className={`relative px-4 ${coverUrl ? "pb-4 pt-24" : "py-6"}`}>
          <nav className="flex flex-wrap items-center gap-1 text-[0.6rem] font-semibold uppercase tracking-widest text-slate-300">
            <span>Magazine</span>
            {categoryName ? (
              <>
                <ChevronRight className="h-2.5 w-2.5" />
                <span className="text-sunset">{categoryName}</span>
              </>
            ) : null}
          </nav>

          <h3 className="mt-2 text-balance font-display text-lg uppercase leading-[1.05] tracking-tight text-white">
            {title.trim() || "Your headline goes here"}
          </h3>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.65rem] text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              {authorAvatarUrl ? (
                <img src={authorAvatarUrl} alt="" className="h-5 w-5 rounded-full object-cover ring-1 ring-white/20" />
              ) : null}
              <span className="font-semibold text-white">{authorName}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3 w-3 text-sunset" />
              {today}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3 text-sunset" />
              {minutes} min read
            </span>
          </div>
        </div>
      </div>

      <div className="p-4">
        {contentHtml.trim() ? (
          <div
            className="prose prose-reading prose-sm max-h-72 overflow-hidden text-sm prose-headings:uppercase prose-headings:tracking-tight"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        ) : (
          <p className="text-sm italic text-muted/70">Start writing and the article appears here.</p>
        )}
      </div>
    </div>
  );
}
