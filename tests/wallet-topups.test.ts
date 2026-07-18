import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { TopUpStatus, Role, WalletTransactionType } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { decimal } from "../lib/money";
import {
  approveTopUp,
  cancelTopUp,
  rejectTopUp,
  requestTopUp
} from "../app/actions/wallet";
import { GET as receiptPdfRoute } from "../app/(dashboard)/admin/alimentations/[id]/recu/pdf/route";

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

beforeAll(async () => {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@fridaymatch.local" }
  });
  const player = await prisma.user.findUnique({
    where: { email: "player01@fridaymatch.local" }
  });

  if (!admin || admin.role !== Role.ADMIN || !player || player.role !== Role.PLAYER) {
    throw new Error("Seed manquant pour les tests alimentations.");
  }

  adminId = admin.id;
  playerId = player.id;
});

afterEach(async () => {
  mocks.auth.mockReset();
  mocks.revalidatePath.mockReset();
  mocks.redirect.mockClear();

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
  const email = `topup-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
  cleanupEmails.push(email);

  return prisma.user.create({
    data: {
      name: "TopUp Test Player",
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

describe("actions alimentations", () => {
  it("crée une demande d’alimentation", async () => {
    const player = await createTempPlayer(0);
    mocks.auth.mockResolvedValue(playerSession(player.id));

    await expectRedirect(
      requestTopUp(
        formData({
          amount: "25.50",
          paymentMethod: "CASH",
          note: "Recharge test",
          proofUrl: "https://example.com/proof.pdf"
        })
      ),
      "/espace/portefeuilles?success=topup_requested"
    );

    const topUps = await prisma.walletTopUp.findMany({
      where: { userId: player.id }
    });

    expect(topUps).toHaveLength(1);
    expect(topUps[0]?.status).toBe(TopUpStatus.PENDING);
    expect(Number(topUps[0]?.amount ?? 0)).toBe(25.5);
    expect(topUps[0]?.note).toBe("Recharge test");
    expect(topUps[0]?.proofUrl).toBe("https://example.com/proof.pdf");
  });

  it("refuse un montant invalide", async () => {
    const player = await createTempPlayer(0);
    mocks.auth.mockResolvedValue(playerSession(player.id));

    await expectRedirect(
      requestTopUp(
        formData({
          amount: "0",
          paymentMethod: "CASH",
          note: "",
          proofUrl: ""
        })
      ),
      "/espace/portefeuilles?error=validation"
    );
  });

  it("approuve une demande avec reçu et transaction TOP_UP", async () => {
    const player = await createTempPlayer(10);
    mocks.auth.mockResolvedValue(playerSession(player.id));

    await expectRedirect(
      requestTopUp(
        formData({
          amount: "15",
          paymentMethod: "MOBILE_PAYMENT",
          note: "Recharge validée",
          proofUrl: ""
        })
      ),
      "/espace/portefeuilles?success=topup_requested"
    );

    const topUp = await prisma.walletTopUp.findFirst({
      where: { userId: player.id, amount: decimal(15) }
    });
    if (!topUp) throw new Error("Demande introuvable.");

    mocks.auth.mockResolvedValue(adminSession());

    await expectRedirect(approveTopUp(formData({ topUpId: topUp.id })), "/admin/alimentations?success=topup_approved");

    const approved = await prisma.walletTopUp.findUnique({
      where: { id: topUp.id },
      include: { user: { include: { wallet: { include: { transactions: true } } } } }
    });

    expect(approved?.status).toBe(TopUpStatus.APPROVED);
    expect(approved?.receiptNumber).toMatch(/^FMW-/);
    expect(approved?.receiptIssuedAt).not.toBeNull();
    expect(approved?.receiptGeneratedById).toBe(adminId);

    const wallet = approved?.user.wallet;
    expect(Number(wallet?.balance ?? 0)).toBe(25);
    expect(wallet?.transactions).toHaveLength(1);
    expect(wallet?.transactions[0]?.type).toBe(WalletTransactionType.TOP_UP);
    expect(Number(wallet?.transactions[0]?.balanceBefore ?? 0)).toBe(10);
    expect(Number(wallet?.transactions[0]?.balanceAfter ?? 0)).toBe(25);
  });

  it("refuse une double approbation", async () => {
    const player = await createTempPlayer(10);
    mocks.auth.mockResolvedValue(playerSession(player.id));

    await expectRedirect(
      requestTopUp(
        formData({
          amount: "5",
          paymentMethod: "CASH",
          note: "",
          proofUrl: ""
        })
      ),
      "/espace/portefeuilles?success=topup_requested"
    );

    const topUp = await prisma.walletTopUp.findFirst({
      where: { userId: player.id, amount: decimal(5) }
    });
    if (!topUp) throw new Error("Demande introuvable.");

    mocks.auth.mockResolvedValue(adminSession());
    await expectRedirect(approveTopUp(formData({ topUpId: topUp.id })), "/admin/alimentations?success=topup_approved");

    await expectRedirect(approveTopUp(formData({ topUpId: topUp.id })), "/admin/alimentations?error=already_processed");
  });

  it("rejette une demande", async () => {
    const player = await createTempPlayer(0);
    mocks.auth.mockResolvedValue(playerSession(player.id));

    await expectRedirect(
      requestTopUp(
        formData({
          amount: "8",
          paymentMethod: "BANK_TRANSFER",
          note: "À rejeter",
          proofUrl: ""
        })
      ),
      "/espace/portefeuilles?success=topup_requested"
    );

    const topUp = await prisma.walletTopUp.findFirst({
      where: { userId: player.id, amount: decimal(8) }
    });
    if (!topUp) throw new Error("Demande introuvable.");

    mocks.auth.mockResolvedValue(adminSession());
    await expectRedirect(rejectTopUp(formData({ topUpId: topUp.id })), "/admin/alimentations?success=topup_rejected");

    const rejected = await prisma.walletTopUp.findUnique({ where: { id: topUp.id } });
    expect(rejected?.status).toBe(TopUpStatus.REJECTED);
    expect(rejected?.receiptNumber).toBeNull();
  });

  it("annule une demande en attente", async () => {
    const player = await createTempPlayer(0);
    mocks.auth.mockResolvedValue(playerSession(player.id));

    await expectRedirect(
      requestTopUp(
        formData({
          amount: "12",
          paymentMethod: "OTHER",
          note: "Annulation",
          proofUrl: ""
        })
      ),
      "/espace/portefeuilles?success=topup_requested"
    );

    const topUp = await prisma.walletTopUp.findFirst({
      where: { userId: player.id, amount: decimal(12) }
    });
    if (!topUp) throw new Error("Demande introuvable.");

    mocks.auth.mockResolvedValue(playerSession(player.id));
    await expectRedirect(cancelTopUp(formData({ topUpId: topUp.id })), "/espace/portefeuilles?success=topup_cancelled");

    const cancelled = await prisma.walletTopUp.findUnique({ where: { id: topUp.id } });
    expect(cancelled?.status).toBe(TopUpStatus.CANCELLED);
  });

  it("refuse l’accès admin à un joueur", async () => {
    mocks.auth.mockResolvedValue(playerSession());

    await expectRedirect(approveTopUp(formData({ topUpId: "anything" })), "/espace");
  });

  it("garde le reçu indisponible avant validation puis le rend accessible après validation", async () => {
    const player = await createTempPlayer(5);
    mocks.auth.mockResolvedValue(playerSession(player.id));

    await expectRedirect(
      requestTopUp(
        formData({
          amount: "7",
          paymentMethod: "CASH",
          note: "Reçu",
          proofUrl: ""
        })
      ),
      "/espace/portefeuilles?success=topup_requested"
    );

    const topUp = await prisma.walletTopUp.findFirst({
      where: { userId: player.id, amount: decimal(7) }
    });
    if (!topUp) throw new Error("Demande introuvable.");

    mocks.auth.mockResolvedValue(adminSession());
    const notReady = await receiptPdfRoute(new Request(`http://localhost:3000/admin/alimentations/${topUp.id}/recu/pdf`), {
      params: Promise.resolve({ id: topUp.id })
    });
    expect(notReady.status).toBe(404);

    await expectRedirect(approveTopUp(formData({ topUpId: topUp.id })), "/admin/alimentations?success=topup_approved");

    mocks.auth.mockResolvedValue(adminSession());
    const ready = await receiptPdfRoute(new Request(`http://localhost:3000/admin/alimentations/${topUp.id}/recu/pdf`), {
      params: Promise.resolve({ id: topUp.id })
    });
    expect(ready.status).toBe(200);
    expect(ready.headers.get("content-type")).toContain("application/pdf");
    expect(ready.headers.get("content-disposition")).toContain(`recu-${(await prisma.walletTopUp.findUnique({ where: { id: topUp.id } }))?.receiptNumber}.pdf`);
  });
});
