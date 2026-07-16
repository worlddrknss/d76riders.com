import type { BadgeTier } from "@prisma/client";
import {
  Award,
  Flag,
  Gauge,
  GraduationCap,
  Grid3x3,
  Hand,
  Map,
  Milestone,
  Octagon,
  Repeat,
  ShieldCheck,
  Spline,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";

// Badge icons are stored as names in the database, so resolve them through an
// explicit map — a bad name renders the Award fallback instead of crashing, and
// this keeps tree-shaking working (a dynamic lucide import would bundle them all).
const ICONS: Record<string, LucideIcon> = {
  award: Award,
  flag: Flag,
  gauge: Gauge,
  "graduation-cap": GraduationCap,
  "grid-3x3": Grid3x3,
  hand: Hand,
  map: Map,
  milestone: Milestone,
  octagon: Octagon,
  repeat: Repeat,
  "shield-check": ShieldCheck,
  spline: Spline,
  target: Target,
  users: Users,
};

const TIER_STYLES: Record<BadgeTier, string> = {
  BRONZE: "border-orange-700/40 bg-orange-700/10 text-orange-700",
  SILVER: "border-slate-400/40 bg-slate-400/10 text-slate-500",
  GOLD: "border-amber-500/40 bg-amber-500/10 text-amber-600",
  PLATINUM: "border-sky-400/40 bg-sky-400/10 text-sky-600",
};

type BadgeChipProps = {
  name: string;
  icon: string;
  tier: BadgeTier;
  description?: string;
  /** Icon-only, for dense rows like the leaderboard. */
  compact?: boolean;
};

export function BadgeChip({ name, icon, tier, description, compact }: BadgeChipProps) {
  const Icon = ICONS[icon] ?? Award;

  if (compact) {
    return (
      <span
        title={name}
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full border ${TIER_STYLES[tier]}`}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="sr-only">{name}</span>
      </span>
    );
  }

  return (
    <span
      title={description ?? name}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${TIER_STYLES[tier]}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {name}
    </span>
  );
}
