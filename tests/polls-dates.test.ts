import { describe, expect, it, vi, beforeEach } from "vitest";
import { createPoll } from "../app/actions/polls";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  pollCreate: vi.fn(),
  redirect: vi.fn((url: string) => {
    const error = new Error("REDIRECT");
    (error as Error & { url?: string }).url = url;
    throw error;
  })
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    poll: {
      create: mocks.pollCreate
    }
  }
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

function adminSession() {
  return {
    user: {
      id: "admin-1",
      isAdmin: true,
      role: "ADMIN"
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

beforeEach(() => {
  mocks.auth.mockResolvedValue(adminSession());
  mocks.revalidatePath.mockReset();
  mocks.pollCreate.mockReset();
  mocks.redirect.mockClear();
});

describe("createPoll date parsing", () => {
  it("crée un sondage avec closesAt valide", async () => {
    mocks.pollCreate.mockResolvedValue({ id: "poll-1" });

    await expectRedirect(
      createPoll(
        formData({
          title: "Sondage date valide",
          description: "",
          matchTitle: "Match date valide",
          matchDate: "2026-08-15",
          startTime: "20:00",
          endTime: "21:30",
          location: "Terrain Central",
          capacity: "12",
          matchAmount: "10",
          allowResponseChanges: "true",
          manualControl: "false",
          opensAt: "2026-08-14T18:00",
          closesAt: "2026-08-15T18:00",
          status: "DRAFT"
        })
      ),
      /^\/admin\/sondages\/poll-1\?success=poll_created$/
    );

    expect(mocks.pollCreate).toHaveBeenCalledTimes(1);
    const payload = mocks.pollCreate.mock.calls[0]?.[0]?.data;
    expect(payload?.opensAt).toBeInstanceOf(Date);
    expect(payload?.closesAt).toBeInstanceOf(Date);
    expect((payload?.opensAt as Date).getFullYear()).toBe(2026);
    expect((payload?.opensAt as Date).getMonth()).toBe(7);
    expect((payload?.opensAt as Date).getDate()).toBe(14);
    expect((payload?.opensAt as Date).getHours()).toBe(18);
    expect((payload?.opensAt as Date).getMinutes()).toBe(0);
    expect((payload?.closesAt as Date).getFullYear()).toBe(2026);
    expect((payload?.closesAt as Date).getMonth()).toBe(7);
    expect((payload?.closesAt as Date).getDate()).toBe(15);
    expect((payload?.closesAt as Date).getHours()).toBe(18);
    expect((payload?.closesAt as Date).getMinutes()).toBe(0);
  });

  it("accepte closesAt vide et envoie null à Prisma", async () => {
    mocks.pollCreate.mockResolvedValue({ id: "poll-2" });

    await expectRedirect(
      createPoll(
        formData({
          title: "Sondage sans clôture",
          description: "",
          matchTitle: "Match sans clôture",
          matchDate: "2026-08-22",
          startTime: "20:00",
          endTime: "21:30",
          location: "Terrain Sud",
          capacity: "10",
          matchAmount: "10",
          allowResponseChanges: "true",
          manualControl: "false",
          opensAt: "",
          closesAt: "",
          status: "DRAFT"
        })
      ),
      /^\/admin\/sondages\/poll-2\?success=poll_created$/
    );

    const payload = mocks.pollCreate.mock.calls[0]?.[0]?.data;
    expect(payload?.opensAt).toBeNull();
    expect(payload?.closesAt).toBeNull();
  });

  it("refuse une date de clôture invalide sans appeler Prisma", async () => {
    await expectRedirect(
      createPoll(
        formData({
          title: "Sondage invalide",
          description: "",
          matchTitle: "Match invalide",
          matchDate: "2026-08-29",
          startTime: "20:00",
          endTime: "21:30",
          location: "Terrain Nord",
          capacity: "12",
          matchAmount: "10",
          allowResponseChanges: "true",
          manualControl: "false",
          opensAt: "2026-08-28T18:00",
          closesAt: "date-invalide",
          status: "DRAFT"
        })
      ),
      "/admin/sondages/nouveau?error=invalid_date"
    );

    expect(mocks.pollCreate).not.toHaveBeenCalled();
  });

  it("refuse un matchDate invalide sans appeler Prisma", async () => {
    await expectRedirect(
      createPoll(
        formData({
          title: "Sondage match invalide",
          description: "",
          matchTitle: "Match invalide",
          matchDate: "2026-99-99",
          startTime: "20:00",
          endTime: "21:30",
          location: "Terrain Nord",
          capacity: "12",
          matchAmount: "10",
          allowResponseChanges: "true",
          manualControl: "false",
          opensAt: "2026-08-28T18:00",
          closesAt: "2026-08-29T18:00",
          status: "DRAFT"
        })
      ),
      "/admin/sondages/nouveau?error=invalid_date"
    );

    expect(mocks.pollCreate).not.toHaveBeenCalled();
  });
});
