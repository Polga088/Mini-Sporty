"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decimal, formatDh } from "@/lib/money";
import { canAccessSensitiveAdmin } from "@/lib/permissions";
import { createContributionSchema } from "@/lib/validators";
import { ContributionParticipantStatus, ContributionStatus, NotificationType, Prisma, WalletTransactionType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!canAccessSensitiveAdmin(session.user.role)) redirect("/espace");
  return session;
}

export async function createContribution(formData: FormData) {
  const session = await requireAdmin();
  const payload = createContributionSchema.parse({
    title: formData.get("title"),
    description: formData.get("description"),
    amountPerPlayer: formData.get("amountPerPlayer"),
    targetAmount: formData.get("targetAmount"),
    dueDate: formData.get("dueDate"),
    automaticDebit: formData.get("automaticDebit")
  });

  await prisma.contribution.create({
    data: {
      title: payload.title,
      description: payload.description,
      amountPerPlayer: decimal(payload.amountPerPlayer),
      targetAmount: payload.targetAmount ? decimal(payload.targetAmount) : null,
      dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
      automaticDebit: payload.automaticDebit !== "off",
      status: ContributionStatus.ACTIVE,
      createdById: session.user.id
    }
  });

  revalidatePath("/admin/cotisations");
}

export async function debitContribution(contributionId: string) {
  const session = await requireAdmin();

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const contribution = await tx.contribution.findUnique({
      where: { id: contributionId },
      include: { participants: true }
    });

    if (!contribution) return;

    const players = await tx.user.findMany({
      where: { role: "PLAYER", isActive: true },
      include: { wallet: true }
    });

    for (const user of players) {
      if (!user.wallet || user.wallet.balance.lt(contribution.amountPerPlayer)) {
        await tx.contributionParticipant.upsert({
          where: {
            contributionId_userId: { contributionId: contribution.id, userId: user.id }
          },
          create: {
            contributionId: contribution.id,
            userId: user.id,
            amount: contribution.amountPerPlayer,
            status: ContributionParticipantStatus.FAILED
          },
          update: {
            status: ContributionParticipantStatus.FAILED
          }
        }).catch(() => null);
        continue;
      }

      const balanceBefore = user.wallet.balance;
      const balanceAfter = balanceBefore.sub(contribution.amountPerPlayer);
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: user.wallet.id,
          type: WalletTransactionType.CONTRIBUTION_PAYMENT,
          amount: contribution.amountPerPlayer,
          balanceBefore,
          balanceAfter,
          description: `Cotisation: ${contribution.title}`,
          referenceType: "Contribution",
          referenceId: contribution.id,
          createdById: session.user.id
        }
      });

      await tx.wallet.update({
        where: { id: user.wallet.id },
        data: { balance: balanceAfter }
      });

      await tx.contributionParticipant.upsert({
        where: {
          contributionId_userId: { contributionId: contribution.id, userId: user.id }
        },
        create: {
          contributionId: contribution.id,
          userId: user.id,
          amount: contribution.amountPerPlayer,
          status: ContributionParticipantStatus.PAID,
          paidAt: new Date(),
          walletTransactionId: transaction.id
        },
        update: {
          amount: contribution.amountPerPlayer,
          status: ContributionParticipantStatus.PAID,
          paidAt: new Date(),
          walletTransactionId: transaction.id
        }
      });

      if (balanceAfter.lt(20)) {
        await tx.notification.create({
          data: {
            userId: user.id,
            type: NotificationType.LOW_BALANCE,
            title: "Solde faible",
            message: `Après la cotisation "${contribution.title}", votre solde est de ${formatDh(balanceAfter)}.`
          }
        });
      }
    }
  });

  revalidatePath("/admin/cotisations");
}
