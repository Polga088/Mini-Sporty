import { describe, expect, it, vi } from "vitest";
import { Role } from "@prisma/client";
import { canAccessFinancialAdmin, canAccessSensitiveAdmin, canManageSport, isAdmin, isCaptain } from "../lib/permissions";
import { approveTopUp } from "../app/actions/wallet";
import { GET as exportCsvRoute } from "../app/(dashboard)/admin/statistiques/export.csv/route";
import AdminExportsPage from "../app/(dashboard)/admin/exports/page";
import AdminSettingsPage from "../app/(dashboard)/admin/parametres/page";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn((url: string) => {
    const error = new Error("REDIRECT");
    (error as Error & { url?: string }).url = url;
    throw error;
  })
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

function captainSession() {
  return {
    user: {
      id: "captain-test",
      role: Role.CAPTAIN,
      isAdmin: false,
      isCaptain: true
    }
  };
}

function formData(entries: Record<string, string>) {
  const form = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    form.set(key, value);
  }
  return form;
}

async function expectRedirect(promise: Promise<unknown>, expectedUrl: string | RegExp) {
  let error: (Error & { url?: string }) | undefined;

  try {
    await promise;
  } catch (value) {
    error = value as Error & { url?: string };
  }

  expect(error).toMatchObject({ message: "REDIRECT" });
  expect(error?.url ?? "").toMatch(expectedUrl);
}

describe("sécurité des rôles et accès", () => {
  it("limite les permissions par rôle", () => {
    expect(isAdmin(Role.ADMIN)).toBe(true);
    expect(isCaptain(Role.CAPTAIN)).toBe(true);
    expect(canManageSport(Role.CAPTAIN)).toBe(true);
    expect(canAccessSensitiveAdmin(Role.CAPTAIN)).toBe(false);
    expect(canAccessFinancialAdmin(Role.CAPTAIN)).toBe(false);
    expect(canAccessSensitiveAdmin(Role.ADMIN)).toBe(true);
    expect(canAccessFinancialAdmin(Role.ADMIN)).toBe(true);
  });

  it("refuse les écrans sensibles aux CAPTAIN", async () => {
    mocks.auth.mockResolvedValue(captainSession());

    await expectRedirect(AdminExportsPage(), "/espace");
    await expectRedirect(AdminSettingsPage({ searchParams: Promise.resolve({}) }), "/espace");
  });

  it("refuse les exports financiers aux CAPTAIN", async () => {
    mocks.auth.mockResolvedValue(captainSession());

    const response = await exportCsvRoute(new Request("http://localhost:3000/admin/statistiques/export.csv"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/espace");
  });

  it("refuse les approbations financières aux CAPTAIN", async () => {
    mocks.auth.mockResolvedValue(captainSession());

    await expectRedirect(
      approveTopUp(formData({ topUpId: "topup-test" })),
      "/espace"
    );
  });

});
