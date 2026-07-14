"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Bike, Shield, UserRound, Video } from "lucide-react";

const tabs = [
  { href: (handle: string) => `/riders/${handle}`, label: "Profile", icon: UserRound, match: "/riders/" },
  { href: () => "/garage/mine", label: "Garage", icon: Bike, match: "/garage/mine" },
  { href: () => "/gear/mine", label: "Gear", icon: Shield, match: "/gear" },
  { href: () => "/videos/mine", label: "Videos", icon: Video, match: "/videos" },
] as const;

type RiderSubNavProps = {
  handle: string;
};

export function RiderSubNav({ handle }: RiderSubNavProps) {
  const pathname = usePathname();

  return (
    <nav className="mb-6 flex items-center gap-1 rounded-xl border border-border bg-surface p-1 shadow-soft" aria-label="Rider pages">
      {tabs.map((tab) => {
        const href = tab.href(handle);
        const isActive = pathname.startsWith(tab.match);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.label}
            href={href}
            className={`relative inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? "text-white"
                : "text-muted hover:bg-canvas hover:text-ink"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="rider-tab-pill"
                className="absolute inset-0 rounded-lg bg-sunset shadow-sm"
                transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
              />
            )}
            <span className="relative z-10 inline-flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
