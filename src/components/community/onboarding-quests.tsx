import Link from "next/link";
import {
  Bike,
  CalendarCheck,
  CircleCheck,
  FileCheck2,
  HeartPulse,
  NotebookPen,
  UserPlus,
  UserRound,
  type LucideIcon,
} from "lucide-react";

import type { QuestProgress } from "@/lib/quests";

// Same approach as badge icons: an explicit map keeps names data-driven without
// bundling all of lucide or crashing on a typo.
const ICONS: Record<string, LucideIcon> = {
  "circle-check": CircleCheck,
  bike: Bike,
  "calendar-check": CalendarCheck,
  "file-check-2": FileCheck2,
  "heart-pulse": HeartPulse,
  "notebook-pen": NotebookPen,
  "user-plus": UserPlus,
  "user-round": UserRound,
};

/**
 * A slim strip of what's left to do, sized to sit above the profile without
 * competing with it.
 *
 * Only outstanding steps are listed: the count and bar already say how much is
 * done, so rendering finished steps as struck-through rows just pushes the
 * rider's actual profile down the page. The whole strip disappears once the
 * last step is ticked — onboarding shouldn't outlive onboarding.
 */
export function OnboardingQuests({ quests }: { quests: QuestProgress[] }) {
  if (quests.length === 0) return null;

  const remaining = quests.filter((quest) => !quest.completed);
  if (remaining.length === 0) return null;

  const done = quests.length - remaining.length;
  const pct = Math.round((done / quests.length) * 100);

  return (
    <section className="rounded-xl border border-border bg-surface px-4 py-3 shadow-soft">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="text-sm font-semibold text-ink">Get started</h2>

        <div className="flex min-w-32 flex-1 items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-sunset transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 text-xs tabular-nums text-muted">
            {done}/{quests.length}
          </span>
        </div>
      </div>

      <ul className="mt-2.5 flex flex-wrap gap-1.5">
        {remaining.map((quest) => {
          const Icon = ICONS[quest.icon] ?? CircleCheck;
          return (
            <li key={quest.id}>
              <Link
                href={quest.href}
                title={quest.description}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium text-ink transition hover:border-sunset/50 hover:bg-sunset/5 hover:text-sunset"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 text-sunset" />
                {quest.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
