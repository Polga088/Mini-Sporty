"use server";

import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decimal } from "@/lib/money";
import {
  createPlayerSchema,
  manualWalletAdjustmentSchema,
  updatePlayerSchema
} from "@/lib/validators";
import { Prisma, Role, WalletTransactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

class BusinessError extends Error {
  code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!session.user.isAdmin) redirect("/espace");
  return session;
}

function noticeUrl(path: string, key: string, notice: string) {
  return `${path}?${new URLSearchParams({ [key]: notice }).toString()}`;
}

function listError(notice: string) {
  redirect(noticeUrl("/admin/joueurs", "error", notice));
}

function detailSuccess(playerId: string, notice: string) {
  redirect(noticeUrl(`/admin/joueurs/${playerId}`, "success", notice));
}

function detailError(playerId: string, notice: string) {
  redirect(noticeUrl(`/admin/joueurs/${playerId}`, "error", notice));
}

function normalizeOptionalText(value: string | null | undefined) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function errorCode(error: unknown): string {
  if (error instanceof BusinessError) return error.code;
  if (error instanceof z.ZodError) return "validation";
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "duplicate_email";
    if (error.code === "P2025") return "not_found";
  }
  return "unexpected";
}

function playerIdFromForm(formData: FormData) {
  return String(formData.get("playerId") ?? "");
}

function returnToFromForm(formData: FormData) {
  const value = String(formData.get("returnTo") ?? "/admin/joueurs");
  return value.startsWith("/") ? value : "/admin/joueurs";
}

function passwordResetPassword() {
  return `Fm-${randomBytes(4).toString("hex")}-2026!`;
}

export async function createPlayer(formData: FormData) {
  const session = await requireAdmin();
  let playerId: string;

  try {
    const payload = createPlayerSchema.parse({
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      temporaryPassword: formData.get("temporaryPassword"),
      initialBalance: formData.get("initialBalance")
    });

    const initialBalance = decimal(payload.initialBalance ?? 0);

    const player = await prisma.$transaction(async (tx) => {
      const passwordHash = await bcrypt.hash(payload.temporaryPassword, 10);

      const user = await tx.user.create({
        data: {
          name: payload.name,
          email: payload.email,
          phone: normalizeOptionalText(payload.phone),
          passwordHash,
          role: Role.PLAYER,
          isActive: true
        }
      });

      const wallet = await tx.wallet.create({
        data: {
          userId: user.id,
          balance: initialBalance
        }
      });

      if (initialBalance.gt(0)) {
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: WalletTransactionType.MANUAL_CREDIT,
            amount: initialBalance,
            balanceBefore: decimal(0),
            balanceAfter: initialBalance,
            description: `Solde initial du joueur ${user.name}`,
            referenceType: "Player",
            referenceId: user.id,
            createdById: session.user.id
          }
        });
      }

      return user;
    });

    playerId = player.id;
  } catch (error) {
    const code = errorCode(error);
    if (code === "duplicate_email") listError("email_taken");
    if (code === "validation") listError("validation");
    if (code === "unexpected") throw error;
    listError(code);
    return;
  }

  revalidatePath("/admin/joueurs");
  revalidatePath(`/admin/joueurs/${playerId}`);
  detailSuccess(playerId, "created");
}

export async function updatePlayer(formData: FormData) {
  await requireAdmin();
  const playerId = playerIdFromForm(formData);

  try {
    const payload = updatePlayerSchema.parse({
      playerId,
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone"),
      isActive: formData.get("isActive")
    });

    const existing = await prisma.user.findUnique({
      where: { id: payload.playerId },
      include: { wallet: true }
    });

    if (!existing || existing.role !== Role.PLAYER) {
      throw new BusinessError("not_found");
    }

    await prisma.user.update({
      where: { id: existing.id },
      data: {
        name: payload.name,
        email: payload.email,
        phone: normalizeOptionalText(payload.phone),
        isActive: payload.isActive
      }
    });

    revalidatePath("/admin/joueurs");
    revalidatePath(`/admin/joueurs/${existing.id}`);
    detailSuccess(existing.id, "updated");
  } catch (error) {
    const code = errorCode(error);
    if (code === "duplicate_email") detailError(playerId, "email_taken");
    if (code === "not_found") detailError(playerId, "not_found");
    if (code === "validation") detailError(playerId, "validation");
    if (code === "unexpected") throw error;
    detailError(playerId, code);
  }
}

async function setPlayerStatus(playerId: string, isActive: boolean) {
  const existing = await prisma.user.findUnique({
    where: { id: playerId },
    select: { id: true, role: true }
  });

  if (!existing || existing.role !== Role.PLAYER) {
    throw new BusinessError("not_found");
  }

  await prisma.user.update({
    where: { id: existing.id },
    data: { isActive }
  });

  revalidatePath("/admin/joueurs");
  revalidatePath(`/admin/joueurs/${existing.id}`);

  return existing.id;
}

export async function disablePlayer(formData: FormData) {
  await requireAdmin();
  const playerId = playerIdFromForm(formData);

  try {
    const updatedId = await setPlayerStatus(playerId, false);
    detailSuccess(updatedId, "disabled");
  } catch (error) {
    const code = errorCode(error);
    if (code === "not_found") detailError(playerId, "not_found");
    if (code === "unexpected") throw error;
    detailError(playerId, code);
  }
}

export async function enablePlayer(formData: FormData) {
  await requireAdmin();
  const playerId = playerIdFromForm(formData);

  try {
    const updatedId = await setPlayerStatus(playerId, true);
    detailSuccess(updatedId, "enabled");
  } catch (error) {
    const code = errorCode(error);
    if (code === "not_found") detailError(playerId, "not_found");
    if (code === "unexpected") throw error;
    detailError(playerId, code);
  }
}

export async function resetPlayerPassword(formData: FormData) {
  await requireAdmin();
  const playerId = playerIdFromForm(formData);
  const returnTo = returnToFromForm(formData);

  try {
    const payload = z.object({
      playerId: z.string().min(1)
    }).parse({ playerId });

    const player = await prisma.user.findUnique({
      where: { id: payload.playerId },
      select: { id: true, role: true }
    });

    if (!player || player.role !== Role.PLAYER) {
      throw new BusinessError("not_found");
    }

    const temporaryPassword = passwordResetPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    await prisma.user.update({
      where: { id: player.id },
      data: { passwordHash }
    });

    revalidatePath("/admin/joueurs");
    revalidatePath(`/admin/joueurs/${player.id}`);

    redirect(`${returnTo}?${new URLSearchParams({ success: "password_reset" }).toString()}`);
  } catch (error) {
    const code = errorCode(error);
    if (code === "not_found") detailError(playerId, "not_found");
    if (code === "validation") detailError(playerId, "validation");
    if (code === "unexpected") throw error;
    detailError(playerId, code);
  }
}

export async function deletePlayer(formData: FormData) {
  await requireAdmin();
  const playerId = playerIdFromForm(formData);
  const returnTo = returnToFromForm(formData);

  try {
    const player = await prisma.user.findUnique({
      where: { id: playerId },
      include: {
        wallet: {
          include: {
            transactions: true
          }
        },
        participatedMatches: true,
        topUps: true
      }
    });

    if (!player || player.role !== Role.PLAYER) {
      throw new BusinessError("not_found");
    }

    const linkedMatch = player.participatedMatches.length > 0;
    const linkedWallet = Boolean(player.wallet);
    const linkedTransactions = Boolean(player.wallet?.transactions.length);
    const linkedTopUps = player.topUps.length > 0;

    if (linkedMatch || linkedWallet || linkedTransactions || linkedTopUps) {
      throw new BusinessError("delete_blocked");
    }

    await prisma.user.delete({
      where: { id: player.id }
    });

    revalidatePath("/admin/joueurs");
    redirect(`${returnTo}?${new URLSearchParams({ success: "deleted" }).toString()}`);
  } catch (error) {
    const code = errorCode(error);
    if (code === "delete_blocked") {
      redirect(`${returnTo}?${new URLSearchParams({ error: "delete_blocked" }).toString()}`);
    }
    if (code === "not_found") detailError(playerId, "not_found");
    if (code === "unexpected") throw error;
    detailError(playerId, code);
  }
}

export async function createManualWalletAdjustment(formData: FormData) {
  const session = await requireAdmin();
  const playerId = playerIdFromForm(formData);

  try {
    const payload = manualWalletAdjustmentSchema.parse({
      playerId,
      adjustmentType: formData.get("adjustmentType"),
      amount: formData.get("amount"),
      reason: formData.get("reason")
    });

    await prisma.$transaction(async (tx) => {
      const player = await tx.user.findUnique({
        where: { id: payload.playerId },
        include: { wallet: true }
      });

      if (!player || player.role !== Role.PLAYER || !player.wallet) {
        throw new BusinessError("not_found");
      }

      const amount = decimal(payload.amount);
      if (amount.lte(0)) {
        throw new BusinessError("invalid_amount");
      }

      const balanceBefore = player.wallet.balance;
      const balanceAfter =
        payload.adjustmentType === "CREDIT" ? balanceBefore.add(amount) : balanceBefore.sub(amount);

      if (balanceAfter.lt(0)) {
        throw new BusinessError("insufficient_balance");
      }

      await tx.wallet.update({
        where: { id: player.wallet.id },
        data: { balance: balanceAfter }
      });

      await tx.walletTransaction.create({
        data: {
          walletId: player.wallet.id,
          type:
            payload.adjustmentType === "CREDIT"
              ? WalletTransactionType.MANUAL_CREDIT
              : WalletTransactionType.MANUAL_DEBIT,
          amount,
          balanceBefore,
          balanceAfter,
          description: `Ajustement manuel: ${payload.reason}`,
          referenceType: "ManualAdjustment",
          referenceId: player.id,
          createdById: session.user.id
        }
      });
    });

    revalidatePath("/admin/joueurs");
    revalidatePath(`/admin/joueurs/${playerId}`);
    detailSuccess(playerId, "adjusted");
  } catch (error) {
    const code = errorCode(error);
    if (code === "not_found") detailError(playerId, "not_found");
    if (code === "validation") detailError(playerId, "validation");
    if (code === "insufficient_balance") detailError(playerId, "insufficient_balance");
    if (code === "unexpected") throw error;
    detailError(playerId, code);
  }
}
