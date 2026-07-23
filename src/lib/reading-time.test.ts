import { describe, expect, it } from "vitest";

import { readingMinutes } from "@/lib/reading-time";

describe("readingMinutes", () => {
  it("never reports zero, which would read as an error", () => {
    expect(readingMinutes("")).toBe(1);
    expect(readingMinutes("<p>Short.</p>")).toBe(1);
  });

  it("ignores markup so tags don't inflate the estimate", () => {
    const words = Array.from({ length: 225 }, () => "word").join(" ");
    const bare = readingMinutes(words);
    const wrapped = readingMinutes(
      words
        .split(" ")
        .map((w) => `<span class="a-long-class-name">${w}</span>`)
        .join(""),
    );
    expect(bare).toBe(1);
    expect(wrapped).toBe(bare);
  });

  it("scales with length", () => {
    const words = (n: number) => Array.from({ length: n }, () => "word").join(" ");
    expect(readingMinutes(words(1125))).toBe(5);
    expect(readingMinutes(words(2250))).toBe(10);
  });

  it("does not count HTML entities as words", () => {
    expect(readingMinutes("<p>&nbsp;&nbsp;&amp;</p>")).toBe(1);
  });
});
