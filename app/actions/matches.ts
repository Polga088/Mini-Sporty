"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decimal, formatDh } from "@/lib/money";
import {
  cancelMatchSchema,
  confirmParticipantSchema,
  createMatchSchema,
  matchParticipantActionSchema,
  participantAttendanceSchemaInput,
  promoteWaitlistedParticipantSchema,
  updateMatchSchema
} from "@/lib/validators";
import {
  MatchPaymentStatus,
  MatchParticipantStatus,
  MatchStatus,
  NotificationType,
  Prisma,
  WalletTransactionType
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canManageSport } from "@/lib/permissions";
import { matchCancelledNotification, matchCreatedNotification, matchUpdatedNotification } from "@/lib/notifications";

class BusinessError extends Error {
  code: string;

  constructor(code: string, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

function parseDateInput(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

function normalizeOptionalText(value: string | null | undefined) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function normalizeOptionalDate(value: string | null | undefined) {
  const text = normalizeOptionalText(value);
  return text ? parseDateInput(text) : null;
}

function noticeUrl(path: string, key: string, notice: string) {
  return `${path}?${new URLSearchParams({ [key]: notice }).toString()}`;
}

function detailSuccess(matchId: string, notice: string) {
  redirect(noticeUrl(`/admin/matchs/${matchId}`, "success", notice));
}

function detailError(matchId: string, notice: string) {
  redirect(noticeUrl(`/admin/matchs/${matchId}`, "error", notice));
}

function listError(notice: string) {
  redirect(noticeUrl("/admin/matchs", "error", notice));
}

function newMatchError(notice: string) {
  redirect(noticeUrl("/admin/matchs/nouveau", "error", notice));
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!canManageSport(session.user.role)) redirect("/espace");
  return session;
}

function errorCode(error: unknown): string {
  if (error instanceof BusinessError) return error.code;
  if (error instanceof z.ZodError) return "validation";
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return "already_participant";
    if (error.code === "P2025") return "not_found";
  }
  return "unexpected";
}

function isClosedMatch(status: MatchStatus) {
  return status === MatchStatus.CANCELLED || status === MatchStatus.COMPLETED;
}

async function fetchMatch(tx: Prisma.TransactionClient, matchId: string) {
  return tx.match.findUnique({
    where: { id: matchId },
    include: {
      participants: {
        include: {
          user: { include: { wallet: true } }
        }
      }
    }
  });
}

async function fetchParticipant(tx: Prisma.TransactionClient, participantId: string) {
  return tx.matchParticipant.findUnique({
    where: { id: participantId },
    include: {
      match: {
        include: {
          participants: true
        }
      },
      user: { include: { wallet: true } }
    }
  });
}

async function debitMatchFee(tx: Prisma.TransactionClient, params: {
  walletId: string;
  actorId: string;
  amount: Prisma.Decimal;
  matchId: string;
  matchTitle: string;
}) {
  const wallet = await tx.wallet.findUnique({
    where: { id: params.walletId },
    select: { id: true, balance: true }
  });

  if (!wallet) {
    throw new BusinessError("invalid_state");
  }

  const balanceBefore = wallet.balance;
  if (balanceBefore.lt(params.amount)) {
    throw new BusinessError("insufficient_balance");
  }

  const balanceAfter = balanceBefore.sub(params.amount);

  await tx.wallet.update({
    where: { id: wallet.id },
    data: { balance: balanceAfter }
  });

  await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: WalletTransactionType.MATCH_PAYMENT,
      amount: params.amount,
      balanceBefore,
      balanceAfter,
      description: `Participation au match ${params.matchTitle}`,
      referenceType: "Match",
      referenceId: params.matchId,
      createdById: params.actorId
    }
  });

  return { balanceBefore, balanceAfter };
}

async function refundParticipant(tx: Prisma.TransactionClient, params: {
  participant: {
    id: string;
    paymentStatus: MatchPaymentStatus;
    amountCharged: Prisma.Decimal;
    userId: string;
    user: {
      wallet: {
        id: string;
        balance: Prisma.Decimal;
      } | null;
    };
  };
  actorId: string;
  matchTitle: string;
}) {
  if (params.participant.paymentStatus !== MatchPaymentStatus.PAID) {
    return false;
  }

  if (!params.participant.user.wallet) {
    throw new BusinessError("invalid_state");
  }

  const balanceBefore = params.participant.user.wallet.balance;
  const balanceAfter = balanceBefore.add(params.participant.amountCharged);

  await tx.wallet.update({
    where: { id: params.participant.user.wallet.id },
    data: { balance: balanceAfter }
  });

  await tx.walletTransaction.create({
    data: {
      walletId: params.participant.user.wallet.id,
      type: WalletTransactionType.REFUND,
      amount: params.participant.amountCharged,
      balanceBefore,
      balanceAfter,
      description: `Remboursement du match ${params.matchTitle}`,
      referenceType: "MatchParticipant",
      referenceId: params.participant.id,
      createdById: params.actorId
    }
  });

  return true;
}

async function upsertParticipant(tx: Prisma.TransactionClient, params: {
  matchId: string;
  userId: string;
  status: MatchParticipantStatus;
  paymentStatus: MatchPaymentStatus;
  amountCharged?: Prisma.Decimal;
}) {
  return tx.matchParticipant.upsert({
    where: { matchId_userId: { matchId: params.matchId, userId: params.userId } },
    create: {
      matchId: params.matchId,
      userId: params.userId,
      status: params.status,
      paymentStatus: params.paymentStatus,
      amountCharged: params.amountCharged ?? decimal(0),
      cancelledAt: null,
      refundedAt: null
    },
    update: {
      status: params.status,
      paymentStatus: params.paymentStatus,
      amountCharged: params.amountCharged ?? decimal(0),
      cancelledAt: null,
      refundedAt: null
    }
  });
}

function revalidateMatchViews(matchId: string) {
  revalidatePath("/admin/matchs");
  revalidatePath(`/admin/matchs/${matchId}`);
  revalidatePath("/espace/matchs");
  revalidatePath("/espace");
}

export async function createMatch(formData: FormData) {
  const session = await requireAdmin();

  try {
    const payload = createMatchSchema.parse({
      title: formData.get("title"),
      matchDate: formData.get("matchDate"),
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      location: formData.get("location"),
      bookingReference: formData.get("bookingReference"),
      capacity: formData.get("capacity"),
      participationFee: formData.get("participationFee"),
      cancellationDeadline: formData.get("cancellationDeadline"),
      status: formData.get("status"),
      notes: formData.get("notes")
    });

    const match = await prisma.match.create({
      data: {
        title: payload.title,
        matchDate: parseDateInput(payload.matchDate),
        startTime: payload.startTime,
        endTime: payload.endTime,
        location: payload.location,
        bookingReference: normalizeOptionalText(payload.bookingReference),
        capacity: payload.capacity,
        participationFee: decimal(payload.participationFee ?? 10),
        cancellationDeadline: normalizeOptionalDate(payload.cancellationDeadline),
        status: payload.status,
        notes: normalizeOptionalText(payload.notes),
        createdById: session.user.id
      }
    });

    await prisma.notification.createMany({
      data: [{ userId: session.user.id, ...matchCreatedNotification(match.title) }]
    });

    revalidateMatchViews(match.id);
    detailSuccess(match.id, "match_created");
  } catch (error) {
    const code = errorCode(error);
    if (code === "validation") newMatchError("validation");
    if (code === "unexpected") throw error;
    newMatchError(code);
  }
}

export async function updateMatch(formData: FormData) {
  await requireAdmin();

  const matchId = String(formData.get("matchId") ?? "");

  try {
    const payload = updateMatchSchema.parse({
      matchId,
      title: formData.get("title"),
      matchDate: formData.get("matchDate"),
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      location: formData.get("location"),
      bookingReference: formData.get("bookingReference"),
      capacity: formData.get("capacity"),
      participationFee: formData.get("participationFee"),
      cancellationDeadline: formData.get("cancellationDeadline"),
      status: formData.get("status"),
      notes: formData.get("notes")
    });

    const match = await prisma.match.findUnique({
      where: { id: payload.matchId },
      select: { id: true, status: true }
    });

    if (!match) {
      listError("not_found");
      return;
    }

    if (match.status === MatchStatus.CANCELLED && payload.status !== MatchStatus.CANCELLED) {
      throw new BusinessError("invalid_state");
    }

    if (payload.status === MatchStatus.CANCELLED && match.status !== MatchStatus.CANCELLED) {
      throw new BusinessError("invalid_state");
    }

    await prisma.match.update({
      where: { id: payload.matchId },
      data: {
        title: payload.title,
        matchDate: parseDateInput(payload.matchDate),
        startTime: payload.startTime,
        endTime: payload.endTime,
        location: payload.location,
        bookingReference: normalizeOptionalText(payload.bookingReference),
        capacity: payload.capacity,
        participationFee: decimal(payload.participationFee ?? 10),
        cancellationDeadline: normalizeOptionalDate(payload.cancellationDeadline),
        status: payload.status,
        notes: normalizeOptionalText(payload.notes)
      }
    });

    const participants = await prisma.matchParticipant.findMany({
      where: { matchId: payload.matchId },
      select: { userId: true }
    });
    if (participants.length > 0) {
      await prisma.notification.createMany({
        data: participants.map((participant) => ({
          userId: participant.userId,
          ...matchUpdatedNotification(payload.title)
        }))
      });
    }

    revalidateMatchViews(payload.matchId);
    detailSuccess(payload.matchId, "match_updated");
  } catch (error) {
    const code = errorCode(error);
    if (code === "validation") detailError(matchId, "validation");
    if (code === "invalid_state") detailError(matchId, "invalid_state");
    if (code === "unexpected") throw error;
    detailError(matchId, code);
  }
}

export async function cancelMatch(formData: FormData) {
  const session = await requireAdmin();
  const payload = cancelMatchSchema.parse({
    matchId: formData.get("matchId")
  });

  try {
    await prisma.$transaction(async (tx) => {
      const match = await fetchMatch(tx, payload.matchId);

      if (!match) {
        throw new BusinessError("not_found");
      }

      if (match.status === MatchStatus.CANCELLED) {
        throw new BusinessError("already_cancelled");
      }

      for (const participant of match.participants) {
        await refundParticipant(tx, { participant, actorId: session.user.id, matchTitle: match.title });

        await tx.matchParticipant.update({
          where: { id: participant.id },
          data: {
            status: MatchParticipantStatus.CANCELLED,
            paymentStatus: participant.paymentStatus === MatchPaymentStatus.PAID ? MatchPaymentStatus.REFUNDED : MatchPaymentStatus.NOT_REQUIRED,
            cancelledAt: new Date(),
            refundedAt: participant.paymentStatus === MatchPaymentStatus.PAID ? new Date() : null
          }
        });

        await tx.notification.create({
          data: {
            userId: participant.userId,
            ...matchCancelledNotification(match.title)
          }
        });
      }

      await tx.match.update({
        where: { id: match.id },
        data: { status: MatchStatus.CANCELLED }
      });
    });

    revalidateMatchViews(payload.matchId);
    detailSuccess(payload.matchId, "match_cancelled");
  } catch (error) {
    const code = errorCode(error);
    if (code === "not_found") listError("not_found");
    if (code === "already_cancelled") detailError(payload.matchId, "already_cancelled");
    if (code === "unexpected") throw error;
    detailError(payload.matchId, code);
  }
}

export async function addParticipant(formData: FormData) {
  await requireAdmin();
  const payload = matchParticipantActionSchema.parse({
    matchId: formData.get("matchId"),
    userId: formData.get("userId")
  });

  try {
    await prisma.$transaction(async (tx) => {
      const match = await fetchMatch(tx, payload.matchId);
      const user = await tx.user.findUnique({
        where: { id: payload.userId },
        include: { wallet: true }
      });

      if (!match || !user || user.role !== "PLAYER" || !user.isActive || !user.wallet) {
        throw new BusinessError("inactive_player");
      }

      if (isClosedMatch(match.status)) {
        throw new BusinessError("invalid_state");
      }

      const existing = match.participants.find((participant) => participant.userId === user.id);
      if (existing && existing.status !== MatchParticipantStatus.CANCELLED) {
        throw new BusinessError("already_participant");
      }

      await upsertParticipant(tx, {
        matchId: match.id,
        userId: user.id,
        status: MatchParticipantStatus.INVITED,
        paymentStatus: MatchPaymentStatus.NOT_REQUIRED,
        amountCharged: decimal(0)
      });
    });

    revalidateMatchViews(payload.matchId);
    detailSuccess(payload.matchId, "participant_added");
  } catch (error) {
    const code = errorCode(error);
    if (code === "inactive_player") detailError(payload.matchId, "inactive_player");
    if (code === "already_participant") detailError(payload.matchId, "already_participant");
    if (code === "invalid_state") detailError(payload.matchId, "invalid_state");
    if (code === "unexpected") throw error;
    detailError(payload.matchId, code);
  }
}

export async function addParticipantToWaitlist(formData: FormData) {
  await requireAdmin();
  const payload = matchParticipantActionSchema.parse({
    matchId: formData.get("matchId"),
    userId: formData.get("userId")
  });

  try {
    await prisma.$transaction(async (tx) => {
      const match = await fetchMatch(tx, payload.matchId);
      const user = await tx.user.findUnique({
        where: { id: payload.userId },
        include: { wallet: true }
      });

      if (!match || !user || user.role !== "PLAYER" || !user.isActive || !user.wallet) {
        throw new BusinessError("inactive_player");
      }

      if (isClosedMatch(match.status)) {
        throw new BusinessError("invalid_state");
      }

      const existing = match.participants.find((participant) => participant.userId === user.id);
      if (existing && existing.status === MatchParticipantStatus.WAITLISTED) {
        return;
      }
      if (existing && existing.status !== MatchParticipantStatus.CANCELLED) {
        throw new BusinessError("already_participant");
      }

      await upsertParticipant(tx, {
        matchId: match.id,
        userId: user.id,
        status: MatchParticipantStatus.WAITLISTED,
        paymentStatus: MatchPaymentStatus.NOT_REQUIRED,
        amountCharged: decimal(0)
      });
    });

    revalidateMatchViews(payload.matchId);
    detailSuccess(payload.matchId, "participant_waitlisted");
  } catch (error) {
    const code = errorCode(error);
    if (code === "inactive_player") detailError(payload.matchId, "inactive_player");
    if (code === "already_participant") detailError(payload.matchId, "already_participant");
    if (code === "invalid_state") detailError(payload.matchId, "invalid_state");
    if (code === "unexpected") throw error;
    detailError(payload.matchId, code);
  }
}

export async function confirmParticipant(formData: FormData) {
  const session = await requireAdmin();
  const payload = confirmParticipantSchema.parse({
    matchId: formData.get("matchId"),
    userId: formData.get("userId")
  });

  try {
    await prisma.$transaction(async (tx) => {
      const match = await fetchMatch(tx, payload.matchId);
      const user = await tx.user.findUnique({
        where: { id: payload.userId },
        include: { wallet: true }
      });

      if (!match || !user || user.role !== "PLAYER" || !user.isActive || !user.wallet) {
        throw new BusinessError("inactive_player");
      }

      if (isClosedMatch(match.status)) {
        throw new BusinessError("invalid_state");
      }

      const existing = match.participants.find((participant) => participant.userId === user.id);
      if (existing && existing.status === MatchParticipantStatus.CONFIRMED && existing.paymentStatus === MatchPaymentStatus.PAID) {
        return;
      }

      const confirmedCount = match.participants.filter((participant) => participant.status === MatchParticipantStatus.CONFIRMED).length;
      const alreadyConfirmed = existing?.status === MatchParticipantStatus.CONFIRMED;
      if (!alreadyConfirmed && confirmedCount >= match.capacity) {
        throw new BusinessError("capacity_reached");
      }

      const { balanceAfter } = await debitMatchFee(tx, {
        walletId: user.wallet.id,
        actorId: session.user.id,
        amount: match.participationFee,
        matchId: match.id,
        matchTitle: match.title
      });

      await upsertParticipant(tx, {
        matchId: match.id,
        userId: user.id,
        status: MatchParticipantStatus.CONFIRMED,
        paymentStatus: MatchPaymentStatus.PAID,
        amountCharged: match.participationFee
      });

      await tx.notification.create({
        data: {
          userId: user.id,
          type: NotificationType.MATCH_CONFIRMATION,
          title: "Inscription confirmée",
          message: `Votre participation au match "${match.title}" est confirmée pour ${formatDh(match.participationFee)}.`
        }
      });

      if (balanceAfter.lt(20)) {
        await tx.notification.create({
          data: {
            userId: user.id,
            type: NotificationType.LOW_BALANCE,
            title: "Solde faible",
            message: `Votre nouveau solde est de ${formatDh(balanceAfter)}.`
          }
        });
      }
    });

    revalidateMatchViews(payload.matchId);
    detailSuccess(payload.matchId, "participant_confirmed");
  } catch (error) {
    const code = errorCode(error);
    if (code === "inactive_player") detailError(payload.matchId, "inactive_player");
    if (code === "capacity_reached") detailError(payload.matchId, "capacity_reached");
    if (code === "insufficient_balance") detailError(payload.matchId, "insufficient_balance");
    if (code === "invalid_state") detailError(payload.matchId, "invalid_state");
    if (code === "unexpected") throw error;
    detailError(payload.matchId, code);
  }
}

export async function promoteWaitlistedParticipant(formData: FormData) {
  const session = await requireAdmin();
  const payload = promoteWaitlistedParticipantSchema.parse({
    participantId: formData.get("participantId"),
    matchId: formData.get("matchId")
  });

  try {
    await prisma.$transaction(async (tx) => {
      const participant = await fetchParticipant(tx, payload.participantId);
      if (!participant) {
        throw new BusinessError("not_found");
      }
      if (participant.status !== MatchParticipantStatus.WAITLISTED) {
        throw new BusinessError("not_waitlisted");
      }
      if (!participant.user.isActive || !participant.user.wallet) {
        throw new BusinessError("inactive_player");
      }
      if (isClosedMatch(participant.match.status)) {
        throw new BusinessError("invalid_state");
      }

      const confirmedCount = participant.match.participants.filter((item) => item.status === MatchParticipantStatus.CONFIRMED).length;
      if (confirmedCount >= participant.match.capacity) {
        throw new BusinessError("capacity_reached");
      }

      const { balanceAfter } = await debitMatchFee(tx, {
        walletId: participant.user.wallet.id,
        actorId: session.user.id,
        amount: participant.match.participationFee,
        matchId: participant.match.id,
        matchTitle: participant.match.title
      });

      await tx.matchParticipant.update({
        where: { id: participant.id },
        data: {
          status: MatchParticipantStatus.CONFIRMED,
          paymentStatus: MatchPaymentStatus.PAID,
          amountCharged: participant.match.participationFee,
          cancelledAt: null,
          refundedAt: null
        }
      });

      await tx.notification.create({
        data: {
          userId: participant.userId,
          type: NotificationType.MATCH_CONFIRMATION,
          title: "Place confirmée",
          message: `Votre place sur le match "${participant.match.title}" a été confirmée pour ${formatDh(participant.match.participationFee)}.`
        }
      });

      if (balanceAfter.lt(20)) {
        await tx.notification.create({
          data: {
            userId: participant.userId,
            type: NotificationType.LOW_BALANCE,
            title: "Solde faible",
            message: `Votre nouveau solde est de ${formatDh(balanceAfter)}.`
          }
        });
      }
    });

    revalidateMatchViews(payload.matchId);
    detailSuccess(payload.matchId, "participant_promoted");
  } catch (error) {
    const code = errorCode(error);
    if (code === "not_found") detailError(payload.matchId, "not_found");
    if (code === "not_waitlisted") detailError(payload.matchId, "not_waitlisted");
    if (code === "inactive_player") detailError(payload.matchId, "inactive_player");
    if (code === "capacity_reached") detailError(payload.matchId, "capacity_reached");
    if (code === "insufficient_balance") detailError(payload.matchId, "insufficient_balance");
    if (code === "invalid_state") detailError(payload.matchId, "invalid_state");
    if (code === "unexpected") throw error;
    detailError(payload.matchId, code);
  }
}

export async function cancelParticipation(formData: FormData) {
  const session = await requireAdmin();
  const payload = matchParticipantActionSchema.parse({
    matchId: formData.get("matchId"),
    userId: formData.get("userId")
  });

  try {
    await prisma.$transaction(async (tx) => {
      const participant = await tx.matchParticipant.findUnique({
        where: { matchId_userId: { matchId: payload.matchId, userId: payload.userId } },
        include: {
          match: true,
          user: { include: { wallet: true } }
        }
      });

      if (!participant) {
        throw new BusinessError("not_found");
      }

      if (participant.status === MatchParticipantStatus.CANCELLED) {
        throw new BusinessError("already_cancelled");
      }

      await refundParticipant(tx, { participant, actorId: session.user.id, matchTitle: participant.match.title });

      await tx.matchParticipant.update({
        where: { id: participant.id },
        data: {
          status: MatchParticipantStatus.CANCELLED,
          paymentStatus: participant.paymentStatus === MatchPaymentStatus.PAID ? MatchPaymentStatus.REFUNDED : MatchPaymentStatus.NOT_REQUIRED,
          cancelledAt: new Date(),
          refundedAt: participant.paymentStatus === MatchPaymentStatus.PAID ? new Date() : null
        }
      });

      await tx.notification.create({
        data: {
          userId: participant.userId,
          type: NotificationType.GENERAL,
          title: "Participation annulée",
          message: `Votre participation au match "${participant.match.title}" a été annulée.`
        }
      });
    });

    revalidateMatchViews(payload.matchId);
    detailSuccess(payload.matchId, "participation_cancelled");
  } catch (error) {
    const code = errorCode(error);
    if (code === "not_found") listError("not_found");
    if (code === "already_cancelled") detailError(payload.matchId, "already_cancelled");
    if (code === "unexpected") throw error;
    detailError(payload.matchId, code);
  }
}

export async function markParticipantAttendance(formData: FormData) {
  await requireAdmin();
  const payload = participantAttendanceSchemaInput.parse({
    participantId: formData.get("participantId"),
    matchId: formData.get("matchId"),
    attendanceStatus: formData.get("attendanceStatus")
  });

  try {
    const participant = await prisma.matchParticipant.findUnique({
      where: { id: payload.participantId },
      include: { match: true }
    });

    if (!participant) {
      throw new BusinessError("not_found");
    }

    if (
      participant.status === MatchParticipantStatus.CANCELLED ||
      participant.status === MatchParticipantStatus.INVITED ||
      participant.status === MatchParticipantStatus.WAITLISTED
    ) {
      throw new BusinessError("invalid_state");
    }

    await prisma.matchParticipant.update({
      where: { id: participant.id },
      data: { status: payload.attendanceStatus }
    });

    revalidateMatchViews(payload.matchId);
    detailSuccess(payload.matchId, "attendance_marked");
  } catch (error) {
    const code = errorCode(error);
    if (code === "not_found") listError("not_found");
    if (code === "invalid_state") detailError(payload.matchId, "invalid_state");
    if (code === "unexpected") throw error;
    detailError(payload.matchId, code);
  }
}

export async function cancelParticipant(formData: FormData) {
  return cancelParticipation(formData);
}
