"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatDh } from "@/lib/money";
import { canAccessSensitiveAdmin } from "@/lib/permissions";
import { MatchPaymentStatus, MatchParticipantStatus, NotificationType, Prisma, WalletTransactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!canAccessSensitiveAdmin(session.user.role)) redirect("/espace");
  return session;
}

export async function refundMatchParticipant(formData: FormData) {
  const session = await requireAdmin();
  const participantId = String(formData.get("participantId") ?? "");

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const participant = await tx.matchParticipant.findUnique({
      where: { id: participantId },
      include: {
        match: true,
        user: { include: { wallet: true } }
      }
    });

    if (!participant || participant.paymentStatus !== MatchPaymentStatus.PAID || !participant.user.wallet) {
      return;
    }

    const wallet = participant.user.wallet;
    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore.add(participant.amountCharged);

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: balanceAfter }
    });

    await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: WalletTransactionType.REFUND,
        amount: participant.amountCharged,
        balanceBefore,
        balanceAfter,
        description: `Remboursement du match ${participant.match.title}`,
        referenceType: "MatchParticipant",
        referenceId: participant.id,
        createdById: session.user.id
      }
    });

    await tx.matchParticipant.update({
      where: { id: participant.id },
      data: {
        paymentStatus: MatchPaymentStatus.REFUNDED,
        status: MatchParticipantStatus.CANCELLED,
        refundedAt: new Date()
      }
    });

    await tx.notification.create({
      data: {
        userId: participant.userId,
        type: NotificationType.REFUND_CREATED,
        title: "Remboursement effectué",
        message: `Vous avez reçu un remboursement de ${formatDh(participant.amountCharged)}.`
      }
    });
  });

  revalidatePath("/admin/matchs");
  revalidatePath("/espace/matchs");
}
