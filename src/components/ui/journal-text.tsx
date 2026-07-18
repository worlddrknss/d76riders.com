import Link from "next/link";

import { tokenizeJournalText } from "@/lib/journal-tags";

/**
 * Renders journal text with links: URLs, #hashtags → /tags/<tag>, and @mentions
 * → /r/<handle>. Uses the same tokenizer that extracts tags on save, so what
 * gets stored and what lights up in the post always agree. Mentions link
 * optimistically — a typo'd handle lands on a 404 profile, which the composer's
 * autocomplete makes rare.
 */
export function JournalText({ text, className }: { text: string; className?: string }) {
  const tokens = tokenizeJournalText(text);
  return (
    <span className={className}>
      {tokens.map((t, i) => {
        if (t.kind === "text") return <span key={i}>{t.value}</span>;
        if (t.kind === "url") {
          return (
            <a
              key={i}
              href={t.value}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-sunset underline decoration-sunset/30 hover:decoration-sunset"
            >
              {t.value}
            </a>
          );
        }
        const href = t.kind === "hashtag" ? `/tags/${t.tag}` : `/r/${t.handle}`;
        return (
          <Link key={i} href={href} className="font-semibold text-sunset hover:underline">
            {t.value}
          </Link>
        );
      })}
    </span>
  );
}
