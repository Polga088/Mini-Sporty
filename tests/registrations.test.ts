import bcrypt from "bcryptjs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { AccountApprovalStatus, NotificationType, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  approveRegistration,
  checkCredentialAccess,
  registerPlayer,
  rejectRegistration
} from "../app/actions/registrations";

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

const cleanupEmails: string[] = [];
let adminId = "";
let seedPlayerId = "";

beforeAll(async () => {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@fridaymatch.local" }
  });
  const player = await prisma.user.findUnique({
    where: { email: "player01@fridaymatch.local" }
  });

  if (!admin || admin.role !== Role.ADMIN || !player || player.role !== Role.PLAYER) {
    throw new Error("Seed manquant pour les tests inscriptions.");
  }

  adminId = admin.id;
  seedPlayerId = player.id;
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

function playerSession() {
  return {
    user: {
      id: seedPlayerId,
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
  if (expectedUrl instanceof RegExp) {
    expect(error?.url ?? "").toMatch(expectedUrl);
  } else {
    expect(error?.url ?? "").toBe(expectedUrl);
  }
}

function uniqueEmail(prefix = "registration") {
  const email = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
  cleanupEmails.push(email);
  return email;
}

async function createPendingPlayer(email = uniqueEmail("pending")) {
  return prisma.user.create({
    data: {
      name: "Pending Player",
      email,
      phone: "+212 600 000 111",
      passwordHash: await bcrypt.hash("PendingPass123", 10),
      passwordChangedAt: new Date(),
      role: Role.PLAYER,
      isActive: false,
      approvalStatus: AccountApprovalStatus.PENDING,
      requestedAt: new Date()
    }
  });
}

describe("inscriptions joueurs autonomes", () => {
  it("crée une demande PENDING inactive sans wallet ni transaction", async () => {
    const email = uniqueEmail("public");

    const result = await registerPlayer(
      { status: "idle" },
      formData({
        name: "Nouveau Joueur",
        email,
        phone: "+212 600 000 222",
        password: "NewPlayer123",
        confirmPassword: "NewPlayer123",
        acceptRules: "on"
      })
    );

    expect(result.status).toBe("success");

    const user = await prisma.user.findUnique({
      where: { email },
      include: { wallet: { include: { transactions: true } } }
    });

    expect(user?.role).toBe(Role.PLAYER);
    expect(user?.approvalStatus).toBe(AccountApprovalStatus.PENDING);
    expect(user?.isActive).toBe(false);
    expect(user?.requestedAt).toBeInstanceOf(Date);
    expect(user?.wallet).toBeNull();
    expect(await bcrypt.compare("NewPlayer123", user?.passwordHash ?? "")).toBe(true);

    const adminNotification = await prisma.notification.findFirst({
      where: {
        userId: adminId,
        type: NotificationType.PLAYER_REGISTRATION_SUBMITTED,
        message: { contains: "Nouveau Joueur" }
      }
    });
    expect(adminNotification).not.toBeNull();
  });

  it("refuse proprement un email déjà utilisé sans divulguer l’état du compte", async () => {
    const result = await registerPlayer(
      { status: "idle" },
      formData({
        name: "Doublon",
        email: "player01@fridaymatch.local",
        phone: "+212 600 000 333",
        password: "Duplicate123",
        confirmPassword: "Duplicate123",
        acceptRules: "on"
      })
    );

    expect(result.status).toBe("error");
    expect(result.message).toContain("Si cette adresse peut rejoindre l’équipe");
  });

  it("retourne des erreurs de validation lisibles", async () => {
    const result = await registerPlayer(
      { status: "idle" },
      formData({
        name: "A",
        email: "pas-un-email",
        phone: "12",
        password: "court",
        confirmPassword: "different"
      })
    );

    expect(result.status).toBe("error");
    expect(result.fieldErrors?.email?.[0]).toBe("Adresse e-mail invalide.");
    expect(result.fieldErrors?.acceptRules?.[0]).toBeTruthy();
  });

  it("bloque la connexion tant que l’inscription n’est pas approuvée", async () => {
    const pending = await createPendingPlayer();

    await prisma.user.create({
      data: {
        name: "Rejected Player",
        email: uniqueEmail("rejected"),
        phone: "+212 600 000 444",
        passwordHash: await bcrypt.hash("Rejected123", 10),
        passwordChangedAt: new Date(),
        role: Role.PLAYER,
        isActive: false,
        approvalStatus: AccountApprovalStatus.REJECTED,
        rejectedAt: new Date()
      }
    });

    expect(await checkCredentialAccess(pending.email, "PendingPass123")).toEqual({ status: "pending" });

    const rejectedEmail = cleanupEmails.find((email) => email.startsWith("rejected-")) ?? "";
    expect(await checkCredentialAccess(rejectedEmail, "Rejected123")).toEqual({ status: "rejected" });
    expect(await checkCredentialAccess("player01@fridaymatch.local", "mauvais")).toEqual({ status: "invalid" });
  });

  it("approuve une inscription et crée un seul wallet de façon idempotente", async () => {
    mocks.auth.mockResolvedValue(adminSession());
    const player = await createPendingPlayer();

    await expectRedirect(
      approveRegistration(formData({ userId: player.id })),
      "/admin/inscriptions?success=registration_approved"
    );

    const approved = await prisma.user.findUnique({
      where: { id: player.id },
      include: {
        wallet: { include: { transactions: true } },
        notifications: { where: { type: NotificationType.PLAYER_REGISTRATION_APPROVED } }
      }
    });

    expect(approved?.approvalStatus).toBe(AccountApprovalStatus.APPROVED);
    expect(approved?.isActive).toBe(true);
    expect(approved?.approvedById).toBe(adminId);
    expect(approved?.wallet).not.toBeNull();
    expect(approved?.wallet?.transactions).toHaveLength(0);
    expect(approved?.notifications).toHaveLength(1);

    await expectRedirect(
      approveRegistration(formData({ userId: player.id })),
      "/admin/inscriptions?error=already_processed"
    );

    const walletCount = await prisma.wallet.count({ where: { userId: player.id } });
    expect(walletCount).toBe(1);
  });

  it("refuse une inscription sans créer de wallet", async () => {
    mocks.auth.mockResolvedValue(adminSession());
    const player = await createPendingPlayer();

    await expectRedirect(
      rejectRegistration(formData({ userId: player.id, reason: "Effectif complet" })),
      "/admin/inscriptions?success=registration_rejected"
    );

    const rejected = await prisma.user.findUnique({
      where: { id: player.id },
      include: { wallet: true }
    });

    expect(rejected?.approvalStatus).toBe(AccountApprovalStatus.REJECTED);
    expect(rejected?.isActive).toBe(false);
    expect(rejected?.rejectedById).toBe(adminId);
    expect(rejected?.rejectionReason).toBe("Effectif complet");
    expect(rejected?.wallet).toBeNull();
  });

  it("refuse les actions admin à un PLAYER", async () => {
    mocks.auth.mockResolvedValue(playerSession());
    const player = await createPendingPlayer();

    await expectRedirect(
      approveRegistration(formData({ userId: player.id })),
      "/espace"
    );
  });
});
