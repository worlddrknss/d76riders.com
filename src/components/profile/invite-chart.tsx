"use client";

import { useMemo, useState } from "react";

/**
 * Opens and joins over the last 30 days.
 *
 * Hand-rolled SVG rather than a charting library: two series of thirty points
 * does not justify shipping one to every visitor.
 *
 * Both series share one axis on purpose. Opens will always dwarf joins, and the
 * temptation is a second y-scale to make the joins line visible — that would be
 * a lie, because it lets two unrelated scales be read as if they cross. The gap
 * between the lines is the point: it is the conversion rate, drawn.
 */

export type InvitePoint = { date: string; opens: number; joins: number };

// Orange vs green fails for red-green colourblind readers (ΔE 2.9 under protan
// — indistinguishable). Orange vs blue measures ΔE 19.7 on the same check.
const OPENS = "#e8703a";
const JOINS = "#3a6ea5";

const W = 720;
const H = 200;
const PAD = { top: 16, right: 16, bottom: 24, left: 32 };

export function InviteChart({ data }: { data: InvitePoint[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const { openPath, joinPath, max, x, y } = useMemo(() => {
    const peak = Math.max(1, ...data.map((d) => Math.max(d.opens, d.joins)));
    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;
    const xf = (i: number) => PAD.left + (data.length <= 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const yf = (v: number) => PAD.top + innerH - (v / peak) * innerH;
    const line = (pick: (d: InvitePoint) => number) =>
      data.map((d, i) => `${i === 0 ? "M" : "L"}${xf(i).toFixed(1)},${yf(pick(d)).toFixed(1)}`).join(" ");
    return { openPath: line((d) => d.opens), joinPath: line((d) => d.joins), max: peak, x: xf, y: yf };
  }, [data]);

  const totals = useMemo(
    () => data.reduce((a, d) => ({ opens: a.opens + d.opens, joins: a.joins + d.joins }), { opens: 0, joins: 0 }),
    [data],
  );

  // Nothing has happened yet. A flat line pinned to zero reads as broken, so say
  // so in words instead of drawing thirty days of nothing.
  if (totals.opens === 0 && totals.joins === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center shadow-soft">
        <p className="text-sm text-muted">
          No link opens in the last 30 days. Share your link and this fills in.
        </p>
      </div>
    );
  }

  const point = hover === null ? null : data[hover];

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-soft">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-display text-sm font-semibold text-ink">Last 30 days</h3>
        {/* Two series always get a legend — identity is never colour alone. */}
        <div className="flex items-center gap-4 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded-full" style={{ background: OPENS }} />
            Opens
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded-full" style={{ background: JOINS }} />
            Joins
          </span>
        </div>
      </div>

      <div className="relative mt-2">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={`Invite link activity over the last 30 days: ${totals.opens} opens, ${totals.joins} joins.`}
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - box.left) / box.width) * W;
            const i = Math.round(((px - PAD.left) / (W - PAD.left - PAD.right)) * (data.length - 1));
            setHover(i >= 0 && i < data.length ? i : null);
          }}
        >
          {/* Recessive grid: three lines, behind everything. */}
          {[0, 0.5, 1].map((t) => (
            <line
              key={t}
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(max * t)}
              y2={y(max * t)}
              stroke="currentColor"
              className="text-border"
              strokeWidth={1}
            />
          ))}
          <text x={4} y={y(max) + 4} className="fill-muted text-[10px]">
            {max}
          </text>
          <text x={4} y={y(0) + 4} className="fill-muted text-[10px]">
            0
          </text>

          {hover !== null ? (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={PAD.top}
              y2={H - PAD.bottom}
              stroke="currentColor"
              className="text-muted/40"
              strokeWidth={1}
            />
          ) : null}

          <path d={openPath} fill="none" stroke={OPENS} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <path d={joinPath} fill="none" stroke={JOINS} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {hover !== null && point ? (
            <>
              {/* 2px surface ring so a marker on a line stays legible. */}
              <circle cx={x(hover)} cy={y(point.opens)} r={4} fill={OPENS} stroke="var(--surface)" strokeWidth={2} />
              <circle cx={x(hover)} cy={y(point.joins)} r={4} fill={JOINS} stroke="var(--surface)" strokeWidth={2} />
            </>
          ) : null}

          <text x={PAD.left} y={H - 6} className="fill-muted text-[10px]">
            {data[0]?.date}
          </text>
          <text x={W - PAD.right} y={H - 6} textAnchor="end" className="fill-muted text-[10px]">
            {data[data.length - 1]?.date}
          </text>
        </svg>

        {point ? (
          <div className="pointer-events-none absolute -top-1 left-1/2 -translate-x-1/2 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs shadow-lift">
            <span className="font-semibold text-ink">{point.date}</span>
            <span className="ml-2 text-muted">
              {point.opens} {point.opens === 1 ? "open" : "opens"} · {point.joins}{" "}
              {point.joins === 1 ? "join" : "joins"}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
