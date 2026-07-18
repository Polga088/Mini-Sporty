import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { MatchPaymentStatus, MatchParticipantStatus, MatchStatus, Role, WalletTransactionType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { decimal } from "../lib/money";
import {
  addParticipantToWaitlist,
  cancelMatch,
  confirmParticipant,
  createMatch,
  promoteWaitlistedParticipant,
  updateMatch
} from "../app/actions/matches";

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
const cleanupMatchIds: string[] = [];

beforeAll(async () => {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@fridaymatch.local" }
  });
  const player = await prisma.user.findUnique({
    where: { email: "player01@fridaymatch.local" }
  });

  if (!admin || admin.role !== Role.ADMIN || !player || player.role !== Role.PLAYER) {
    throw new Error("Seed manquant pour les tests matchs.");
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

function playerSession() {
  return {
    user: {
      id: playerId,
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

async function createTempPlayer(balance: number, isActive = true) {
  const email = `match-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
  cleanupEmails.push(email);

  return prisma.user.create({
    data: {
      name: `Match Joueur ${cleanupEmails.length}`,
      email,
      passwordHash: "hash",
      role: Role.PLAYER,
      isActive,
      wallet: {
        create: {
          balance: decimal(balance)
        }
      }
    },
    include: { wallet: true }
  });
}

async function createTempMatch(overrides: Partial<{
  title: string;
  capacity: number;
  participationFee: string;
  status: MatchStatus;
  location: string;
}>) {
  const title = overrides.title ?? `Match test ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const match = await prisma.match.create({
    data: {
      title,
      matchDate: new Date("2026-07-25T12:00:00.000Z"),
      startTime: "20:00",
      endTime: "21:30",
      location: overrides.location ?? "Terrain A",
      capacity: overrides.capacity ?? 6,
      participationFee: decimal(overrides.participationFee ?? "10"),
      status: overrides.status ?? MatchStatus.OPEN,
      createdById: adminId
    }
  });

  cleanupMatchIds.push(match.id);
  return match;
}

describe("actions matchs", () => {
  it("crée et modifie un match", async () => {
    mocks.auth.mockResolvedValue(adminSession());
    const title = `Match création ${Date.now()}`;

    await expectRedirect(
      createMatch(
        formData({
          title,
          matchDate: "2026-07-25",
          startTime: "20:00",
          endTime: "21:30",
          location: "Terrain Central",
          bookingReference: "RA-2026-001",
          capacity: "10",
          participationFee: "15",
          cancellationDeadline: "2026-07-24",
          status: "OPEN",
          notes: "Match de test"
        })
      ),
      /^\/admin\/matchs\/.+\?success=match_created$/
    );

    const created = await prisma.match.findFirst({ where: { title } });
    if (!created) throw new Error("Match créé introuvable.");
    cleanupMatchIds.push(created.id);

    await expectRedirect(
      updateMatch(
        formData({
          matchId: created.id,
          title: "Match modifié",
          matchDate: "2026-07-26",
          startTime: "19:45",
          endTime: "21:15",
          location: "Terrain Nord",
          bookingReference: "RA-2026-002",
          capacity: "12",
          participationFee: "12.5",
          cancellationDeadline: "2026-07-25",
          status: "CONFIRMED",
          notes: "Mis à jour"
        })
      ),
      `/admin/matchs/${created.id}?success=match_updated`
    );

    const updated = await prisma.match.findUnique({ where: { id: created.id } });
    expect(updated?.title).toBe("Match modifié");
    expect(updated?.location).toBe("Terrain Nord");
    expect(updated?.capacity).toBe(12);
    expect(updated?.status).toBe(MatchStatus.CONFIRMED);
    expect(Number(updated?.participationFee ?? 0)).toBe(12.5);
  });

  it("confirme un joueur avec débit automatique", async () => {
    mocks.auth.mockResolvedValue(adminSession());
    const match = await createTempMatch({ capacity: 3, participationFee: "10" });
    const player = await createTempPlayer(25);

    await expectRedirect(
      confirmParticipant(
        formData({
          matchId: match.id,
          userId: player.id
        })
      ),
      `/admin/matchs/${match.id}?success=participant_confirmed`
    );

    const participant = await prisma.matchParticipant.findUnique({
      where: { matchId_userId: { matchId: match.id, userId: player.id } }
    });
    const wallet = await prisma.wallet.findUnique({
      where: { userId: player.id },
      include: { transactions: true }
    });

    expect(participant?.status).toBe(MatchParticipantStatus.CONFIRMED);
    expect(participant?.paymentStatus).toBe(MatchPaymentStatus.PAID);
    expect(Number(participant?.amountCharged ?? 0)).toBe(10);
    expect(Number(wallet?.balance ?? 0)).toBe(15);
    expect(wallet?.transactions.filter((transaction) => transaction.type === WalletTransactionType.MATCH_PAYMENT)).toHaveLength(1);
  });

  it("refuse une confirmation si le solde est insuffisant", async () => {
    mocks.auth.mockResolvedValue(adminSession());
    const match = await createTempMatch({ capacity: 3, participationFee: "10" });
    const player = await createTempPlayer(5);

    await expectRedirect(
      confirmParticipant(
        formData({
          matchId: match.id,
          userId: player.id
        })
      ),
      `/admin/matchs/${match.id}?error=insufficient_balance`
    );

    const participant = await prisma.matchParticipant.findUnique({
      where: { matchId_userId: { matchId: match.id, userId: player.id } }
    });
    expect(participant).toBeNull();
  });

  it("refuse une confirmation si la capacité est atteinte", async () => {
    mocks.auth.mockResolvedValue(adminSession());
    const match = await createTempMatch({ capacity: 1, participationFee: "10" });
    const playerOne = await createTempPlayer(25);
    const playerTwo = await createTempPlayer(25);

    await expectRedirect(
      confirmParticipant(
        formData({
          matchId: match.id,
          userId: playerOne.id
        })
      ),
      `/admin/matchs/${match.id}?success=participant_confirmed`
    );

    await expectRedirect(
      confirmParticipant(
        formData({
          matchId: match.id,
          userId: playerTwo.id
        })
      ),
      `/admin/matchs/${match.id}?error=capacity_reached`
    );

    const secondParticipant = await prisma.matchParticipant.findUnique({
      where: { matchId_userId: { matchId: match.id, userId: playerTwo.id } }
    });
    expect(secondParticipant).toBeNull();
  });

  it("gère la liste d’attente puis la promotion", async () => {
    mocks.auth.mockResolvedValue(adminSession());
    const match = await createTempMatch({ capacity: 2, participationFee: "10" });
    const player = await createTempPlayer(18);

    await expectRedirect(
      addParticipantToWaitlist(
        formData({
          matchId: match.id,
          userId: player.id
        })
      ),
      `/admin/matchs/${match.id}?success=participant_waitlisted`
    );

    const waitlisted = await prisma.matchParticipant.findUnique({
      where: { matchId_userId: { matchId: match.id, userId: player.id } }
    });
    expect(waitlisted?.status).toBe(MatchParticipantStatus.WAITLISTED);
    expect(waitlisted?.paymentStatus).toBe(MatchPaymentStatus.NOT_REQUIRED);

    await expectRedirect(
      promoteWaitlistedParticipant(
        formData({
          participantId: waitlisted?.id ?? "",
          matchId: match.id
        })
      ),
      `/admin/matchs/${match.id}?success=participant_promoted`
    );

    const promoted = await prisma.matchParticipant.findUnique({
      where: { id: waitlisted?.id ?? "" }
    });
    const wallet = await prisma.wallet.findUnique({
      where: { userId: player.id },
      include: { transactions: true }
    });

    expect(promoted?.status).toBe(MatchParticipantStatus.CONFIRMED);
    expect(promoted?.paymentStatus).toBe(MatchPaymentStatus.PAID);
    expect(Number(wallet?.balance ?? 0)).toBe(8);
    expect(wallet?.transactions.filter((transaction) => transaction.type === WalletTransactionType.MATCH_PAYMENT)).toHaveLength(1);
  });

  it("évite un double débit lors d’une confirmation répétée", async () => {
    mocks.auth.mockResolvedValue(adminSession());
    const match = await createTempMatch({ capacity: 2, participationFee: "10" });
    const player = await createTempPlayer(40);

    await expectRedirect(
      confirmParticipant(
        formData({
          matchId: match.id,
          userId: player.id
        })
      ),
      `/admin/matchs/${match.id}?success=participant_confirmed`
    );

    await expectRedirect(
      confirmParticipant(
        formData({
          matchId: match.id,
          userId: player.id
        })
      ),
      `/admin/matchs/${match.id}?success=participant_confirmed`
    );

    const wallet = await prisma.wallet.findUnique({
      where: { userId: player.id },
      include: { transactions: true }
    });

    expect(Number(wallet?.balance ?? 0)).toBe(30);
    expect(wallet?.transactions.filter((transaction) => transaction.type === WalletTransactionType.MATCH_PAYMENT)).toHaveLength(1);
  });

  it("annule un match et rembourse les joueurs", async () => {
    mocks.auth.mockResolvedValue(adminSession());
    const match = await createTempMatch({ capacity: 2, participationFee: "10" });
    const playerOne = await createTempPlayer(30);
    const playerTwo = await createTempPlayer(30);

    await expectRedirect(
      confirmParticipant(formData({ matchId: match.id, userId: playerOne.id })),
      `/admin/matchs/${match.id}?success=participant_confirmed`
    );
    await expectRedirect(
      confirmParticipant(formData({ matchId: match.id, userId: playerTwo.id })),
      `/admin/matchs/${match.id}?success=participant_confirmed`
    );

    await expectRedirect(
      cancelMatch(formData({ matchId: match.id })),
      `/admin/matchs/${match.id}?success=match_cancelled`
    );

    const cancelledMatch = await prisma.match.findUnique({
      where: { id: match.id },
      include: { participants: true }
    });
    expect(cancelledMatch?.status).toBe(MatchStatus.CANCELLED);
    expect(cancelledMatch?.participants.every((participant) => participant.status === MatchParticipantStatus.CANCELLED)).toBe(true);
    expect(cancelledMatch?.participants.every((participant) => participant.paymentStatus === MatchPaymentStatus.REFUNDED)).toBe(true);

    const walletOne = await prisma.wallet.findUnique({
      where: { userId: playerOne.id },
      include: { transactions: true }
    });
    const walletTwo = await prisma.wallet.findUnique({
      where: { userId: playerTwo.id },
      include: { transactions: true }
    });

    expect(Number(walletOne?.balance ?? 0)).toBe(30);
    expect(Number(walletTwo?.balance ?? 0)).toBe(30);
    expect(walletOne?.transactions.filter((transaction) => transaction.type === WalletTransactionType.REFUND)).toHaveLength(1);
    expect(walletTwo?.transactions.filter((transaction) => transaction.type === WalletTransactionType.REFUND)).toHaveLength(1);
  });

  it("refuse un joueur inactif", async () => {
    mocks.auth.mockResolvedValue(adminSession());
    const match = await createTempMatch({ capacity: 2, participationFee: "10" });
    const player = await createTempPlayer(20, false);

    await expectRedirect(
      confirmParticipant(
        formData({
          matchId: match.id,
          userId: player.id
        })
      ),
      `/admin/matchs/${match.id}?error=inactive_player`
    );
  });

  it("refuse l’accès à un PLAYER", async () => {
    mocks.auth.mockResolvedValue(playerSession());
    await expectRedirect(
      createMatch(
        formData({
          title: `Interdit ${Date.now()}`,
          matchDate: "2026-07-25",
          startTime: "20:00",
          endTime: "21:30",
          location: "Terrain",
          capacity: "8",
          status: "OPEN"
        })
      ),
      "/espace"
    );
  });
});
