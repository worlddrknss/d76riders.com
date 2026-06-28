type PageHeroProps = {
  image: string;
  eyebrow: string;
  title: string;
  description: string;
};

export function PageHero({ image, eyebrow, title, description }: PageHeroProps) {
  return (
    <section className="relative w-full overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${image})` }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-linear-to-r from-asphalt via-asphalt/85 to-asphalt/20"
        aria-hidden="true"
      />
      <div className="relative mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="max-w-2xl text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">{eyebrow}</p>
          <h1 className="mt-3 font-display text-4xl font-bold leading-[0.95] tracking-tight sm:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-xl text-sm text-slate-200 sm:text-base">{description}</p>
        </div>
      </div>
    </section>
  );
}
