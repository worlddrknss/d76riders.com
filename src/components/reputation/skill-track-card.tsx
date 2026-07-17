"use client";

import { useState, useTransition } from "react";
import type { SkillLevel } from "@prisma/client";
import {
  BadgeCheck,
  Grid3x3,
  Hand,
  Octagon,
  Spline,
  Target,
  Lock,
  type LucideIcon,
} from "lucide-react";

import { setMySkillAction } from "@/app/(site)/skills/actions";

type SkillTrackCardProps = {
  slug: string;
  name: string;
  description: string;
  icon: string;
  level: SkillLevel | null;
  verified: boolean;
  editable: boolean;
};

// Icon names are stored in the DB; resolve them through a static map so
// tree-shaking still works, the same way badge-chip.tsx does. Target is the
// fallback for any track whose icon has not been mapped yet.
const ICONS: Record<string, LucideIcon> = {
  "grid-3x3": Grid3x3,
  spline: Spline,
  hand: Hand,
  octagon: Octagon,
};

// The four rungs, in order. Mentor is last and set apart: a rider can climb the
// first three themselves, but only an organizer confers Mentor — so it is shown
// on the ladder (you can see it exists and that you are not there) but is never
// a button.
const RUNGS: { value: SkillLevel; label: string; selfSet: boolean }[] = [
  { value: "LEARNING", label: "Learning", selfSet: true },
  { value: "PRACTICING", label: "Practicing", selfSet: true },
  { value: "PROFICIENT", label: "Proficient", selfSet: true },
  { value: "MENTOR", label: "Mentor", selfSet: false },
];

const RANK: Record<SkillLevel, number> = { LEARNING: 1, PRACTICING: 2, PROFICIENT: 3, MENTOR: 4 };

export function SkillTrackCard({
  slug,
  name,
  description,
  icon,
  level,
  verified,
  editable,
}: SkillTrackCardProps) {
  const [current, setCurrent] = useState<SkillLevel | "">(level ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const Icon = ICONS[icon] ?? Target;
  const currentRank = current ? RANK[current] : 0;

  function choose(next: SkillLevel | "") {
    if (pending) return;
    const previous = current;
    setCurrent(next);
    setError(null);
    start(async () => {
      const result = await setMySkillAction(slug, next);
      if (result.error) {
        setError(result.error);
        setCurrent(previous); // put it back if the server refused
      }
    });
  }

  return (
    <article className="flex h-full flex-col rounded-xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border bg-canvas text-sunset">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-base font-semibold text-ink">{name}</h2>
            {verified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-forest/40 bg-forest/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-forest">
                <BadgeCheck className="h-3 w-3" />
                Verified
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
      </div>

      {/* The level ladder. Filled up to the current rung, so where a rider sits
          reads at a glance; for the owner each self-set rung is also the button
          that sets it. */}
      <div className="mt-4">
        <div className="grid grid-cols-4 gap-1.5">
          {RUNGS.map((rung) => {
            const filled = currentRank >= RANK[rung.value];
            const isCurrent = current === rung.value;
            const mentorLocked = !rung.selfSet;
            const base = "h-1.5 rounded-full transition";
            const tone = filled
              ? mentorLocked
                ? "bg-sky-500"
                : "bg-sunset"
              : "bg-border";

            if (!editable || mentorLocked) {
              return <span key={rung.value} className={`${base} ${tone}`} aria-hidden />;
            }
            return (
              <button
                key={rung.value}
                type="button"
                disabled={pending}
                onClick={() => choose(isCurrent ? "" : rung.value)}
                aria-pressed={isCurrent}
                aria-label={isCurrent ? `Clear ${rung.label}` : `Set ${name} to ${rung.label}`}
                className={`${base} ${tone} cursor-pointer hover:opacity-80 disabled:cursor-default`}
              />
            );
          })}
        </div>

        {editable ? (
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {RUNGS.map((rung) => {
              const isCurrent = current === rung.value;
              const mentorLocked = !rung.selfSet;
              const label = (
                <span
                  className={`flex items-center justify-center gap-0.5 text-center text-[0.65rem] font-medium leading-tight ${
                    isCurrent ? "text-ink" : "text-muted"
                  }`}
                >
                  {mentorLocked ? <Lock className="h-2.5 w-2.5" /> : null}
                  {rung.label}
                </span>
              );
              if (mentorLocked) {
                return (
                  <span key={rung.value} title="Mentor level is awarded by a ride organizer.">
                    {label}
                  </span>
                );
              }
              return (
                <button
                  key={rung.value}
                  type="button"
                  disabled={pending}
                  onClick={() => choose(isCurrent ? "" : rung.value)}
                  className="disabled:cursor-default"
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mt-2 text-xs text-muted">
            {current ? RUNGS.find((r) => r.value === current)?.label : "Not tracked yet"}
          </p>
        )}

        {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
      </div>
    </article>
  );
}
