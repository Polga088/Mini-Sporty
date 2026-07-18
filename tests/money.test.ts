import { describe, expect, it } from "vitest";
import { formatDh } from "../lib/money";

describe("money helpers", () => {
  it("formats dirham amounts", () => {
    expect(formatDh(10)).toContain("10");
    expect(formatDh(10)).toContain("DH");
  });
});
