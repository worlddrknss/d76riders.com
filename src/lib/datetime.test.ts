import { describe, expect, it } from "vitest";

import { formatPostTimestamp } from "@/lib/datetime";

// 2026-07-23 01:27 UTC is still 2026-07-22 20:27 in Central — the exact case
// that made the feed date a post "tomorrow" when it was formatted server-side
// with a bare toLocaleDateString().
const LATE_EVENING_CENTRAL = new Date("2026-07-23T01:27:00.000Z");

describe("formatPostTimestamp", () => {
  it("renders the viewer's local date, not the server's UTC date", () => {
    expect(formatPostTimestamp(LATE_EVENING_CENTRAL, "America/Chicago")).toBe("Jul 22, 2026 · 8:27 PM");
  });

  it("shifts both date and time per viewer zone", () => {
    expect(formatPostTimestamp(LATE_EVENING_CENTRAL, "America/New_York")).toBe("Jul 22, 2026 · 9:27 PM");
    expect(formatPostTimestamp(LATE_EVENING_CENTRAL, "America/Los_Angeles")).toBe("Jul 22, 2026 · 6:27 PM");
    // Furthest west of the set — same instant, earliest local clock.
    expect(formatPostTimestamp(LATE_EVENING_CENTRAL, "Pacific/Honolulu")).toBe("Jul 22, 2026 · 3:27 PM");
  });

  it("falls back to Central and says so when the viewer's zone is unknown", () => {
    expect(formatPostTimestamp(LATE_EVENING_CENTRAL, null)).toBe("Jul 22, 2026 · 8:27 PM CDT");
    expect(formatPostTimestamp(LATE_EVENING_CENTRAL, undefined)).toBe("Jul 22, 2026 · 8:27 PM CDT");
  });

  it("falls back rather than throwing on a bogus zone", () => {
    expect(formatPostTimestamp(LATE_EVENING_CENTRAL, "Not/AZone")).toBe("Jul 22, 2026 · 8:27 PM CDT");
  });

  it("is DST-aware — the same clock time in January reports CST", () => {
    const winter = new Date("2026-01-23T02:27:00.000Z");
    expect(formatPostTimestamp(winter, null)).toBe("Jan 22, 2026 · 8:27 PM CST");
  });
});
