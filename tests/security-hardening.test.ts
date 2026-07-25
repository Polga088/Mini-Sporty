import bcrypt from "bcryptjs";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { Role, TopUpStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { decimal } from "../lib/money";
import { safeAuthRedirect, isSessionSnapshotValid } from "../lib/auth-security";
import { canAccessTopUpReceipt } from "../lib/receipt-access";
import { generateReceiptShareToken, hashReceiptShareToken } from "../lib/topup-receipt";
import { changeMyPassword } from "../app/actions/account";
import {
  readPasswordResetFlashCookie,
  resetPlayerPassword
} from "../app/actions/players";
import {
  generateTopUpReceiptShareLink,
  revokeTopUpReceiptShareLink
} from "../app/actions/wallet";
import nextConfig from "../next.config";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn((url: string) => {
    const error = new Error("REDIRECT");
    (error as Error & { url?: string }).url = url;
    throw error;
  }),
  cookies: new Map<string, { value: string; options?: Record<string, unknown> }>()
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

vi.mock("next/headers", () => ({
  cookies: () => ({
    get(name: string) {
      return mocks.cookies.get(name);
    },
    set(name: string, value: string, options?: Record<string, unknown>) {
      mocks.cookies.set(name, { value, options });
    },
    delete(name: string) {
      mocks.cookies.delete(name);
    }
  })
}));

let adminId = "";
const cleanupEmails: string[] = [];

beforeAll(async () => {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@fridaymatch.local" }
  });

  if (!admin || admin.role !== Role.ADMIN) {
    throw new Error("Seed admin manquant pour les tests de sécurité.");
  }

  adminId = admin.id;
});

afterEach(async () => {
  mocks.auth.mockReset();
  mocks.revalidatePath.mockReset();
  mocks.redirect.mockClear();
  mocks.cookies.clear();

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
      role: Role.ADMIN,
      isAdmin: true,
      isCaptain: false
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

async function createPlayerWithPassword(password: string, mustChangePassword = false) {
  const email = `security-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
  cleanupEmails.push(email);

  return prisma.user.create({
    data: {
      name: "Security Test Player",
      email,
      passwordHash: await bcrypt.hash(password, 10),
      passwordChangedAt: new Date(),
      mustChangePassword,
      role: Role.PLAYER,
      sessionVersion: 0,
      wallet: {
        create: {
          balance: decimal(0)
        }
      }
    },
    include: {
      wallet: true
    }
  });
}

describe("sécurité renforcée", () => {
  it("refuse une redirection externe", () => {
    expect(safeAuthRedirect("https://evil.example/callback", "https://sporty.omjep.ma")).toBe("https://sporty.omjep.ma");
    expect(safeAuthRedirect("/admin/joueurs", "https://sporty.omjep.ma")).toBe("https://sporty.omjep.ma/admin/joueurs");
  });

  it("invalide une session quand le mot de passe change", async () => {
    const player = await createPlayerWithPassword("OldPass123!", true);
    const tokenSnapshot = {
      role: Role.PLAYER,
      isActive: true,
      mustChangePassword: true,
      sessionVersion: 0,
      passwordChangedAt: player.passwordChangedAt?.toISOString() ?? null
    };

    mocks.auth.mockResolvedValue({
      user: {
        id: player.id,
        role: Role.PLAYER,
        isAdmin: false,
        isCaptain: false
      }
    });

    await expectRedirect(
      changeMyPassword(
        formData({
          currentPassword: "OldPass123!",
          newPassword: "NewPass123!",
          confirmPassword: "NewPass123!"
        })
      ),
      "/mot-de-passe?success=password_changed"
    );

    const updated = await prisma.user.findUnique({
      where: { id: player.id },
      select: {
        passwordHash: true,
        mustChangePassword: true,
        sessionVersion: true,
        passwordChangedAt: true,
        role: true,
        isActive: true
      }
    });

    expect(updated?.mustChangePassword).toBe(false);
    expect(updated?.sessionVersion).toBe(1);
    expect(await bcrypt.compare("NewPass123!", updated?.passwordHash ?? "")).toBe(true);
    expect(
      isSessionSnapshotValid(tokenSnapshot, {
        role: updated?.role ?? Role.PLAYER,
        isActive: updated?.isActive ?? false,
        mustChangePassword: updated?.mustChangePassword ?? false,
        sessionVersion: updated?.sessionVersion ?? 0,
        passwordChangedAt: updated?.passwordChangedAt ?? null
      })
    ).toBe(false);
  });

  it("déconnecte une session quand le compte devient inactif", async () => {
    const player = await createPlayerWithPassword("Disabled123!", false);
    const tokenSnapshot = {
      role: Role.PLAYER,
      isActive: true,
      mustChangePassword: false,
      sessionVersion: 0,
      passwordChangedAt: player.passwordChangedAt?.toISOString() ?? null
    };

    await prisma.user.update({
      where: { id: player.id },
      data: { isActive: false }
    });

    const updated = await prisma.user.findUnique({
      where: { id: player.id },
      select: {
        role: true,
        isActive: true,
        mustChangePassword: true,
        sessionVersion: true,
        passwordChangedAt: true
      }
    });

    expect(
      isSessionSnapshotValid(tokenSnapshot, {
        role: updated?.role ?? Role.PLAYER,
        isActive: updated?.isActive ?? true,
        mustChangePassword: updated?.mustChangePassword ?? false,
        sessionVersion: updated?.sessionVersion ?? 0,
        passwordChangedAt: updated?.passwordChangedAt ?? null
      })
    ).toBe(false);
  });

  it("réinitialise le mot de passe avec flash cookie, audit et sécurisation d’en-tête", async () => {
    const player = await createPlayerWithPassword("ResetMe123!", false);
    mocks.auth.mockResolvedValue(adminSession());
    vi.stubEnv("NODE_ENV", "production");

    try {
      await expectRedirect(
      resetPlayerPassword(
        formData({
          playerId: player.id,
          returnTo: `/admin/joueurs/${player.id}`
        })
      ),
      `/admin/joueurs/${player.id}?success=password_reset`
    );
    } finally {
      vi.unstubAllEnvs();
    }

    const updated = await prisma.user.findUnique({
      where: { id: player.id },
      select: {
        mustChangePassword: true,
        sessionVersion: true,
        passwordChangedAt: true
      }
    });

    expect(updated?.mustChangePassword).toBe(true);
    expect(updated?.sessionVersion).toBe(1);
    expect(updated?.passwordChangedAt).not.toBeNull();
    expect(await readPasswordResetFlashCookie(player.id)).toMatch(/^Fm-[A-Fa-f0-9]{8}-2026!$/);

    const flashCookie = [...mocks.cookies.values()][0];
    expect(flashCookie?.options?.httpOnly).toBe(true);
    expect(flashCookie?.options?.sameSite).toBe("lax");
    expect(flashCookie?.options?.secure).toBe(true);

    const audits = await prisma.securityAudit.findMany({
      where: { type: "PASSWORD_RESET", targetUserId: player.id }
    });

    expect(audits).toHaveLength(1);
    expect(audits[0]?.actorId).toBe(adminId);

    const headers = await nextConfig.headers?.();
    const appHeaders = headers?.find((entry) => entry.source === "/(.*)")?.headers ?? [];
    expect(nextConfig.poweredByHeader).toBe(false);
    expect(appHeaders.some((header) => header.key === "Content-Security-Policy")).toBe(true);
  });

  it("protège les reçus contre l’IDOR et accepte un jeton valide", async () => {
    const owner = await createPlayerWithPassword("Owner123!", false);
    const attacker = await createPlayerWithPassword("Attacker123!", false);
    const token = generateReceiptShareToken();
    const tokenHash = hashReceiptShareToken(token);
    const shareTopUp = await prisma.walletTopUp.create({
      data: {
        userId: owner.id,
        amount: decimal(30),
        paymentMethod: "CASH",
        status: TopUpStatus.APPROVED,
        reviewedById: adminId,
        reviewedAt: new Date(),
        receiptNumber: "FMW-20260725-000000-AAAA1111",
        receiptIssuedAt: new Date(),
        receiptGeneratedById: adminId,
        receiptShareTokenHash: tokenHash,
        receiptShareTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000)
      }
    });

    expect(
      canAccessTopUpReceipt({
        user: { id: adminId, role: Role.ADMIN },
        topUp: shareTopUp,
        shareToken: null
      })
    ).toBe(true);

    expect(
      canAccessTopUpReceipt({
        user: { id: owner.id, role: Role.PLAYER },
        topUp: shareTopUp,
        shareToken: null
      })
    ).toBe(true);

    expect(
      canAccessTopUpReceipt({
        user: { id: attacker.id, role: Role.PLAYER },
        topUp: shareTopUp,
        shareToken: null
      })
    ).toBe(false);

    expect(
      canAccessTopUpReceipt({
        user: undefined,
        topUp: shareTopUp,
        shareToken: null
      })
    ).toBe(false);

    expect(
      canAccessTopUpReceipt({
        user: undefined,
        topUp: shareTopUp,
        shareToken: token
      })
    ).toBe(true);

    expect(
      canAccessTopUpReceipt({
        user: undefined,
        topUp: shareTopUp,
        shareToken: "bad-token"
      })
    ).toBe(false);
  });

  it("génère puis révoque un lien de partage de reçu", async () => {
    const owner = await createPlayerWithPassword("ReceiptShare123!", false);
    const topUp = await prisma.walletTopUp.create({
      data: {
        userId: owner.id,
        amount: decimal(20),
        paymentMethod: "CASH",
        status: TopUpStatus.APPROVED,
        reviewedById: adminId,
        reviewedAt: new Date(),
        receiptNumber: "FMW-20260725-000000-BBBB2222",
        receiptIssuedAt: new Date(),
        receiptGeneratedById: adminId
      }
    });

    mocks.auth.mockResolvedValue(adminSession());

    const generated = await generateTopUpReceiptShareLink(topUp.id);
    expect(generated.shareUrl).toContain(`/admin/alimentations/${topUp.id}/recu?token=`);

    const afterGenerate = await prisma.walletTopUp.findUnique({
      where: { id: topUp.id }
    });

    expect(afterGenerate?.receiptShareTokenHash).toBeTruthy();
    expect(
      canAccessTopUpReceipt({
        user: undefined,
        topUp: afterGenerate as {
          userId: string;
          receiptShareTokenHash?: string | null;
          receiptShareTokenExpiresAt?: Date | null;
          receiptShareTokenRevokedAt?: Date | null;
        },
        shareToken: generated.token
      })
    ).toBe(true);

    await revokeTopUpReceiptShareLink(topUp.id);

    const afterRevoke = await prisma.walletTopUp.findUnique({
      where: { id: topUp.id }
    });

    expect(afterRevoke?.receiptShareTokenRevokedAt).not.toBeNull();
    expect(
      canAccessTopUpReceipt({
        user: undefined,
        topUp: afterRevoke as {
          userId: string;
          receiptShareTokenHash?: string | null;
          receiptShareTokenExpiresAt?: Date | null;
          receiptShareTokenRevokedAt?: Date | null;
        },
        shareToken: generated.token
      })
    ).toBe(false);
  });
});
