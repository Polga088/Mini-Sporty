import { describe, expect, it } from "vitest";
import { getNextFriday } from "../lib/dates";

describe("date helpers", () => {
  it("finds the next friday", () => {
    const result = getNextFriday(new Date("2026-07-18T12:00:00Z"));
    expect(result.getDay()).toBe(5);
    expect(result.getDate()).toBeGreaterThanOrEqual(24);
  });
});
