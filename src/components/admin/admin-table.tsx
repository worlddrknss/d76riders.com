import type { ReactNode } from "react";

/**
 * The admin list table.
 *
 * Admin pages had drifted into stacked forms and bare lists, which meant a
 * moderator could not see a row's state at a glance or act on it without
 * hunting. These are the pieces of a scannable table: header, rows, and a
 * right-hand actions column, styled for the dark admin shell.
 *
 * Deliberately dumb. It takes children rather than a column config, because the
 * cells vary too much between pages for a schema to be worth the indirection.
 */

export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[42rem] text-left text-sm">{children}</table>
    </div>
  );
}

export function AdminTableHead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-b border-white/10 bg-white/5">
      <tr>{children}</tr>
    </thead>
  );
}

export function AdminTh({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400 ${className}`}>
      {children}
    </th>
  );
}

export function AdminTableBody({ children }: { children: ReactNode }) {
  return <tbody className="divide-y divide-white/5">{children}</tbody>;
}

export function AdminTr({ children }: { children: ReactNode }) {
  return <tr className="transition hover:bg-white/[0.03]">{children}</tr>;
}

export function AdminTd({
  children,
  className = "",
}: {
  children?: ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 align-middle text-slate-300 ${className}`}>{children}</td>;
}

/** Nothing to show, said in the row where the rows would be. */
export function AdminTableEmpty({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-10 text-center text-sm text-slate-500">
        {children}
      </td>
    </tr>
  );
}

const TONES = {
  neutral: "border-white/15 bg-white/5 text-slate-300",
  good: "border-forest/40 bg-forest/15 text-emerald-200",
  warn: "border-sunset/40 bg-sunset/10 text-sunset",
  bad: "border-red-500/40 bg-red-500/10 text-red-300",
} as const;

/** A row's state, readable without clicking into it. */
export function AdminBadge({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof TONES;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.08em] ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** The actions column: icon-sized, right-aligned, never wrapping. */
export function AdminRowActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-1">{children}</div>;
}
