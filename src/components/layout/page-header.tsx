import type { LucideIcon } from "lucide-react";

/**
 * The compact page header used across in-app pages inside the app shell — an
 * icon chip, title, and optional subtitle, matching the shell mock. Replaces the
 * full-bleed PageHero on index/content pages (which doesn't belong beside the
 * persistent rail). An optional `action` slot sits on the right.
 */
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sunset/12 text-sunset">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-bold text-ink">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
