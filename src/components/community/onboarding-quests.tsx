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

export function OnboardingQuests({ quests }: { quests: QuestProgress[] }) {
  if (quests.length === 0) return null;

  const done = quests.filter((quest) => quest.completed).length;
  const pct = Math.round((done / quests.length) * 100);

  // Once every step is done the checklist has served its purpose — hide it
  // rather than leaving a permanent all-green box on the profile.
  if (done === quests.length) return null;

  return (
    <section className="rounded-xl border border-border bg-canvas p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-semibold text-ink">Get started</h2>
        <span className="text-xs font-semibold text-muted">
          {done} of {quests.length} done
        </span>
      </div>

      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-sunset transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ul className="mt-4 space-y-2">
        {quests.map((quest) => {
          const Icon = ICONS[quest.icon] ?? CircleCheck;

          if (quest.completed) {
            return (
              <li key={quest.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
                <CircleCheck className="h-4 w-4 shrink-0 text-green-600" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-muted line-through">{quest.name}</span>
                </span>
              </li>
            );
          }

          return (
            <li key={quest.id}>
              <Link
                href={quest.href}
                className="flex items-center gap-3 rounded-lg border border-border p-3 transition hover:border-sunset/50"
              >
                <Icon className="h-4 w-4 shrink-0 text-sunset" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{quest.name}</span>
                  <span className="block text-xs text-muted">{quest.description}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-sunset">Go →</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
