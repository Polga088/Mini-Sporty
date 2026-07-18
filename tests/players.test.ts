import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { prisma } from "../lib/prisma";
import { Role, WalletTransactionType } from "@prisma/client";
import { createPlayer, createManualWalletAdjustment, disablePlayer, enablePlayer } from "../app/actions/players";

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

beforeAll(async () => {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@fridaymatch.local" }
  });
  const player = await prisma.user.findUnique({
    where: { email: "player01@fridaymatch.local" }
  });

  if (!admin || admin.role !== Role.ADMIN || !player || player.role !== Role.PLAYER) {
    throw new Error("Seed manquant pour les tests joueurs.");
  }

  adminId = admin.id;
  playerId = player.id;
});

afterEach(() => {
  mocks.auth.mockReset();
  mocks.revalidatePath.mockReset();
  mocks.redirect.mockClear();
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

async function cleanupByEmail(email: string) {
  await prisma.user.deleteMany({ where: { email } });
}

describe("actions joueurs", () => {
  it("crée un joueur avec wallet et transaction initiale", async () => {
    mocks.auth.mockResolvedValue(adminSession());
    const email = `player-${Date.now()}@test.local`;

    await expectRedirect(
      createPlayer(
        formData({
          name: "Test Joueur",
          email,
          phone: "0600000000",
          temporaryPassword: "TempPass123!",
          initialBalance: "25.50"
        })
      ),
      /^\/admin\/joueurs\/.+\?success=created$/
    );

    const player = await prisma.user.findUnique({
      where: { email },
      include: { wallet: { include: { transactions: true } } }
    });

    expect(player).not.toBeNull();
    expect(player?.role).toBe(Role.PLAYER);
    expect(player?.wallet).not.toBeNull();
    expect(Number(player?.wallet?.balance ?? 0)).toBe(25.5);
    expect(player?.wallet?.transactions).toHaveLength(1);
    expect(player?.wallet?.transactions[0]?.type).toBe(WalletTransactionType.MANUAL_CREDIT);
    expect(Number(player?.wallet?.transactions[0]?.balanceAfter ?? 0)).toBe(25.5);

    await cleanupByEmail(email);
  });

  it("refuse un email déjà utilisé", async () => {
    mocks.auth.mockResolvedValue(adminSession());

    await expectRedirect(
      createPlayer(
        formData({
          name: "Doublon",
          email: "player01@fridaymatch.local",
          phone: "0600000001",
          temporaryPassword: "TempPass123!",
          initialBalance: "0"
        })
      ),
      "/admin/joueurs?error=email_taken"
    );
  });

  it("désactive puis réactive un joueur", async () => {
    mocks.auth.mockResolvedValue(adminSession());
    const email = `toggle-${Date.now()}@test.local`;

    await expectRedirect(
      createPlayer(
        formData({
          name: "Toggle Joueur",
          email,
          phone: "",
          temporaryPassword: "TempPass123!",
          initialBalance: "0"
        })
      ),
      /^\/admin\/joueurs\/.+\?success=created$/
    );

    const created = await prisma.user.findUnique({ where: { email } });
    if (!created) throw new Error("Joueur de test introuvable.");

    await expectRedirect(disablePlayer(formData({ playerId: created.id })), `/admin/joueurs/${created.id}?success=disabled`);
    const disabled = await prisma.user.findUnique({ where: { id: created.id } });
    expect(disabled?.isActive).toBe(false);

    await expectRedirect(enablePlayer(formData({ playerId: created.id })), `/admin/joueurs/${created.id}?success=enabled`);
    const enabled = await prisma.user.findUnique({ where: { id: created.id } });
    expect(enabled?.isActive).toBe(true);

    await cleanupByEmail(email);
  });

  it("crée un crédit manuel et met à jour le solde", async () => {
    mocks.auth.mockResolvedValue(adminSession());
    const email = `credit-${Date.now()}@test.local`;

    await expectRedirect(
      createPlayer(
        formData({
          name: "Crédit Joueur",
          email,
          phone: "",
          temporaryPassword: "TempPass123!",
          initialBalance: "0"
        })
      ),
      /^\/admin\/joueurs\/.+\?success=created$/
    );

    const created = await prisma.user.findUnique({ where: { email }, include: { wallet: true } });
    if (!created?.wallet) throw new Error("Wallet manquant.");

    await expectRedirect(
      createManualWalletAdjustment(
        formData({
          playerId: created.id,
          adjustmentType: "CREDIT",
          amount: "12.50",
          reason: "Bonus administratif"
        })
      ),
      `/admin/joueurs/${created.id}?success=adjusted`
    );

    const wallet = await prisma.wallet.findUnique({
      where: { id: created.wallet.id },
      include: { transactions: true }
    });

    expect(Number(wallet?.balance ?? 0)).toBe(12.5);
    expect(wallet?.transactions).toHaveLength(1);
    expect(wallet?.transactions[0]?.type).toBe(WalletTransactionType.MANUAL_CREDIT);
    expect(Number(wallet?.transactions[0]?.balanceBefore ?? 0)).toBe(0);
    expect(Number(wallet?.transactions[0]?.balanceAfter ?? 0)).toBe(12.5);

    await cleanupByEmail(email);
  });

  it("crée un débit manuel", async () => {
    mocks.auth.mockResolvedValue(adminSession());
    const email = `debit-${Date.now()}@test.local`;

    await expectRedirect(
      createPlayer(
        formData({
          name: "Débit Joueur",
          email,
          phone: "",
          temporaryPassword: "TempPass123!",
          initialBalance: "20"
        })
      ),
      /^\/admin\/joueurs\/.+\?success=created$/
    );

    const created = await prisma.user.findUnique({ where: { email }, include: { wallet: true } });
    if (!created?.wallet) throw new Error("Wallet manquant.");

    await expectRedirect(
      createManualWalletAdjustment(
        formData({
          playerId: created.id,
          adjustmentType: "DEBIT",
          amount: "8.00",
          reason: "Correction"
        })
      ),
      `/admin/joueurs/${created.id}?success=adjusted`
    );

    const wallet = await prisma.wallet.findUnique({
      where: { id: created.wallet.id },
      include: { transactions: true }
    });

    expect(Number(wallet?.balance ?? 0)).toBe(12);
    expect(wallet?.transactions).toHaveLength(2);
    const debitTransaction = wallet?.transactions.find((transaction) => transaction.type === WalletTransactionType.MANUAL_DEBIT);
    expect(debitTransaction?.type).toBe(WalletTransactionType.MANUAL_DEBIT);
    expect(Number(debitTransaction?.balanceBefore ?? 0)).toBe(20);
    expect(Number(debitTransaction?.balanceAfter ?? 0)).toBe(12);

    await cleanupByEmail(email);
  });

  it("refuse un débit supérieur au solde", async () => {
    mocks.auth.mockResolvedValue(adminSession());
    const email = `overdraft-${Date.now()}@test.local`;

    await expectRedirect(
      createPlayer(
        formData({
          name: "Solde Bas",
          email,
          phone: "",
          temporaryPassword: "TempPass123!",
          initialBalance: "5"
        })
      ),
      /^\/admin\/joueurs\/.+\?success=created$/
    );

    const created = await prisma.user.findUnique({ where: { email }, include: { wallet: true } });
    if (!created?.wallet) throw new Error("Wallet manquant.");

    await expectRedirect(
      createManualWalletAdjustment(
        formData({
          playerId: created.id,
          adjustmentType: "DEBIT",
          amount: "10",
          reason: "Tentative de débit excessive"
        })
      ),
      `/admin/joueurs/${created.id}?error=insufficient_balance`
    );

    const wallet = await prisma.wallet.findUnique({
      where: { id: created.wallet.id },
      include: { transactions: true }
    });

    expect(Number(wallet?.balance ?? 0)).toBe(5);
    expect(wallet?.transactions).toHaveLength(1);

    await cleanupByEmail(email);
  });

  it("refuse l’accès à un PLAYER", async () => {
    mocks.auth.mockResolvedValue(playerSession());
    await expectRedirect(
      createPlayer(
        formData({
          name: "Interdit",
          email: `forbidden-${Date.now()}@test.local`,
          phone: "",
          temporaryPassword: "TempPass123!",
          initialBalance: "0"
        })
      ),
      "/espace"
    );
  });
});
