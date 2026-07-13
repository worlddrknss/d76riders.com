"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-sunset text-white shadow-sm"
                : "text-muted hover:bg-canvas hover:text-ink"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
