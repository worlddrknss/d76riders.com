"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Segmented sub-nav that binds Account and Notifications into one Settings area,
 * so the two pages read as tabs of a single surface rather than separate places.
 */
const segments = [
  { href: "/account", label: "Account & Security" },
  { href: "/settings", label: "Notifications" },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 border-b border-border">
      {segments.map((s) => {
        const active = pathname === s.href;
        return (
          <Link
            key={s.href}
            href={s.href}
            className={`border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
              active ? "border-sunset text-ink" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {s.label}
          </Link>
        );
      })}
    </div>
  );
}
