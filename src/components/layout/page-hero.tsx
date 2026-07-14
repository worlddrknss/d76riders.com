"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

type PageHeroProps = {
  image: string;
  video?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  variant?: "home" | "page";
};

export function PageHero({
  image,
  video,
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
            ? "min-h-[calc(100svh-5.5rem)]"
            : "h-[44svh] min-h-72 max-h-120"
        }`}
      >
        {video ? (
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
            poster={image}
            aria-hidden="true"
          >
            <source src={video} type="video/mp4" />
          </video>
        ) : (
          <motion.div
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className={`absolute inset-0 bg-cover ${isHome ? "bg-bottom-right" : "bg-center"}`}
            style={{ backgroundImage: `url(${image})` }}
            aria-hidden="true"
          />
        )}
        <div
          className={`absolute inset-0 ${
            isHome
              ? "bg-asphalt/55"
              : "bg-linear-to-r from-asphalt via-asphalt/80 to-asphalt/20"
          }`}
          aria-hidden="true"
        />
        {isHome ? null : null}
        <div
          className={`relative mx-auto flex h-full w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${
            isHome ? "items-center justify-center py-24 text-center" : "items-end py-12 lg:py-16"
          }`}
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
            className={`text-white ${isHome ? "max-w-2xl" : "max-w-2xl"}`}
          >
            {isHome ? <span className="mx-auto mb-6 block h-1 w-16 rounded-full bg-sunset/90" /> : null}
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
                className={`mt-5 text-slate-200 ${
                  isHome ? "mx-auto max-w-xl text-lg sm:text-xl lg:text-2xl" : "max-w-xl text-sm sm:text-base"
                }`}
              >
                {description}
              </p>
            )}
            {actions ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.6, ease: "easeOut" }}
                className={`flex flex-wrap gap-3 ${isHome ? "mt-10 justify-center" : "mt-8"}`}
              >
                {actions}
              </motion.div>
            ) : null}
          </motion.div>
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
