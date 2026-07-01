"use client";

import { Link2, Share2 } from "lucide-react";
import { useState } from "react";

type ShareEventProps = {
  title: string;
  slug: string;
};

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
    </svg>
  );
}

export function ShareEvent({ title, slug }: ShareEventProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const eventUrl = typeof window !== "undefined" ? `${window.location.origin}/events/${slug}` : `/events/${slug}`;
  const encodedUrl = encodeURIComponent(eventUrl);
  const encodedTitle = encodeURIComponent(title);

  const shareLinks = [
    {
      label: "X (Twitter)",
      icon: <XIcon className="h-4 w-4" />,
      href: `https://x.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      label: "Facebook",
      icon: <FacebookIcon className="h-4 w-4" />,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
  ];

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(eventUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: no-op
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted transition hover:bg-canvas hover:text-sunset"
        aria-label="Share event"
      >
        <Share2 className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-border bg-surface p-2 shadow-lg">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">Share Event</p>
            {shareLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-asphalt transition hover:bg-canvas"
                onClick={() => setOpen(false)}
              >
                {link.icon}
                {link.label}
              </a>
            ))}

            <div className="my-1 border-t border-border" />
            <button
              type="button"
              onClick={copyLink}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-asphalt transition hover:bg-canvas"
            >
              <Link2 className="h-4 w-4 text-sunset" />
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
