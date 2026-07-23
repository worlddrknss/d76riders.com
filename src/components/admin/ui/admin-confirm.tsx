"use client";

import { useState, useTransition, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

/**
 * Destructive confirmation for the admin console.
 *
 * Five different screens were calling the browser's own `confirm()`, which is
 * unstyled, unreadable on the dark shell, and blocks the whole tab. Worse, it
 * gives the same one-line prompt whether you are unpublishing a draft or
 * deleting a badge every rider holds. This says what will actually be lost,
 * and keeps the button busy until the server has answered.
 */
export function AdminConfirm({
  trigger,
  title,
  body,
  confirmLabel = "Delete",
  onConfirm,
}: {
  /** Rendered as-is; clicking it opens the confirmation. */
  trigger: (open: () => void, pending: boolean) => ReactNode;
  title: string;
  /** What is lost, in the caller's words — not a generic "are you sure". */
  body: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function run() {
    setOpen(false);
    startTransition(async () => {
      await onConfirm();
    });
  }

  return (
    <>
      {trigger(() => setOpen(true), pending)}

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed inset-0 z-70 grid place-items-center bg-black/70 p-4 backdrop-blur-sm"
              role="dialog"
              aria-modal="true"
              aria-label={title}
              onClick={(e) => {
                if (e.target === e.currentTarget) setOpen(false);
              }}
            >
              <div className="w-full max-w-md rounded-2xl border border-white/10 bg-asphalt p-6 shadow-lift">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-500/15 text-red-300">
                    <AlertTriangle className="h-4.5 w-4.5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-lg text-white">{title}</h3>
                    <div className="mt-1.5 text-sm leading-relaxed text-slate-300">{body}</div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-400 transition hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={run}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    {confirmLabel}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
