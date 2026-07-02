"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { useTransition } from "react";

export function RoadFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get("q") ?? "";
  const currentDifficulty = searchParams.get("difficulty") ?? "";
  const currentSort = searchParams.get("sort") ?? "scenic";

  function updateParams(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`/roads?${params.toString()}`);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <input
          type="search"
          placeholder="Search roads..."
          defaultValue={currentSearch}
          onChange={(e) => updateParams("q", e.target.value)}
          className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2.5 text-sm text-ink placeholder:text-muted focus:border-sunset focus:outline-none"
        />
      </div>
      <select
        defaultValue={currentDifficulty}
        onChange={(e) => updateParams("difficulty", e.target.value)}
        className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink focus:border-sunset focus:outline-none"
      >
        <option value="">All Difficulties</option>
        <option value="BEGINNER_FRIENDLY">Beginner Friendly</option>
        <option value="INTERMEDIATE">Intermediate</option>
        <option value="SCENIC">Scenic</option>
      </select>
      <select
        defaultValue={currentSort}
        onChange={(e) => updateParams("sort", e.target.value)}
        className="rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-ink focus:border-sunset focus:outline-none"
      >
        <option value="scenic">Highest Rated</option>
        <option value="newest">Newest</option>
        <option value="distance">Longest</option>
      </select>
      {isPending && (
        <span className="text-xs text-muted animate-pulse">Filtering...</span>
      )}
    </div>
  );
}
