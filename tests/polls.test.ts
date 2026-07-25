import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { NotificationType, PollStatus, Role, MatchStatus, PollResponseChoice } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { createMatchFromPoll, createPoll, openPoll, respondToPoll } from "../app/actions/polls";
import { decimal } from "../lib/money";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    const error = new Error("REDIRECT");
    (error as Error & { url?: string }).url = url;
    throw error;
  })
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirect
}));

let adminId = "";
let playerId = "";
const cleanupEmails: string[] = [];
const cleanupPollIds: string[] = [];
const cleanupMatchIds: string[] = [];

beforeAll(async () => {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@fridaymatch.local" }
  });
  const player = await prisma.user.findUnique({
    where: { email: "player01@fridaymatch.local" }
  });

  if (!admin || admin.role !== Role.ADMIN || !player || player.role !== Role.PLAYER) {
    throw new Error("Seed manquant pour les tests sondages.");
  }

  adminId = admin.id;
  playerId = player.id;
});

afterEach(async () => {
  mocks.auth.mockReset();
  mocks.revalidatePath.mockReset();
  mocks.redirect.mockClear();

  if (cleanupMatchIds.length > 0) {
    await prisma.match.deleteMany({
      where: {
        id: { in: cleanupMatchIds.splice(0, cleanupMatchIds.length) }
      }
    });
  }

  if (cleanupPollIds.length > 0) {
    await prisma.poll.deleteMany({
      where: {
        id: { in: cleanupPollIds.splice(0, cleanupPollIds.length) }
      }
    });
  }

  if (cleanupEmails.length > 0) {
    await prisma.user.deleteMany({
      where: {
        email: { in: cleanupEmails.splice(0, cleanupEmails.length) }
      }
    });
  }
});

function adminSession() {
  return {
    user: {
      id: adminId,
      isAdmin: true,
      role: Role.ADMIN
    }
  };
}

function playerSession(userId = playerId) {
  return {
    user: {
      id: userId,
      isAdmin: false,
      role: Role.PLAYER
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

async function createTempPlayer(balance: number) {
  const email = `poll-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
  cleanupEmails.push(email);

  return prisma.user.create({
    data: {
      name: "Poll Test Player",
      email,
      passwordHash: "hash",
      role: Role.PLAYER,
      wallet: {
        create: {
          balance: decimal(balance)
        }
      }
    },
    include: {
      wallet: true
    }
  });
}

describe("actions sondages", () => {
  it("crée un sondage, l'ouvre et enregistre une réponse", async () => {
    mocks.auth.mockResolvedValue(adminSession());
    const title = `Sondage test ${Date.now()}`;

    await expectRedirect(
      createPoll(
        formData({
          title,
          description: "Sondage de validation",
          matchTitle: "Match de validation",
          matchDate: "2026-08-01",
          startTime: "20:00",
          endTime: "21:30",
          location: "Terrain Central",
          capacity: "12",
          matchAmount: "10",
          allowResponseChanges: "true",
          manualControl: "false",
          opensAt: "",
          closesAt: "",
          status: "DRAFT"
        })
      ),
      /^\/admin\/sondages\/.+\?success=poll_created$/
    );

    const poll = await prisma.poll.findFirst({ where: { title } });
    if (!poll) throw new Error("Sondage introuvable.");
    cleanupPollIds.push(poll.id);
    const activePlayers = await prisma.user.findMany({
      where: { role: Role.PLAYER, isActive: true },
      select: { id: true }
    });

    await expectRedirect(
      openPoll(
        formData({
          pollId: poll.id
        })
      ),
      `/admin/sondages/${poll.id}?success=poll_opened`
    );

    const notifications = await prisma.notification.findMany({
      where: {
        type: NotificationType.POLL_OPENED,
        title: "Sondage ouvert",
        message: {
          contains: title
        }
      },
      include: {
        user: true
      }
    });

    expect(notifications).toHaveLength(activePlayers.length);
    expect(notifications.every((notification) => notification.user.id === notification.userId)).toBe(true);

    const player = await createTempPlayer(35);
    mocks.auth.mockResolvedValue(playerSession(player.id));

    await expectRedirect(
      respondToPoll(
        formData({
          pollId: poll.id,
          response: PollResponseChoice.PRESENT
        })
      ),
      "/espace/sondages?success=poll_response_saved"
    );

    const updated = await prisma.poll.findUnique({
      where: { id: poll.id },
      include: {
        responses: true
      }
    });

    expect(updated?.status).toBe(PollStatus.OPEN);
    expect(updated?.responses).toHaveLength(1);
    expect(updated?.responses[0]?.response).toBe(PollResponseChoice.PRESENT);
    expect(updated?.responses[0]?.userId).toBe(player.id);
  });

  it("crée un match depuis un sondage avec les joueurs présents", async () => {
    mocks.auth.mockResolvedValue(adminSession());
    const title = `Sondage match ${Date.now()}`;

    await expectRedirect(
      createPoll(
        formData({
          title,
          description: "Préparation match",
          matchTitle: "Match depuis sondage",
          matchDate: "2026-08-08",
          startTime: "20:00",
          endTime: "21:30",
          location: "Terrain Nord",
          capacity: "8",
          matchAmount: "12.5",
          allowResponseChanges: "true",
          manualControl: "false",
          opensAt: "",
          closesAt: "",
          status: "OPEN"
        })
      ),
      /^\/admin\/sondages\/.+\?success=poll_created$/
    );

    const poll = await prisma.poll.findFirst({ where: { title } });
    if (!poll) throw new Error("Sondage introuvable.");
    cleanupPollIds.push(poll.id);

    const player = await createTempPlayer(50);
    mocks.auth.mockResolvedValue(playerSession(player.id));

    await expectRedirect(
      respondToPoll(
        formData({
          pollId: poll.id,
          response: PollResponseChoice.PRESENT
        })
      ),
      "/espace/sondages?success=poll_response_saved"
    );

    mocks.auth.mockResolvedValue(adminSession());
    await expectRedirect(
      createMatchFromPoll(
        formData({
          pollId: poll.id
        })
      ),
      `/admin/sondages/${poll.id}?success=poll_match_created`
    );

    const updated = await prisma.poll.findUnique({
      where: { id: poll.id },
      include: {
        match: true
      }
    });

    expect(updated?.status).toBe(PollStatus.CLOSED);
    expect(updated?.matchId).toBeTruthy();
    expect(updated?.match?.status).toBe(MatchStatus.OPEN);

    if (updated?.matchId) {
      cleanupMatchIds.push(updated.matchId);
    }
  });
});
