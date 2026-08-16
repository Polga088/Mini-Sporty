import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MatchParticipantStatus, MatchPaymentStatus, MatchStatus, PresenceSource, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { decimal } from "../lib/money";
import { getOrCreatePresenceQr } from "../lib/presence-service";
import { confirmPresenceByToken, disableMatchQr, markPresenceManually, regenerateMatchQr } from "../app/actions/presence";

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
let captainId = "";
const cleanupEmails: string[] = [];
const cleanupMatchIds: string[] = [];

beforeAll(async () => {
  const admin = await prisma.user.findUnique({ where: { email: "admin@fridaymatch.local" } });
  const player = await prisma.user.findUnique({ where: { email: "player01@fridaymatch.local" } });
  let captain = await prisma.user.findUnique({ where: { email: "captain@fridaymatch.local" } });

  if (!admin || admin.role !== Role.ADMIN || !player || player.role !== Role.PLAYER) {
    throw new Error("Seed manquant pour les tests de présence.");
  }

  if (!captain) {
    captain = await prisma.user.create({
      data: {
        name: "Captain Test",
        email: `captain-${Date.now()}@test.local`,
        passwordHash: "hash",
        role: Role.CAPTAIN
      }
    });
    cleanupEmails.push(captain.email);
  }

  adminId = admin.id;
  playerId = player.id;
  captainId = captain?.id ?? "captain-test";
});

afterEach(async () => {
  mocks.auth.mockReset();
  mocks.revalidatePath.mockReset();
  mocks.redirect.mockClear();

  if (cleanupMatchIds.length > 0) {
    await prisma.match.deleteMany({
      where: { id: { in: cleanupMatchIds.splice(0, cleanupMatchIds.length) } }
    });
  }

  if (cleanupEmails.length > 0) {
    await prisma.user.deleteMany({
      where: { email: { in: cleanupEmails.splice(0, cleanupEmails.length) } }
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

function captainSession() {
  return {
    user: {
      id: captainId,
      isAdmin: false,
      isCaptain: true,
      role: Role.CAPTAIN
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

function futureMatchDate() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

function expiredMatchDate() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
}

async function expectQrExpiresInFuture(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { qrTokenExpiresAt: true }
  });

  expect(match?.qrTokenExpiresAt).toBeInstanceOf(Date);
  expect(match?.qrTokenExpiresAt?.getTime()).toBeGreaterThan(Date.now());
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
  const email = `presence-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
  cleanupEmails.push(email);

  return prisma.user.create({
    data: {
      name: "Presence Test Player",
      email,
      passwordHash: "hash",
      role: Role.PLAYER,
      wallet: {
        create: {
          balance: decimal(balance)
        }
      }
    }
  });
}

async function createTempMatch(status: MatchStatus = MatchStatus.OPEN, matchDate = futureMatchDate()) {
  const match = await prisma.match.create({
    data: {
      title: `Présence ${Date.now()}`,
      matchDate,
      startTime: "20:00",
      endTime: "21:30",
      location: "Terrain Présence",
      capacity: 6,
      participationFee: decimal(10),
      status,
      createdById: adminId
    }
  });

  cleanupMatchIds.push(match.id);
  return match;
}

describe("présence QR", () => {
  it("confirme une présence valide puis refuse la double confirmation", async () => {
    const player = await createTempPlayer(35);
    const match = await createTempMatch();

    await prisma.matchParticipant.create({
      data: {
        matchId: match.id,
        userId: player.id,
        status: MatchParticipantStatus.CONFIRMED,
        paymentStatus: MatchPaymentStatus.PAID,
        amountCharged: decimal(10)
      }
    });

    const qr = await getOrCreatePresenceQr(match.id);
    await expectQrExpiresInFuture(match.id);
    mocks.auth.mockResolvedValue(playerSession(player.id));

    await expectRedirect(
      confirmPresenceByToken(formData({ token: qr.token! })),
      `/presence/${qr.token!}?success=presence_confirmed`
    );

    const firstLog = await prisma.matchPresenceLog.findMany({
      where: { matchId: match.id, userId: player.id }
    });
    expect(firstLog).toHaveLength(1);
    expect(firstLog[0]?.source).toBe(PresenceSource.QR);

    await expectRedirect(
      confirmPresenceByToken(formData({ token: qr.token! })),
      `/presence/${qr.token!}?error=already_confirmed`
    );

    const secondLog = await prisma.matchPresenceLog.findMany({
      where: { matchId: match.id, userId: player.id }
    });
    expect(secondLog).toHaveLength(1);
  });

  it("refuse un joueur non inscrit ou un token invalide", async () => {
    const outsider = await createTempPlayer(35);
    const match = await createTempMatch();
    const qr = await getOrCreatePresenceQr(match.id);
    await expectQrExpiresInFuture(match.id);
    mocks.auth.mockResolvedValue(playerSession(outsider.id));

    await expectRedirect(
      confirmPresenceByToken(formData({ token: qr.token! })),
      `/presence/${qr.token!}?error=not_participant`
    );

    await expectRedirect(
      confirmPresenceByToken(formData({ token: "token-invalide" })),
      "/presence/token-invalide?error=invalid_token"
    );
  });

  it("refuse un QR expiré ou un match annulé", async () => {
    const player = await createTempPlayer(35);
    const expiredMatch = await createTempMatch(MatchStatus.OPEN, expiredMatchDate());
    const cancelledMatch = await createTempMatch(MatchStatus.CANCELLED);

    await prisma.matchParticipant.createMany({
      data: [
        {
          matchId: expiredMatch.id,
          userId: player.id,
          status: MatchParticipantStatus.CONFIRMED,
          paymentStatus: MatchPaymentStatus.PAID,
          amountCharged: decimal(10)
        },
        {
          matchId: cancelledMatch.id,
          userId: player.id,
          status: MatchParticipantStatus.CONFIRMED,
          paymentStatus: MatchPaymentStatus.PAID,
          amountCharged: decimal(10)
        }
      ]
    });

    const expiredQr = await getOrCreatePresenceQr(expiredMatch.id);
    const cancelledQr = await getOrCreatePresenceQr(cancelledMatch.id);
    const expiredQrMatch = await prisma.match.findUnique({
      where: { id: expiredMatch.id },
      select: { qrTokenExpiresAt: true }
    });
    expect(expiredQrMatch?.qrTokenExpiresAt?.getTime()).toBeLessThan(Date.now());
    mocks.auth.mockResolvedValue(playerSession(player.id));

    await expectRedirect(
      confirmPresenceByToken(formData({ token: expiredQr.token! })),
      `/presence/${expiredQr.token!}?error=token_expired`
    );

    await expectRedirect(
      confirmPresenceByToken(formData({ token: cancelledQr.token! })),
      `/presence/${cancelledQr.token!}?error=presence_match_cancelled`
    );
  });

  it("permet une correction manuelle à un ADMIN ou CAPTAIN", async () => {
    const player = await createTempPlayer(35);
    const match = await createTempMatch();

    const participant = await prisma.matchParticipant.create({
      data: {
        matchId: match.id,
        userId: player.id,
        status: MatchParticipantStatus.CONFIRMED,
        paymentStatus: MatchPaymentStatus.PAID,
        amountCharged: decimal(10)
      }
    });

    mocks.auth.mockResolvedValue(adminSession());
    await expectRedirect(
      markPresenceManually(
        formData({
          matchId: match.id,
          participantId: participant.id,
          attendanceStatus: "ATTENDED"
        })
      ),
      `/admin/matchs/${match.id}?success=attendance_marked`
    );

    const logs = await prisma.matchPresenceLog.findMany({
      where: { matchId: match.id, userId: player.id }
    });
    expect(logs).toHaveLength(1);
    expect(logs[0]?.source).toBe(PresenceSource.MANUAL);

    mocks.auth.mockResolvedValue(captainSession());
    await expectRedirect(
      markPresenceManually(
        formData({
          matchId: match.id,
          participantId: participant.id,
          attendanceStatus: "ABSENT"
        })
      ),
      `/admin/matchs/${match.id}?success=attendance_marked`
    );

    const updated = await prisma.matchParticipant.findUnique({
      where: { id: participant.id }
    });
    expect(updated?.status).toBe(MatchParticipantStatus.ABSENT);
  });

  it("refuse à un PLAYER les actions admin QR", async () => {
    const match = await createTempMatch();
    mocks.auth.mockResolvedValue(playerSession());

    await expectRedirect(
      regenerateMatchQr(formData({ matchId: match.id, returnTo: "/admin/parametres" })),
      "/espace"
    );

    await expectRedirect(
      disableMatchQr(formData({ matchId: match.id, returnTo: "/admin/parametres" })),
      "/espace"
    );
  });
});
