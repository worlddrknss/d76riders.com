interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
}

export function SectionHeader({ eyebrow, title, description }: SectionHeaderProps) {
  return (
    <div className="mb-8">
      {eyebrow ? (
        <p className="mb-2 inline-flex rounded-full border border-sunset/25 bg-sunset/8 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sunset">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="max-w-4xl font-display text-3xl leading-[1.05] tracking-tight text-asphalt sm:text-5xl">{title}</h2>
      {description ? <p className="mt-3 max-w-3xl text-[0.98rem] text-muted">{description}</p> : null}
    </div>
  );
}
