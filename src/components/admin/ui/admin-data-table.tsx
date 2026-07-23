"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from "lucide-react";

export type AdminColumn<T> = {
  key: string;
  header: ReactNode;
  /** The cell. */
  cell: (row: T) => ReactNode;
  /** Return a comparable value to make the column sortable. */
  sortValue?: (row: T) => string | number;
  /** Text this column contributes to the search box. */
  searchValue?: (row: T) => string;
  className?: string;
  headerClassName?: string;
};

export type AdminFilter = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
};

/**
 * The admin console's list table.
 *
 * Four screens had each hand-rolled their own `<table>`, so sorting existed on
 * none of them, search on none of them, and paging on none of them — a table
 * with two hundred rows simply printed two hundred rows. This holds the parts
 * every list needs and keeps them consistent: a search box, dropdown filters,
 * click-to-sort headers, bulk selection, and paging.
 *
 * Filtering and sorting happen on the client, which is right for the hundreds
 * of rows these screens hold and wrong past that; when a table outgrows it,
 * the props are shaped so the work can move server-side without the callers
 * changing.
 */
export function AdminDataTable<T>({
  rows,
  columns,
  rowKey,
  filters = [],
  filterFn,
  searchPlaceholder = "Search…",
  pageSize = 25,
  emptyMessage = "Nothing here yet.",
  toolbar,
  bulkActions,
}: {
  rows: T[];
  columns: AdminColumn<T>[];
  rowKey: (row: T) => string;
  filters?: AdminFilter[];
  /** Applied per active filter; return false to hide the row. */
  filterFn?: (row: T, key: string, value: string) => boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  emptyMessage?: string;
  /** Extra controls on the right of the toolbar, e.g. a New button. */
  toolbar?: ReactNode;
  /** Rendered when rows are selected; receives the selected rows. */
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key: string; dir: "asc" | "desc" } | null>(null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    let out = rows.filter((row) => {
      for (const [key, value] of Object.entries(active)) {
        if (!value || value === "ALL") continue;
        if (filterFn && !filterFn(row, key, value)) return false;
      }
      if (!needle) return true;
      return columns.some((col) => col.searchValue?.(row).toLowerCase().includes(needle));
    });

    if (sort) {
      const col = columns.find((c) => c.key === sort.key);
      if (col?.sortValue) {
        const dir = sort.dir === "asc" ? 1 : -1;
        out = [...out].sort((a, b) => {
          const av = col.sortValue!(a);
          const bv = col.sortValue!(b);
          if (av === bv) return 0;
          return av > bv ? dir : -dir;
        });
      }
    }
    return out;
  }, [rows, columns, query, active, sort, filterFn]);

  // A filter change can strand you past the last page; clamp rather than
  // showing an empty table with rows sitting one click away.
  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const current = Math.min(page, pageCount - 1);
  const pageRows = visible.slice(current * pageSize, current * pageSize + pageSize);

  const selectedRows = rows.filter((r) => selected.has(rowKey(r)));
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(rowKey(r)));

  function toggleAllOnPage() {
    setSelected((old) => {
      const next = new Set(old);
      for (const row of pageRows) {
        const key = rowKey(row);
        if (allOnPageSelected) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  }

  function toggleRow(key: string) {
    setSelected((old) => {
      const next = new Set(old);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function sortBy(key: string) {
    setSort((old) => {
      if (old?.key !== key) return { key, dir: "asc" };
      if (old.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  }

  const selectable = Boolean(bulkActions);
  const colCount = columns.length + (selectable ? 1 : 0);

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            className="w-full rounded-lg border border-white/15 bg-white/5 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-sunset/70 focus:outline-none"
          />
        </div>

        {filters.map((filter) => (
          <select
            key={filter.key}
            value={active[filter.key] ?? "ALL"}
            onChange={(e) => {
              setActive((old) => ({ ...old, [filter.key]: e.target.value }));
              setPage(0);
            }}
            aria-label={filter.label}
            className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-slate-200 focus:border-sunset/70 focus:outline-none"
          >
            <option value="ALL">{filter.label}: All</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ))}

        {toolbar ? <div className="ml-auto flex items-center gap-2">{toolbar}</div> : null}
      </div>

      {/* Bulk bar — only present once something is selected, so it never
          occupies space it hasn't earned. */}
      {selectable && selectedRows.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-sunset/30 bg-sunset/10 px-4 py-2.5">
          <p className="text-sm font-semibold text-white">
            {selectedRows.length} selected
          </p>
          <div className="flex items-center gap-2">
            {bulkActions!(selectedRows, () => setSelected(new Set()))}
          </div>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs font-semibold text-slate-300 transition hover:text-white"
          >
            Clear
          </button>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/3">
        <table className="w-full min-w-[42rem] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5">
            <tr>
              {selectable ? (
                <th className="w-10 px-4 py-2.5">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAllOnPage}
                    aria-label="Select all on this page"
                    className="h-4 w-4 rounded border-white/20 bg-white/5 accent-sunset"
                  />
                </th>
              ) : null}
              {columns.map((col) => {
                const sorted = sort?.key === col.key;
                return (
                  <th
                    key={col.key}
                    className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-slate-400 ${col.headerClassName ?? ""}`}
                  >
                    {col.sortValue ? (
                      <button
                        type="button"
                        onClick={() => sortBy(col.key)}
                        className={`inline-flex items-center gap-1 transition hover:text-white ${sorted ? "text-white" : ""}`}
                      >
                        {col.header}
                        {sorted ? (
                          sort!.dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : null}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-4 py-10 text-center text-sm text-slate-500">
                  {query || Object.values(active).some((v) => v && v !== "ALL")
                    ? "No rows match those filters."
                    : emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => {
                const key = rowKey(row);
                return (
                  <tr key={key} className="transition hover:bg-white/[0.03]">
                    {selectable ? (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(key)}
                          onChange={() => toggleRow(key)}
                          aria-label="Select row"
                          className="h-4 w-4 rounded border-white/20 bg-white/5 accent-sunset"
                        />
                      </td>
                    ) : null}
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3 align-middle text-slate-300 ${col.className ?? ""}`}>
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paging, stated in rows rather than page numbers — "showing 1–25 of
          212" answers the question people actually have. */}
      {visible.length > pageSize ? (
        <div className="flex items-center justify-between gap-3 text-xs text-slate-400">
          <p>
            Showing {current * pageSize + 1}–{Math.min(visible.length, (current + 1) * pageSize)} of{" "}
            <span className="font-semibold text-slate-200">{visible.length}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage(Math.max(0, current - 1))}
              disabled={current === 0}
              className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1.5 font-semibold transition hover:bg-white/10 disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <span className="px-2">
              {current + 1} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(Math.min(pageCount - 1, current + 1))}
              disabled={current >= pageCount - 1}
              className="inline-flex items-center gap-1 rounded-md border border-white/15 px-2.5 py-1.5 font-semibold transition hover:bg-white/10 disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
