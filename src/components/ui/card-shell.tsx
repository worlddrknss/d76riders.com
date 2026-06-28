import type { PropsWithChildren } from "react";

interface CardShellProps extends PropsWithChildren {
  className?: string;
}

export function CardShell({ className, children }: CardShellProps) {
  return (
    <article
      className={`rounded-[1.5rem] rounded-bl-[0.5rem] border border-border bg-surface p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift ${className ?? ""}`}
    >
      {children}
    </article>
  );
}
