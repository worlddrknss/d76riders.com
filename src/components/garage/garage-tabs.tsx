"use client";

import { useState } from "react";

/**
 * Sub-navigation for the profile Garage tab — Bikes / Gear / Service — matching
 * the app-shell mock. Content nodes are built on the server and passed in; this
 * just switches which one is visible. Service is owner-only (public viewers get
 * Bikes + Gear).
 */
export function GarageTabs({
  bikes,
  gear,
  service,
}: {
  bikes: React.ReactNode;
  gear: React.ReactNode;
  service?: React.ReactNode;
}) {
  const tabs = [
    { id: "bikes", label: "Bikes", node: bikes },
    { id: "gear", label: "Gear", node: gear },
    ...(service ? [{ id: "service", label: "Service", node: service }] : []),
  ];
  const [active, setActive] = useState("bikes");
  const current = tabs.find((t) => t.id === active) ?? tabs[0];

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActive(t.id)}
            className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
              active === t.id
                ? "border-sunset bg-sunset text-white"
                : "border-border text-muted hover:border-sunset hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{current.node}</div>
    </div>
  );
}
