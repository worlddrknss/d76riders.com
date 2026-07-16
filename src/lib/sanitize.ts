import sanitizeHtmlLib from "sanitize-html";

// Allowlist tuned to what the TipTap editor can produce. Anything outside it —
// <script>, event handlers, style/iframe/object, javascript: URLs — is stripped.
// Use on every path that renders stored rich text with dangerouslySetInnerHTML.
const OPTIONS: sanitizeHtmlLib.IOptions = {
  allowedTags: [
    "p", "br", "hr",
    "strong", "b", "em", "i", "u", "s", "strike", "mark", "sub", "sup",
    "h1", "h2", "h3", "h4",
    "ul", "ol", "li",
    "blockquote", "pre", "code",
    "a", "span",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    span: ["class"],
    code: ["class"],
    pre: ["class"],
  },
  // Only safe link schemes — blocks javascript:, data:, vbscript:.
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  transformTags: {
    // Force external links to open safely.
    a: sanitizeHtmlLib.simpleTransform("a", { rel: "noopener noreferrer nofollow" }),
  },
};

export function sanitizeRichText(html: string): string {
  return sanitizeHtmlLib(html, OPTIONS);
}
