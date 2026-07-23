/** Average adult prose reading speed. Rounded numbers beat false precision here. */
const WORDS_PER_MINUTE = 225;

/**
 * Rough minutes-to-read for an HTML article body.
 *
 * Tags are stripped before counting so markup doesn't inflate the estimate, and
 * the result is at least 1 — "0 min read" reads like an error.
 */
export function readingMinutes(html: string): number {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .trim();
  if (!text) return 1;
  const words = text.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}
