import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type PageHeroProps = {
  image: string;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  variant?: "home" | "page";
};

export function PageHero({
  image,
  eyebrow,
  title,
  description,
  actions,
  variant = "page",
}: PageHeroProps) {
  const isHome = variant === "home";

  return (
    <section className="relative w-full overflow-hidden">
      <div
        className={`relative w-full ${
          isHome
            ? "min-h-[calc(100svh-4rem)]"
            : "h-[44svh] min-h-72 max-h-120"
        }`}
      >
        <div
          className={`absolute inset-0 bg-cover ${isHome ? "bg-bottom-right" : "bg-center"}`}
          style={{ backgroundImage: `url(${image})` }}
          aria-hidden="true"
        />
        <div
          className={`absolute inset-0 ${
            isHome
              ? "bg-linear-to-r from-asphalt/95 via-asphalt/70 to-asphalt/15"
              : "bg-linear-to-r from-asphalt via-asphalt/80 to-asphalt/20"
          }`}
          aria-hidden="true"
        />
        {isHome ? (
          <div
            className="absolute inset-0 bg-linear-to-t from-asphalt/45 via-transparent to-asphalt/20"
            aria-hidden="true"
          />
        ) : null}
        <div
          className={`relative mx-auto flex h-full w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${
            isHome ? "items-center py-12 lg:py-16" : "items-end py-12 lg:py-16"
          }`}
        >
          <div className={`text-white ${isHome ? "max-w-lg lg:max-w-xl" : "max-w-2xl"}`}>
            {isHome ? <span className="mb-6 block h-1 w-16 rounded-full bg-sunset/90" /> : null}
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sunset">{eyebrow}</p>
            )}
            <h1
              className={`mt-3 font-display font-bold leading-[0.95] tracking-tight ${
                isHome ? "text-6xl sm:text-7xl lg:text-8xl" : "text-4xl sm:text-6xl"
              }`}
            >
              {title}
            </h1>
            {description && (
              <p
                className={`mt-5 max-w-xl text-slate-200 ${
                  isHome ? "text-base sm:text-xl lg:text-2xl" : "text-sm sm:text-base"
                }`}
              >
                {description}
              </p>
            )}
            {actions ? <div className={`flex flex-wrap gap-3 ${isHome ? "mt-10" : "mt-8"}`}>{actions}</div> : null}
          </div>
        </div>
        {isHome ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center">
            <ChevronDown className="h-8 w-8 animate-bounce text-white/70" aria-hidden="true" />
          </div>
        ) : null}
      </div>
    </section>
  );
}
