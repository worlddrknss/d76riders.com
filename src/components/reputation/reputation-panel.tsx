import Link from "next/link";
import type { BadgeTier, SkillLevel, TrustLevel } from "@prisma/client";
import { Award } from "lucide-react";

import { BadgeChip } from "@/components/reputation/badge-chip";
import { TrustBadge } from "@/components/reputation/trust-badge";

export type ReputationPanelProps = {
  trust: {
    score: number;
    level: TrustLevel;
    eventsAttended: number;
    milesRidden: number;
    noShows: number;
    attendanceRate: number;
    punctualityRate: number;
    safetyAcked: boolean;
  } | null;
  badges: { id: string; name: string; icon: string; tier: BadgeTier; description: string }[];
  skills: { id: string; name: string; level: SkillLevel; verified: boolean }[];
};

const SKILL_LABEL: Record<SkillLevel, string> = {
  LEARNING: "Learning",
  PRACTICING: "Practicing",
  PROFICIENT: "Proficient",
  MENTOR: "Mentor",
};

const pct = (value: number) => `${Math.round(value * 100)}%`;

export function ReputationPanel({ trust, badges, skills }: ReputationPanelProps) {
  // Nothing earned yet — render nothing rather than a card whose only content is
  // "you have nothing". The onboarding checklist already tells a new rider what
  // to do; an empty Progression box just pushes real profile content down.
  const hasAnything =
    (trust !== null && trust.eventsAttended > 0) || badges.length > 0 || skills.length > 0;

  if (!hasAnything) return null;

  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-ink">Progression</h2>
        <Link href="/leaderboard" className="text-xs font-semibold text-sunset hover:underline">
          Leaderboard →
        </Link>
      </div>

      {trust ? (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <TrustBadge level={trust.level} score={trust.score} />
            <span className="text-xs text-muted">Trust score {trust.score}/100</span>
          </div>

          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-sunset" style={{ width: `${trust.score}%` }} />
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Rides</dt>
              <dd className="font-semibold text-ink">{trust.eventsAttended}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Miles</dt>
              <dd className="font-semibold text-ink">{trust.milesRidden.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">Attendance</dt>
              <dd className="font-semibold text-ink">{pct(trust.attendanceRate)}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted">On time</dt>
              <dd className="font-semibold text-ink">{pct(trust.punctualityRate)}</dd>
            </div>
          </dl>

          {trust.noShows > 0 ? (
            <p className="mt-2 text-xs text-muted">
              {trust.noShows} no-show{trust.noShows === 1 ? "" : "s"} counted against attendance.
            </p>
          ) : null}
        </>
      ) : null}

      <div className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Badges</h3>
        {badges.length === 0 ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-muted">
            <Award className="h-4 w-4" />
            No badges earned yet.
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-2">
            {badges.map((badge) => (
              <BadgeChip
                key={badge.id}
                name={badge.name}
                icon={badge.icon}
                tier={badge.tier}
                description={badge.description}
              />
            ))}
          </div>
        )}
      </div>

      {skills.length > 0 ? (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Skills</h3>
          <ul className="mt-2 space-y-1">
            {skills.map((skill) => (
              <li key={skill.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-ink">{skill.name}</span>
                <span className="flex items-center gap-2">
                  <span className="text-muted">{SKILL_LABEL[skill.level]}</span>
                  {skill.verified ? (
                    <span className="rounded-full border border-forest/40 bg-forest/10 px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-forest">
                      Verified
                    </span>
                  ) : (
                    <span className="rounded-full border border-border px-2 py-0.5 text-[0.6rem] font-semibold uppercase text-muted">
                      Self-reported
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
