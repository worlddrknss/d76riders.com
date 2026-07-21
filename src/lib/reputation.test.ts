import { describe, expect, it, vi } from "vitest";

// reputation.ts imports the real Prisma client + challenge helpers at load time;
// stub them so the module imports cleanly. computeTrustSignals takes its db as
// an argument, so the tests drive a fake instead of a real database.
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/challenges", () => ({ syncRiderChallenges: vi.fn() }));

import { computeTrustSignals } from "@/lib/reputation";

type Fake = {
  checkIns?: { checkInAt: Date; event: { startsAt: Date; distanceMiles: number | null } }[];
  committed?: number;
  logs?: number;
  loggedMiles?: number | null;
  waivers?: { version: number; acknowledgments: { version: number }[] }[];
};

function fakeDb(o: Fake) {
  return {
    eventCheckIn: { findMany: async () => o.checkIns ?? [] },
    rsvp: { count: async () => o.committed ?? 0 },
    rideLog: {
      aggregate: async () => ({ _count: { _all: o.logs ?? 0 }, _sum: { distanceMiles: o.loggedMiles ?? 0 } }),
    },
    policy: { findMany: async () => o.waivers ?? [] },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const onTime = (startsAt: Date, miles = 0) => ({ checkInAt: startsAt, event: { startsAt, distanceMiles: miles } });

describe("trust scoring", () => {
  it("a rider with no history is NEW at score 0", async () => {
    const s = await computeTrustSignals("r1", fakeDb({}));
    expect(s.score).toBe(0);
    expect(s.level).toBe("NEW");
  });

  it("one on-time attended ride + safety + a logged ride reaches ESTABLISHED", async () => {
    const day = new Date("2026-01-01T17:00:00Z");
    const s = await computeTrustSignals(
      "r1",
      fakeDb({
        checkIns: [onTime(day)],
        committed: 1,
        logs: 1,
        loggedMiles: 20,
        waivers: [{ version: 1, acknowledgments: [{ version: 1 }] }],
      }),
    );
    // attendance 40 + punctuality 25 + safety 15 + volume(min(1,2/12)*20≈3.3) ≈ 83
    expect(s.score).toBe(83);
    expect(s.level).toBe("ESTABLISHED"); // score >= 45 and totalRides(2) >= 2
    expect(s.milesRidden).toBe(20);
  });

  it("self-logged rides alone can't reach ESTABLISHED without group attendance", async () => {
    const s = await computeTrustSignals("r1", fakeDb({ logs: 10, loggedMiles: 5000 }));
    // only the volume component can score; attendance/punctuality/safety stay 0
    expect(s.score).toBeLessThan(45);
    expect(s.level).toBe("NEW");
  });

  it("counts a no-show against attendance rate", async () => {
    const day = new Date("2026-01-01T17:00:00Z");
    const s = await computeTrustSignals("r1", fakeDb({ checkIns: [onTime(day)], committed: 2 }));
    // committed 2, attended 1 -> one no-show, attendance 0.5
    expect(s.noShows).toBe(1);
    expect(s.attendanceRate).toBeCloseTo(0.5, 5);
  });
});
