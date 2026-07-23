import { describe, expect, it } from "vitest";

import {
  HANDLE_CHANGE_DAYS,
  handleCooldownDaysLeft,
  isReservedUsername,
  isValidUsername,
  normalizeUsername,
} from "@/lib/username";

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date("2026-07-22T12:00:00.000Z");

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * DAY);
}

describe("normalizeUsername", () => {
  it("lowercases and trims, so a typed WorldDrknss matches the stored handle", () => {
    expect(normalizeUsername("  WorldDrknss ")).toBe("worlddrknss");
  });

  it("survives null and undefined", () => {
    expect(normalizeUsername(null)).toBe("");
    expect(normalizeUsername(undefined)).toBe("");
  });
});

describe("isValidUsername", () => {
  it("accepts handles inside the rules", () => {
    expect(isValidUsername("worlddrknss")).toBe(true);
    expect(isValidUsername("rider.76")).toBe(true);
    expect(isValidUsername("a_b-c")).toBe(true);
  });

  it("rejects uppercase, since handles are stored lowercase", () => {
    expect(isValidUsername("WorldDrknss")).toBe(false);
  });

  it("rejects handles that are too short or too long", () => {
    expect(isValidUsername("ab")).toBe(false);
    expect(isValidUsername("a".repeat(25))).toBe(false);
  });

  it("rejects punctuation on the ends, which reads as a typo in a URL", () => {
    expect(isValidUsername(".rider")).toBe(false);
    expect(isValidUsername("rider-")).toBe(false);
  });

  it("rejects spaces and symbols", () => {
    expect(isValidUsername("two riders")).toBe(false);
    expect(isValidUsername("rider@76")).toBe(false);
  });
});

describe("isReservedUsername", () => {
  it("blocks handles that would collide with a route or impersonate staff", () => {
    expect(isReservedUsername("admin")).toBe(true);
    expect(isReservedUsername("events")).toBe(true);
    expect(isReservedUsername("worlddrknss")).toBe(false);
  });
});

describe("handleCooldownDaysLeft", () => {
  it("lets a rider who has never changed their handle change it", () => {
    expect(handleCooldownDaysLeft(null, NOW)).toBe(0);
    expect(handleCooldownDaysLeft(undefined, NOW)).toBe(0);
  });

  it("blocks a change made moments ago for the full window", () => {
    expect(handleCooldownDaysLeft(NOW, NOW)).toBe(HANDLE_CHANGE_DAYS);
  });

  it("counts down as the window elapses", () => {
    expect(handleCooldownDaysLeft(daysAgo(1), NOW)).toBe(HANDLE_CHANGE_DAYS - 1);
    expect(handleCooldownDaysLeft(daysAgo(27), NOW)).toBe(1);
  });

  it("frees the handle exactly on the boundary, not a day later", () => {
    expect(handleCooldownDaysLeft(daysAgo(HANDLE_CHANGE_DAYS), NOW)).toBe(0);
    expect(handleCooldownDaysLeft(daysAgo(HANDLE_CHANGE_DAYS + 5), NOW)).toBe(0);
  });

  it("rounds part-days up, so it never promises sooner than it allows", () => {
    // 26.5 days elapsed leaves 1.5 — reported as 2, and a change at day 27
    // would still be refused.
    const elapsed = new Date(NOW.getTime() - 26.5 * DAY);
    expect(handleCooldownDaysLeft(elapsed, NOW)).toBe(2);
  });

  it("treats a future timestamp as a full window rather than going negative", () => {
    const future = new Date(NOW.getTime() + 5 * DAY);
    expect(handleCooldownDaysLeft(future, NOW)).toBeGreaterThan(HANDLE_CHANGE_DAYS);
  });
});
