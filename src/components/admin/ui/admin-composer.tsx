"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * The admin console's create/edit surface.
 *
 * Editing used to happen three different ways depending on the screen — a
 * centre dialog here, a full page there, an inline form somewhere else — so
 * nothing in the console felt like the same product. This is the one shell:
 * full screen on the console's own asphalt chrome, fields on the left, an
 * optional live preview on the right, and the submit pinned to the bottom
 * where it stays reachable however long the form runs.
 *
 * It owns the chrome and nothing else. The form, its action and its state stay
 * with the caller, so a screen can submit however it needs to.
 */
export function AdminComposer({
  open,
  onClose,
  eyebrow,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow: string;
  title: string;
  /** Usually an AdminComposerForm. */
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="safe-pb fixed inset-0 z-60 flex flex-col bg-asphalt text-slate-100"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className="safe-pt flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-3.5 sm:px-8">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sunset">{eyebrow}</p>
          <h2 className="truncate font-display text-xl text-white sm:text-2xl">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="-mr-1 rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sunset/50"
        >
          <X className="h-5 w-5" />
        </button>
      </header>
      {children}
    </div>,
    document.body,
  );
}

/**
 * The composer's body: a scrolling field column, an optional preview column,
 * and a footer that stays put. Both columns scroll independently so a long
 * form never drags the preview out of view.
 */
export function AdminComposerBody({
  children,
  preview,
  previewNote = "Roughly how it reads on the site.",
}: {
  children: ReactNode;
  preview?: ReactNode;
  previewNote?: string;
}) {
  return (
    <div
      className={`grid min-h-0 flex-1 ${preview ? "lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]" : ""}`}
    >
      <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-8">
        <div className="mx-auto max-w-2xl space-y-5">{children}</div>
      </div>

      {preview ? (
        <aside className="hidden min-h-0 overflow-y-auto border-l border-white/10 bg-white/[0.02] px-5 py-6 sm:px-8 lg:block">
          <div className="mx-auto max-w-md">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Preview</p>
            <div className="mt-3">{preview}</div>
            <p className="mt-3 text-xs text-slate-400">{previewNote}</p>
          </div>
        </aside>
      ) : null}
    </div>
  );
}

/** Pinned footer: a status note on the left, the actions on the right. */
export function AdminComposerFooter({ note, children }: { note?: ReactNode; children: ReactNode }) {
  return (
    <div className="shrink-0 border-t border-white/10 bg-asphalt px-5 py-4 sm:px-8">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
        <p className="text-xs text-slate-400">{note}</p>
        <div className="flex items-center gap-2">{children}</div>
      </div>
    </div>
  );
}

/** Shared field chrome, so every admin input is the same input. */
export const adminField =
  "w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sunset/70 focus:outline-none";
export const adminLabel = "text-xs font-semibold uppercase tracking-[0.1em] text-slate-400";

export function AdminField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-2">
      <span className={adminLabel}>{label}</span>
      {children}
      {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

/** Errors belong beside the fields that caused them, not in an alert. */
export function AdminFormError({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
      {children}
    </p>
  );
}
