"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decimal, formatDh } from "@/lib/money";
import { lowBalanceNotification } from "@/lib/notifications";
import { generateReceiptNumber } from "@/lib/topup-receipt";
import { getAppSettings } from "@/lib/settings";
import { topUpIdSchema, topUpSchema } from "@/lib/validators";
import { NotificationType, Prisma, TopUpStatus, WalletTransactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canAccessSensitiveAdmin } from "@/lib/permissions";

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
  if (!canAccessSensitiveAdmin(session.user.role)) redirect("/espace");
  return session;
}

function normalizeOptionalText(value: string | null | undefined) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function errorCode(error: unknown): string {
  if (error instanceof BusinessError) return error.code;
  if (error instanceof z.ZodError) return "validation";
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "duplicate";
    if (error.code === "P2025") return "not_found";
  }
  return "unexpected";
}

function redirectPathForSession(isAdmin: boolean) {
  return isAdmin ? "/admin/alimentations" : "/espace/portefeuilles";
}

function redirectWithNotice(path: string, key: string, notice: string) {
  redirect(`${path}?${new URLSearchParams({ [key]: notice }).toString()}`);
}

function revalidateTopUpViews(topUpId: string) {
  revalidatePath("/admin/alimentations");
  revalidatePath("/espace/portefeuilles");
  revalidatePath(`/admin/alimentations/${topUpId}/recu`);
}

function parseTopUpId(formData: FormData) {
  return topUpIdSchema.parse({
    topUpId: formData.get("topUpId")
  }).topUpId;
}

export async function requestTopUp(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  try {
    const payload = topUpSchema.parse({
      userId: session.user.isAdmin ? formData.get("userId") : session.user.id,
      amount: formData.get("amount"),
      paymentMethod: formData.get("paymentMethod"),
      note: formData.get("note"),
      proofUrl: formData.get("proofUrl")
    });

    await prisma.walletTopUp.create({
      data: {
        userId: payload.userId,
        amount: decimal(payload.amount),
        paymentMethod: payload.paymentMethod,
        note: normalizeOptionalText(payload.note),
        proofUrl: normalizeOptionalText(payload.proofUrl),
        status: TopUpStatus.PENDING
      }
    });
  } catch (error) {
    const code = errorCode(error);
    if (code === "validation") redirectWithNotice(redirectPathForSession(Boolean(session.user.isAdmin)), "error", "validation");
    if (code === "unexpected") throw error;
    redirectWithNotice(redirectPathForSession(Boolean(session.user.isAdmin)), "error", code);
  }

  revalidatePath("/admin/alimentations");
  revalidatePath("/espace/portefeuilles");
  redirectWithNotice(redirectPathForSession(Boolean(session.user.isAdmin)), "success", "topup_requested");
}

export async function approveTopUp(formData: FormData) {
  const session = await requireAdmin();
  const topUpId = parseTopUpId(formData);
  const settings = await getAppSettings();

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const topUp = await tx.walletTopUp.findUnique({
        where: { id: topUpId },
        include: {
          user: {
            include: { wallet: true }
          }
        }
      });

      if (!topUp) {
        throw new BusinessError("not_found");
      }

      if (topUp.status !== TopUpStatus.PENDING) {
        throw new BusinessError("already_processed");
      }

      if (!topUp.user.wallet) {
        throw new BusinessError("invalid_state");
      }

      const receiptIssuedAt = new Date();
      const receiptNumber = generateReceiptNumber(receiptIssuedAt);
      const balanceBefore = topUp.user.wallet.balance;
      const balanceAfter = balanceBefore.add(topUp.amount);

      await tx.wallet.update({
        where: { id: topUp.user.wallet.id },
        data: { balance: balanceAfter }
      });

      await tx.walletTransaction.create({
        data: {
          walletId: topUp.user.wallet.id,
          type: WalletTransactionType.TOP_UP,
          amount: topUp.amount,
          balanceBefore,
          balanceAfter,
          description: `Alimentation validée de ${formatDh(topUp.amount)}`,
          referenceType: "WalletTopUp",
          referenceId: topUp.id,
          createdById: session.user.id
        }
      });

      await tx.walletTopUp.update({
        where: { id: topUp.id },
        data: {
          status: TopUpStatus.APPROVED,
          reviewedById: session.user.id,
          reviewedAt: receiptIssuedAt,
          receiptNumber,
          receiptIssuedAt,
          receiptGeneratedById: session.user.id
        }
      });

      await tx.notification.create({
        data: {
          userId: topUp.userId,
          type: NotificationType.TOP_UP_APPROVED,
          title: "Alimentation approuvée",
          message: `Votre portefeuille a été crédité de ${formatDh(topUp.amount)}.`
        }
      });

      if (balanceAfter.lt(settings.walletAlertThreshold)) {
        await tx.notification.create({
          data: {
            userId: topUp.userId,
            ...lowBalanceNotification(balanceAfter, settings.walletAlertThreshold.toNumber())
          }
        });
      }
    });
  } catch (error) {
    const code = errorCode(error);
    if (code === "validation") redirectWithNotice("/admin/alimentations", "error", "validation");
    if (code === "not_found") redirectWithNotice("/admin/alimentations", "error", "not_found");
    if (code === "already_processed") redirectWithNotice("/admin/alimentations", "error", "already_processed");
    if (code === "unexpected") throw error;
    redirectWithNotice("/admin/alimentations", "error", code);
  }

  revalidateTopUpViews(topUpId);
  redirectWithNotice("/admin/alimentations", "success", "topup_approved");
}

export async function rejectTopUp(formData: FormData) {
  const session = await requireAdmin();
  const topUpId = parseTopUpId(formData);

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const topUp = await tx.walletTopUp.findUnique({
        where: { id: topUpId }
      });

      if (!topUp) {
        throw new BusinessError("not_found");
      }

      if (topUp.status !== TopUpStatus.PENDING) {
        throw new BusinessError("already_processed");
      }

      await tx.walletTopUp.update({
        where: { id: topUpId },
        data: {
          status: TopUpStatus.REJECTED,
          reviewedById: session.user.id,
          reviewedAt: new Date()
        }
      });

      await tx.notification.create({
        data: {
          userId: topUp.userId,
          type: NotificationType.TOP_UP_REJECTED,
          title: "Alimentation refusée",
          message: `Votre demande de ${formatDh(topUp.amount)} a été refusée.`
        }
      });
    });
  } catch (error) {
    const code = errorCode(error);
    if (code === "validation") redirectWithNotice("/admin/alimentations", "error", "validation");
    if (code === "not_found") redirectWithNotice("/admin/alimentations", "error", "not_found");
    if (code === "already_processed") redirectWithNotice("/admin/alimentations", "error", "already_processed");
    if (code === "unexpected") throw error;
    redirectWithNotice("/admin/alimentations", "error", code);
  }

  revalidateTopUpViews(topUpId);
  redirectWithNotice("/admin/alimentations", "success", "topup_rejected");
}

export async function cancelTopUp(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const topUpId = parseTopUpId(formData);

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const topUp = await tx.walletTopUp.findUnique({
        where: { id: topUpId }
      });

      if (!topUp) {
        throw new BusinessError("not_found");
      }

      if (topUp.userId !== session.user.id) {
        throw new BusinessError("not_owner");
      }

      if (topUp.status !== TopUpStatus.PENDING) {
        throw new BusinessError("not_pending");
      }

      await tx.walletTopUp.update({
        where: { id: topUpId },
        data: {
          status: TopUpStatus.CANCELLED
        }
      });
    });
  } catch (error) {
    const code = errorCode(error);
    if (code === "validation") redirectWithNotice("/espace/portefeuilles", "error", "validation");
    if (code === "not_found") redirectWithNotice("/espace/portefeuilles", "error", "not_found");
    if (code === "not_owner") redirectWithNotice("/espace/portefeuilles", "error", "not_owner");
    if (code === "not_pending") redirectWithNotice("/espace/portefeuilles", "error", "not_pending");
    if (code === "unexpected") throw error;
    redirectWithNotice("/espace/portefeuilles", "error", code);
  }

  revalidateTopUpViews(topUpId);
  redirectWithNotice("/espace/portefeuilles", "success", "topup_cancelled");
}

export async function reviewTopUp(formData: FormData) {
  const decision = String(formData.get("decision") ?? "APPROVED");
  if (decision === "REJECTED") {
    return rejectTopUp(formData);
  }
  return approveTopUp(formData);
}
