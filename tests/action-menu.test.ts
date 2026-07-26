import { describe, expect, it } from "vitest";
import { computeActionMenuPosition } from "../components/action-menu";

describe("menu Actions", () => {
  it("aligne le menu à droite du bouton sans sortir du viewport", () => {
    const position = computeActionMenuPosition(
      { top: 120, right: 760, bottom: 160 },
      260,
      800,
      700
    );

    expect(position.placement).toBe("bottom");
    expect(position.left).toBe(472);
    expect(position.left + 288).toBeLessThanOrEqual(800 - 12);
  });

  it("positionne le menu au-dessus pour une dernière ligne de tableau", () => {
    const position = computeActionMenuPosition(
      { top: 640, right: 760, bottom: 680 },
      260,
      800,
      700
    );

    expect(position.placement).toBe("top");
    expect(position.top).toBeGreaterThanOrEqual(12);
    expect(position.top + Math.min(260, position.maxHeight)).toBeLessThanOrEqual(640);
  });

  it("garde une largeur et une marge lisibles sur petite largeur", () => {
    const position = computeActionMenuPosition(
      { top: 200, right: 340, bottom: 240 },
      260,
      360,
      640
    );

    expect(position.left).toBe(52);
    expect(position.left).toBeGreaterThanOrEqual(12);
    expect(position.left + 288).toBeLessThanOrEqual(360 - 12);
  });
});
