import { describe, expect, it } from "vitest";

import { mapWithConcurrency } from "@/lib/concurrency";

/** Resolves after `ms`, so overlapping work is observable. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("mapWithConcurrency", () => {
  it("returns results in input order, not completion order", async () => {
    // Descending delays: the last item finishes first.
    const out = await mapWithConcurrency([30, 20, 10, 0], 4, async (ms, i) => {
      await delay(ms);
      return i;
    });
    expect(out).toEqual([0, 1, 2, 3]);
  });

  it("never exceeds the limit — the whole reason this exists", async () => {
    let inFlight = 0;
    let peak = 0;

    await mapWithConcurrency(Array.from({ length: 20 }), 3, async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await delay(5);
      inFlight -= 1;
      return null;
    });

    expect(peak).toBe(3);
  });

  it("still runs everything when the limit exceeds the list", async () => {
    const seen: number[] = [];
    await mapWithConcurrency([1, 2, 3], 50, async (n) => {
      seen.push(n);
      return n;
    });
    expect(seen.sort()).toEqual([1, 2, 3]);
  });

  it("treats a zero or negative limit as one at a time rather than stalling", async () => {
    let peak = 0;
    let inFlight = 0;
    const out = await mapWithConcurrency([1, 2, 3], 0, async (n) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await delay(1);
      inFlight -= 1;
      return n * 2;
    });
    expect(peak).toBe(1);
    expect(out).toEqual([2, 4, 6]);
  });

  it("handles an empty list without spawning workers", async () => {
    let calls = 0;
    const out = await mapWithConcurrency([], 4, async () => {
      calls += 1;
      return 1;
    });
    expect(out).toEqual([]);
    expect(calls).toBe(0);
  });

  it("propagates the first rejection, like Promise.all", async () => {
    await expect(
      mapWithConcurrency([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error("boom");
        return n;
      }),
    ).rejects.toThrow("boom");
  });
});
