"use client";

import { useTransition } from "react";
import { Star } from "lucide-react";

import { toggleEventFeaturedAction } from "@/app/admin/community/actions";

export function FeatureEventToggle({ eventId, featured }: { eventId: string; featured: boolean }) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => toggleEventFeaturedAction(eventId))}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
        featured
          ? "border-sunset/50 bg-sunset/15 text-orange-100 hover:bg-sunset/25"
          : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25 hover:text-white"
      }`}
      aria-pressed={featured}
    >
      <Star className={`h-3.5 w-3.5 ${featured ? "fill-current" : ""}`} />
      {featured ? "Featured" : "Feature"}
    </button>
  );
}
