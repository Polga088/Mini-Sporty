import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import manifest from "../app/manifest";
import { isIosSafari, isStandaloneDisplayMode } from "../lib/pwa";

describe("manifest", () => {
  it("déclare une PWA Mini Sporty installable", () => {
    const data = manifest();

    expect(data.name).toBe("Mini Sporty");
    expect(data.short_name).toBe("Sporty");
    expect(data.start_url).toBe("/");
    expect(data.scope).toBe("/");
    expect(data.display).toBe("standalone");
    expect(data.orientation).toBe("portrait-primary");
    expect(data.lang).toBe("fr");
    const icons = data.icons ?? [];

    expect(icons.some((icon) => icon.sizes === "192x192")).toBe(true);
    expect(icons.some((icon) => icon.sizes === "512x512")).toBe(true);
    expect(icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  });
});

describe("helpers pwa", () => {
  it("détecte Safari iOS et le mode standalone", () => {
    expect(isIosSafari("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1", "iPhone", 1)).toBe(true);
    expect(isIosSafari("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.0.0 Mobile/15E148 Safari/604.1", "iPhone", 1)).toBe(false);
    expect(isStandaloneDisplayMode({ matchMedia: () => ({ matches: true } as MediaQueryList) } as unknown as Window)).toBe(true);
    expect(isStandaloneDisplayMode({ matchMedia: () => ({ matches: false } as MediaQueryList) } as unknown as Window)).toBe(false);
  });
});

describe("service worker", () => {
  it("évite de mettre en cache les routes privées Auth.js et expose l'offline", () => {
    const sw = readFileSync("public/sw.js", "utf8");

    expect(sw).toContain('PRIVATE_PATH_PREFIXES = ["/api/auth", "/api/"]');
    expect(sw).toContain("SKIP_WAITING");
    expect(sw).toContain("OFFLINE_URL");
    expect(sw).toContain("cacheable = response && response.ok && response.type === \"basic\"");
    expect(sw).toContain("fetch(event.request)");
  });

  it("garde la page offline disponible", () => {
    const offlinePage = readFileSync("app/offline/page.tsx", "utf8");

    expect(offlinePage).toContain("Vous êtes hors ligne");
    expect(offlinePage).toContain("Retour à l’accueil");
  });
});
