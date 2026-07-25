import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = {
  APP_URL: process.env.APP_URL,
  AUTH_URL: process.env.AUTH_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL
};

afterEach(() => {
  process.env.APP_URL = originalEnv.APP_URL;
  process.env.AUTH_URL = originalEnv.AUTH_URL;
  process.env.NEXTAUTH_URL = originalEnv.NEXTAUTH_URL;
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("presence url", () => {
  it("utilise une origine canonique et encode le token", async () => {
    process.env.APP_URL = "https://sporty.omjep.ma/";
    const { buildPresenceUrl } = await import("../lib/presence");

    expect(buildPresenceUrl("abc/def ?")).toBe("https://sporty.omjep.ma/presence/abc%2Fdef%20%3F");
  });
});

describe("presence qr", () => {
  it("génère un SVG depuis une URL de production", async () => {
    const { buildPresenceQrSvg } = await import("../lib/qr");
    const svg = await buildPresenceQrSvg("https://sporty.omjep.ma/presence/token-123");

    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("retourne null si la génération échoue", async () => {
    vi.doMock("qrcode", () => ({
      default: {
        toString: vi.fn().mockRejectedValue(new Error("boom"))
      }
    }));

    const { tryBuildPresenceQrSvg } = await import("../lib/qr");
    await expect(tryBuildPresenceQrSvg("https://sporty.omjep.ma/presence/token-123")).resolves.toBeNull();
  });
});
