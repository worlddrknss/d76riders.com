"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { SiFacebook, SiX } from "@icons-pack/react-simple-icons";

/**
 * Share controls for an article.
 *
 * Uses the native share sheet where there is one — on a phone that's the only
 * way to reach the apps riders actually post to — and falls back to explicit
 * Facebook/X links plus copy-to-clipboard on desktop.
 */
export function ShareRow({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [shareable, setShareable] = useState(false);

  // navigator.share only exists on some clients, so the button is revealed on
  // mount rather than rendered server-side and hidden.
  const [checked, setChecked] = useState(false);
  if (!checked) {
    setChecked(true);
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      setShareable(true);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked (insecure context or denied) — the share links still work.
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title, url });
    } catch {
      // Cancelled, or the sheet failed — nothing to report.
    }
  }

  const iconClass =
    "grid h-9 w-9 place-items-center rounded-lg border border-border text-muted transition hover:border-sunset/50 hover:text-sunset";

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted">Share</span>

      {shareable ? (
        <button type="button" onClick={nativeShare} aria-label="Share this article" className={iconClass}>
          <Share2 className="h-4 w-4" />
        </button>
      ) : null}

      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        className={iconClass}
      >
        <SiFacebook className="h-4 w-4" />
      </a>
      <a
        href={`https://x.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
        className={iconClass}
      >
        <SiX className="h-4 w-4" />
      </a>

      <button type="button" onClick={copy} aria-label="Copy link" className={iconClass}>
        {copied ? <Check className="h-4 w-4 text-forest" /> : <Link2 className="h-4 w-4" />}
      </button>
      <span aria-live="polite" className="text-xs text-muted">
        {copied ? "Link copied" : ""}
      </span>
    </div>
  );
}
