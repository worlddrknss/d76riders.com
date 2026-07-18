/**
 * Hashtag and @mention parsing for journal text.
 *
 * One set of rules for both extraction (what we store on save) and rendering
 * (what we linkify), so a tag that gets stored is exactly the tag that lights up
 * in the post. Handles use the same character set as usernames
 * (`[a-z0-9._-]`, see registerSchema); hashtags are kept to word characters so
 * "#trip." doesn't swallow the trailing period.
 */

// Tokens must not start mid-word: a preceding char, if any, must be whitespace
// or start-of-string, so an email's "@" or a URL's "#anchor" isn't a mention.
const HASHTAG_RE = /(^|[^\w])#([a-z0-9_]+)/gi;
const MENTION_RE = /(^|[^\w])@([a-z0-9._-]+)/gi;
const URL_RE = /https?:\/\/[^\s]+/gi;

/** Normalize a tag/handle for storage and comparison: lowercased. */
export function normalizeTag(raw: string): string {
  return raw.toLowerCase();
}

/**
 * Distinct, normalized hashtags in the text (no leading '#'). Derived from the
 * tokenizer so a `#fragment` inside a URL is never counted.
 */
export function extractHashtags(text: string): string[] {
  const out = new Set<string>();
  for (const tok of tokenizeJournalText(text)) if (tok.kind === "hashtag") out.add(tok.tag);
  return [...out];
}

/** Distinct, normalized handles mentioned in the text (no leading '@'). */
export function extractHandles(text: string): string[] {
  const out = new Set<string>();
  for (const tok of tokenizeJournalText(text)) if (tok.kind === "mention") out.add(tok.handle);
  return [...out];
}

export type Token =
  | { kind: "text"; value: string }
  | { kind: "url"; value: string }
  | { kind: "hashtag"; value: string; tag: string }
  | { kind: "mention"; value: string; handle: string };

/**
 * Split text into ordered tokens for rendering. URLs win over #/@ (so a URL
 * fragment isn't mistaken for a hashtag), then hashtags and mentions.
 */
export function tokenizeJournalText(text: string): Token[] {
  type Match = { start: number; end: number; token: Token };
  const matches: Match[] = [];

  for (const m of text.matchAll(URL_RE)) {
    matches.push({ start: m.index, end: m.index + m[0].length, token: { kind: "url", value: m[0] } });
  }
  const claimed = (i: number) => matches.some((mt) => i >= mt.start && i < mt.end);

  for (const m of text.matchAll(HASHTAG_RE)) {
    const start = m.index + m[1].length; // skip the leading boundary char
    if (claimed(start)) continue;
    matches.push({ start, end: start + m[2].length + 1, token: { kind: "hashtag", value: `#${m[2]}`, tag: normalizeTag(m[2]) } });
  }
  for (const m of text.matchAll(MENTION_RE)) {
    const start = m.index + m[1].length;
    if (claimed(start)) continue;
    matches.push({ start, end: start + m[2].length + 1, token: { kind: "mention", value: `@${m[2]}`, handle: normalizeTag(m[2]) } });
  }

  matches.sort((a, b) => a.start - b.start);

  const tokens: Token[] = [];
  let cursor = 0;
  for (const mt of matches) {
    if (mt.start < cursor) continue; // overlap guard
    if (mt.start > cursor) tokens.push({ kind: "text", value: text.slice(cursor, mt.start) });
    tokens.push(mt.token);
    cursor = mt.end;
  }
  if (cursor < text.length) tokens.push({ kind: "text", value: text.slice(cursor) });
  return tokens;
}
