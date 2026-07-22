import type { LucideIcon } from "lucide-react";

/**
 * The page header used across in-app pages inside the app shell — an icon chip,
 * optional eyebrow, title, and optional subtitle, closed with a hairline rule so
 * it reads as a header rather than the first line of content. Replaces the
 * full-bleed PageHero on index/content pages (which doesn't belong beside the
 * persistent rail). An optional `action` slot sits on the right.
 *
 * Sized to carry a content page on its own while staying out of the way on dense
 * index pages: it fills whatever width the shell gives it, with or without the
 * rail, and the subtitle keeps a readable measure at any width.
 */
export function PageHeader({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  action,
}: {
  icon: LucideIcon;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8 border-b border-border pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <span className="mt-1 grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sunset/10 text-sunset ring-1 ring-inset ring-sunset/20">
            <Icon className="h-6 w-6" />
          </span>
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-sunset">{eyebrow}</p>
            ) : null}
            <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">{title}</h1>
            {subtitle ? (
              <p className="mt-2 max-w-2xl text-base leading-relaxed text-muted">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </header>
  );
}
