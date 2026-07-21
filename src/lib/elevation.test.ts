import { describe, expect, it } from "vitest";

import { elevationDifficulty } from "@/lib/elevation";

describe("elevationDifficulty", () => {
  it("returns null when inputs are missing or distance is non-positive", () => {
    expect(elevationDifficulty(null, 500)).toBeNull();
    expect(elevationDifficulty(10, null)).toBeNull();
    expect(elevationDifficulty(0, 500)).toBeNull();
  });

  it("classifies by feet per mile", () => {
    expect(elevationDifficulty(10, 400)?.level).toBe(1); // 40 ft/mi -> Easy
    expect(elevationDifficulty(10, 1000)?.level).toBe(2); // 100 ft/mi -> Moderate
    expect(elevationDifficulty(10, 2000)?.level).toBe(3); // 200 ft/mi -> Challenging
  });
});
