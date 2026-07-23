import { describe, expect, it } from "vitest";
import { canAccessSensitiveAdmin, canManageSport, isAdmin, isCaptain, roleLabel } from "../lib/permissions";

describe("permissions", () => {
  it("autorise CAPTAIN sur les actions sportives mais pas sur les écrans sensibles", () => {
    expect(isCaptain("CAPTAIN")).toBe(true);
    expect(isAdmin("CAPTAIN")).toBe(false);
    expect(canManageSport("CAPTAIN")).toBe(true);
    expect(canAccessSensitiveAdmin("CAPTAIN")).toBe(false);
    expect(roleLabel("CAPTAIN")).toBe("CAPTAIN");
  });
});
