import type { CSSProperties, ComponentType } from "react";

type SocialIconLinkProps = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  /** The brand's official hex, from Simple Icons' `Si*Hex` export. */
  color: string;
  riderName: string;
};

/**
 * One social link in the profile header.
 *
 * The brand colour arrives per-icon at runtime, so it can't live in a Tailwind
 * class name (those must be statically analysable). It's passed as a CSS custom
 * property instead and referenced by a static utility, which keeps the hover
 * state in CSS — no client component needed for a link.
 */
export function SocialIconLink({ label, href, icon: Icon, color, riderName }: SocialIconLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={`${riderName} on ${label}`}
      style={{ "--brand": color } as CSSProperties}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border text-muted transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
    >
      <Icon className="h-3.5 w-3.5" />
    </a>
  );
}
