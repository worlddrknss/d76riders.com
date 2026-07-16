"use client";

import { useState, useTransition } from "react";
import type { SkillLevel } from "@prisma/client";
import { BadgeCheck } from "lucide-react";

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

// Mentor is absent by design — it can only be conferred by an organizer, so a
// rider can never select it for themselves here.
const SELF_LEVELS: { value: SkillLevel; label: string }[] = [
  { value: "LEARNING", label: "Learning" },
  { value: "PRACTICING", label: "Practicing" },
  { value: "PROFICIENT", label: "Proficient" },
];

export function SkillTrackCard({
  slug,
  name,
  description,
  level,
  verified,
  editable,
}: SkillTrackCardProps) {
  const [current, setCurrent] = useState<SkillLevel | "">(level ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <article className="rounded-xl border border-border bg-surface p-4 shadow-soft">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-base font-semibold text-ink">{name}</h2>
            {verified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-forest/40 bg-forest/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-forest">
                <BadgeCheck className="h-3 w-3" />
                Verified
              </span>
            ) : null}
            {current === "MENTOR" ? (
              <span className="rounded-full border border-sky-400/40 bg-sky-400/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-sky-700">
                Mentor
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted">{description}</p>
          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>

        {editable ? (
          <label className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted">
            My level
            <select
              value={current === "MENTOR" ? "" : current}
              disabled={pending || current === "MENTOR"}
              onChange={(event) => {
                const next = event.target.value as SkillLevel;
                setCurrent(next);
                setError(null);
                start(async () => {
                  const result = await setMySkillAction(slug, next);
                  if (result.error) setError(result.error);
                });
              }}
              className="mt-1 block w-40 rounded-lg border border-border bg-canvas px-2 py-1.5 text-sm text-ink disabled:opacity-50"
            >
              <option value="">Not tracked</option>
              {SELF_LEVELS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {current === "MENTOR" ? (
              <span className="mt-1 block text-[0.65rem] font-normal normal-case tracking-normal text-muted">
                Mentor level is set by an organizer.
              </span>
            ) : null}
          </label>
        ) : null}
      </div>
    </article>
  );
}
