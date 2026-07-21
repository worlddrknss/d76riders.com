import { describe, expect, it } from "vitest";

import { formatPrice } from "@/lib/marketplace";

describe("formatPrice", () => {
  it("shows Make offer for zero or negative cents", () => {
    expect(formatPrice(0)).toBe("Make offer");
    expect(formatPrice(-100)).toBe("Make offer");
  });

  it("omits cents for round dollar amounts", () => {
    expect(formatPrice(129900)).toBe("$1,299");
  });

  it("keeps cents when the amount is not round", () => {
    expect(formatPrice(129950)).toBe("$1,299.50");
  });
});
