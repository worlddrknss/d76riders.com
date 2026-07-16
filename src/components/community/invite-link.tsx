"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function InviteLink({ url, code }: { url: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied; the input is selectable as a fallback.
      setCopied(false);
    }
  }

  async function share() {
    // navigator.share is mobile-only and requires a user gesture.
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: "Ride with District 76", url });
        return;
      } catch {
        // Share sheet dismissed — fall through to copy.
      }
    }
    await copy();
  }

  return (
    <div className="mt-6 rounded-xl border border-border bg-canvas p-4">
      <label htmlFor="invite-url" className="text-xs font-semibold uppercase tracking-wide text-muted">
        Your invite link
      </label>
      <div className="mt-2 flex flex-wrap gap-2">
        <input
          id="invite-url"
          readOnly
          value={url}
          onFocus={(event) => event.currentTarget.select()}
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm text-ink"
        />
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button variant="accent" size="sm" onClick={share}>
          <Share2 className="h-3.5 w-3.5" />
          Share
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted">
        Code <span className="font-mono font-semibold text-ink">{code}</span> — riders can also enter this on
        the join form.
      </p>
    </div>
  );
}
