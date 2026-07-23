import type { ReactNode } from "react";

type AdminSectionHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

/** The banner every admin section page opens with. */
export function AdminSectionHeader({ eyebrow, title, description, actions }: AdminSectionHeaderProps) {
  return (
    <section className="route-lines rounded-2xl border border-white/10 p-6 shadow-2xl shadow-black/20">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">{eyebrow}</p>
          <h1 className="mt-2 font-display text-4xl text-white">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">{description}</p>
        </div>
        {actions}
      </div>
    </section>
  );
}
