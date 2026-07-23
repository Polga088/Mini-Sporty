"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decimal } from "@/lib/money";
import {
  createPollSchema,
  pollCapacitySchema,
  pollManageParticipantSchema,
  pollMoveParticipantSchema,
  pollRespondSchema,
  updatePollSchema
} from "@/lib/validators";
import {
  MatchPaymentStatus,
  MatchParticipantStatus,
  MatchStatus,
  PollResponseChoice,
  PollStatus,
  Prisma,
  Role
} from "@prisma/client";
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

async function requirePlayer() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (session.user.isAdmin) redirect("/admin");
  return session;
}

function normalizeOptionalText(value: string | null | undefined) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function parseDateInput(value: string) {
  return new Date(`${value}T12:00:00.000Z`);
}

function parseDateTimeInput(value: string) {
  return new Date(value);
}

function isValidDate(date: Date) {
  return !Number.isNaN(date.getTime());
}

function parseRequiredDateInput(value: string) {
  const date = parseDateInput(value);
  if (!isValidDate(date)) throw new BusinessError("invalid_date");
  return date;
}

function parseOptionalDateInput(value: string | null | undefined) {
  const text = normalizeOptionalText(value);
  if (!text) return null;
  const date = parseDateTimeInput(text);
  if (!isValidDate(date)) throw new BusinessError("invalid_date");
  return date;
}

function noticeUrl(path: string, key: string, notice: string) {
  return `${path}?${new URLSearchParams({ [key]: notice }).toString()}`;
}

function redirectNotice(path: string, notice: string, key: "success" | "error" = "success") {
  redirect(noticeUrl(path, key, notice));
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

function revalidatePollViews(pollId: string) {
  revalidatePath("/admin/sondages");
  revalidatePath(`/admin/sondages/${pollId}`);
  revalidatePath("/admin/sondages/nouveau");
  revalidatePath("/espace/sondages");
}

async function fetchPoll(tx: Prisma.TransactionClient, pollId: string) {
  return tx.poll.findUnique({
    where: { id: pollId },
    include: {
      createdBy: true,
      match: true,
      responses: {
        orderBy: [{ isWaitlisted: "asc" }, { waitlistOrder: "asc" }, { createdAt: "asc" }],
        include: {
          user: { include: { wallet: true } },
          managedBy: true
        }
      }
    }
  });
}

async function promoteWaitlisted(tx: Prisma.TransactionClient, pollId: string) {
  const poll = await tx.poll.findUnique({
    where: { id: pollId },
    include: {
      responses: {
        orderBy: [{ waitlistOrder: "asc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!poll || poll.manualControl) return;

  const activeCount = poll.responses.filter((response) => response.response === PollResponseChoice.PRESENT && !response.isWaitlisted).length;
  let availableSlots = poll.capacity - activeCount;

  if (availableSlots <= 0) return;

  const waitlisted = poll.responses.filter((response) => response.isWaitlisted);
  for (const response of waitlisted) {
    if (availableSlots <= 0) break;
    await tx.pollResponse.update({
      where: { id: response.id },
      data: {
        isWaitlisted: false,
        waitlistOrder: null,
        response: PollResponseChoice.PRESENT,
        managedAt: new Date()
      }
    });
    availableSlots -= 1;
  }
}

export async function createPoll(formData: FormData) {
  const session = await requireAdmin();
  try {
    const payload = createPollSchema.parse({
      title: formData.get("title"),
      description: formData.get("description"),
      matchTitle: formData.get("matchTitle"),
      matchDate: formData.get("matchDate"),
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      location: formData.get("location"),
      capacity: formData.get("capacity"),
      matchAmount: formData.get("matchAmount"),
      allowResponseChanges: formData.get("allowResponseChanges"),
      manualControl: formData.get("manualControl"),
      opensAt: formData.get("opensAt"),
      closesAt: formData.get("closesAt"),
      status: formData.get("status")
    });

    const poll = await prisma.poll.create({
      data: {
        title: payload.title,
        description: normalizeOptionalText(payload.description),
        matchTitle: payload.matchTitle,
        matchDate: parseRequiredDateInput(payload.matchDate),
        startTime: payload.startTime,
        endTime: payload.endTime,
        location: payload.location,
        capacity: payload.capacity,
        matchAmount: decimal(payload.matchAmount ?? 10),
        allowResponseChanges: payload.allowResponseChanges,
        manualControl: payload.manualControl,
        opensAt: parseOptionalDateInput(payload.opensAt),
        closesAt: parseOptionalDateInput(payload.closesAt),
        status: payload.status,
        createdById: session.user.id
      }
    });

    revalidatePollViews(poll.id);
    redirectNotice(`/admin/sondages/${poll.id}`, "poll_created");
  } catch (error) {
    const code = errorCode(error);
    if (code === "validation") redirectNotice("/admin/sondages/nouveau", "validation", "error");
    if (code === "invalid_date") redirectNotice("/admin/sondages/nouveau", "invalid_date", "error");
    if (code === "unexpected") throw error;
    redirectNotice("/admin/sondages/nouveau", code, "error");
  }
}

export async function updatePoll(formData: FormData) {
  await requireAdmin();
  try {
    const payload = updatePollSchema.parse({
      pollId: formData.get("pollId"),
      title: formData.get("title"),
      description: formData.get("description"),
      matchTitle: formData.get("matchTitle"),
      matchDate: formData.get("matchDate"),
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      location: formData.get("location"),
      capacity: formData.get("capacity"),
      matchAmount: formData.get("matchAmount"),
      allowResponseChanges: formData.get("allowResponseChanges"),
      manualControl: formData.get("manualControl"),
      opensAt: formData.get("opensAt"),
      closesAt: formData.get("closesAt"),
      status: formData.get("status")
    });

    const poll = await prisma.poll.update({
      where: { id: payload.pollId },
      data: {
        title: payload.title,
        description: normalizeOptionalText(payload.description),
        matchTitle: payload.matchTitle,
        matchDate: parseRequiredDateInput(payload.matchDate),
        startTime: payload.startTime,
        endTime: payload.endTime,
        location: payload.location,
        capacity: payload.capacity,
        matchAmount: decimal(payload.matchAmount ?? 10),
        allowResponseChanges: payload.allowResponseChanges,
        manualControl: payload.manualControl,
        opensAt: parseOptionalDateInput(payload.opensAt),
        closesAt: parseOptionalDateInput(payload.closesAt),
        status: payload.status
      }
    });

    revalidatePollViews(poll.id);
    redirectNotice(`/admin/sondages/${poll.id}`, "poll_updated");
  } catch (error) {
    const code = errorCode(error);
    if (code === "validation") redirectNotice("/admin/sondages", "validation", "error");
    if (code === "invalid_date") redirectNotice("/admin/sondages", "invalid_date", "error");
    if (code === "unexpected") throw error;
    redirectNotice("/admin/sondages", code, "error");
  }
}

async function setPollStatus(pollId: string, status: PollStatus) {
  return prisma.poll.update({
    where: { id: pollId },
    data: { status }
  });
}

export async function openPoll(formData: FormData) {
  await requireAdmin();
  const pollId = String(formData.get("pollId") ?? "");
  const poll = await setPollStatus(pollId, PollStatus.OPEN);
  revalidatePollViews(poll.id);
  redirectNotice(`/admin/sondages/${poll.id}`, "poll_opened");
}

export async function pausePoll(formData: FormData) {
  await requireAdmin();
  const pollId = String(formData.get("pollId") ?? "");
  const poll = await setPollStatus(pollId, PollStatus.PAUSED);
  revalidatePollViews(poll.id);
  redirectNotice(`/admin/sondages/${poll.id}`, "poll_paused");
}

export async function closePoll(formData: FormData) {
  await requireAdmin();
  const pollId = String(formData.get("pollId") ?? "");
  const poll = await setPollStatus(pollId, PollStatus.CLOSED);
  revalidatePollViews(poll.id);
  redirectNotice(`/admin/sondages/${poll.id}`, "poll_closed");
}

export async function reopenPoll(formData: FormData) {
  await requireAdmin();
  const pollId = String(formData.get("pollId") ?? "");
  const poll = await setPollStatus(pollId, PollStatus.OPEN);
  revalidatePollViews(poll.id);
  redirectNotice(`/admin/sondages/${poll.id}`, "poll_reopened");
}

export async function cancelPoll(formData: FormData) {
  await requireAdmin();
  const pollId = String(formData.get("pollId") ?? "");
  const poll = await setPollStatus(pollId, PollStatus.CANCELLED);
  revalidatePollViews(poll.id);
  redirectNotice(`/admin/sondages/${poll.id}`, "poll_cancelled");
}

export async function updatePollCapacity(formData: FormData) {
  await requireAdmin();
  try {
    const payload = pollCapacitySchema.parse({
      pollId: formData.get("pollId"),
      capacity: formData.get("capacity")
    });

    const poll = await prisma.$transaction(async (tx) => {
      const existing = await fetchPoll(tx, payload.pollId);
      if (!existing) throw new BusinessError("not_found");

      const presentCount = existing.responses.filter((response) => response.response === PollResponseChoice.PRESENT && !response.isWaitlisted).length;
      if (payload.capacity < presentCount) {
        throw new BusinessError("capacity_too_small");
      }

      const updated = await tx.poll.update({
        where: { id: existing.id },
        data: { capacity: payload.capacity }
      });

      await promoteWaitlisted(tx, existing.id);
      return updated;
    });

    revalidatePollViews(poll.id);
    redirectNotice(`/admin/sondages/${poll.id}`, "poll_capacity_updated");
  } catch (error) {
    const code = errorCode(error);
    if (code === "validation") redirectNotice("/admin/sondages", "validation", "error");
    if (code === "capacity_too_small") redirectNotice("/admin/sondages", "capacity_too_small", "error");
    if (code === "unexpected") throw error;
    redirectNotice("/admin/sondages", code, "error");
  }
}

export async function addPollParticipant(formData: FormData) {
  const session = await requireAdmin();
  try {
    const payload = pollManageParticipantSchema.parse({
      pollId: formData.get("pollId"),
      userId: formData.get("userId")
    });

    await prisma.$transaction(async (tx) => {
      const poll = await fetchPoll(tx, payload.pollId);
      const user = await tx.user.findUnique({
        where: { id: payload.userId },
        include: { wallet: true }
      });

      if (!poll || !user || user.role !== Role.PLAYER) throw new BusinessError("not_found");
      if (!user.isActive) throw new BusinessError("inactive_player");

      const presentCount = poll.responses.filter((response) => response.response === PollResponseChoice.PRESENT && !response.isWaitlisted).length;
      const isWaitlisted = poll.manualControl ? false : presentCount >= poll.capacity;
      const waitlistOrder = isWaitlisted ? (poll.responses.filter((response) => response.isWaitlisted).length + 1) : null;

      await tx.pollResponse.upsert({
        where: { pollId_userId: { pollId: poll.id, userId: user.id } },
        create: {
          pollId: poll.id,
          userId: user.id,
          response: PollResponseChoice.PRESENT,
          isWaitlisted,
          waitlistOrder,
          managedById: session.user.id,
          managedAt: new Date()
        },
        update: {
          response: PollResponseChoice.PRESENT,
          isWaitlisted,
          waitlistOrder,
          managedById: session.user.id,
          managedAt: new Date()
        }
      });
    });

    revalidatePollViews(payload.pollId);
    redirectNotice(`/admin/sondages/${payload.pollId}`, "poll_updated");
  } catch (error) {
    const code = errorCode(error);
    if (code === "validation") redirectNotice("/admin/sondages", "validation", "error");
    if (code === "inactive_player") redirectNotice("/admin/sondages", "inactive_player", "error");
    if (code === "unexpected") throw error;
    redirectNotice("/admin/sondages", code, "error");
  }
}

export async function removePollParticipant(formData: FormData) {
  await requireAdmin();
  try {
    const payload = pollManageParticipantSchema.parse({
      pollId: formData.get("pollId"),
      userId: formData.get("userId")
    });

    await prisma.$transaction(async (tx) => {
      const poll = await fetchPoll(tx, payload.pollId);
      if (!poll) throw new BusinessError("not_found");

      await tx.pollResponse.deleteMany({
        where: {
          pollId: poll.id,
          userId: payload.userId
        }
      });

      await promoteWaitlisted(tx, poll.id);
    });

    revalidatePollViews(payload.pollId);
    redirectNotice(`/admin/sondages/${payload.pollId}`, "poll_updated");
  } catch (error) {
    const code = errorCode(error);
    if (code === "validation") redirectNotice("/admin/sondages", "validation", "error");
    if (code === "unexpected") throw error;
    redirectNotice("/admin/sondages", code, "error");
  }
}

export async function promotePollParticipant(formData: FormData) {
  await requireAdmin();
  try {
    const payload = pollManageParticipantSchema.parse({
      pollId: formData.get("pollId"),
      userId: formData.get("userId")
    });

    await prisma.$transaction(async (tx) => {
      const poll = await fetchPoll(tx, payload.pollId);
      if (!poll) throw new BusinessError("not_found");

      const response = await tx.pollResponse.findUnique({
        where: { pollId_userId: { pollId: payload.pollId, userId: payload.userId } }
      });
      if (!response || !response.isWaitlisted) throw new BusinessError("not_waitlisted");

      const presentCount = poll.responses.filter((item) => item.response === PollResponseChoice.PRESENT && !item.isWaitlisted).length;
      if (presentCount >= poll.capacity) throw new BusinessError("capacity_reached");

      await tx.pollResponse.update({
        where: { pollId_userId: { pollId: payload.pollId, userId: payload.userId } },
        data: {
          isWaitlisted: false,
          waitlistOrder: null,
          managedById: null,
          managedAt: new Date()
        }
      });
    });

    revalidatePollViews(payload.pollId);
    redirectNotice(`/admin/sondages/${payload.pollId}`, "poll_updated");
  } catch (error) {
    const code = errorCode(error);
    if (code === "validation") redirectNotice("/admin/sondages", "validation", "error");
    if (code === "not_waitlisted") redirectNotice("/admin/sondages", "not_waitlisted", "error");
    if (code === "capacity_reached") redirectNotice("/admin/sondages", "capacity_reached", "error");
    if (code === "unexpected") throw error;
    redirectNotice("/admin/sondages", code, "error");
  }
}

export async function movePollParticipant(formData: FormData) {
  const session = await requireAdmin();
  try {
    const payload = pollMoveParticipantSchema.parse({
      pollId: formData.get("pollId"),
      userId: formData.get("userId"),
      target: formData.get("target")
    });

    await prisma.$transaction(async (tx) => {
      const poll = await fetchPoll(tx, payload.pollId);
      const user = await tx.user.findUnique({
        where: { id: payload.userId }
      });

      if (!poll || !user || user.role !== Role.PLAYER) throw new BusinessError("not_found");
      if (!user.isActive) throw new BusinessError("inactive_player");

      const presentCount = poll.responses.filter((response) => response.response === PollResponseChoice.PRESENT && !response.isWaitlisted).length;

      if (payload.target === "ABSENT") {
        await tx.pollResponse.upsert({
          where: { pollId_userId: { pollId: poll.id, userId: user.id } },
          create: {
            pollId: poll.id,
            userId: user.id,
            response: PollResponseChoice.ABSENT,
            isWaitlisted: false,
            managedById: session.user.id,
            managedAt: new Date()
          },
          update: {
            response: PollResponseChoice.ABSENT,
            isWaitlisted: false,
            waitlistOrder: null,
            managedById: session.user.id,
            managedAt: new Date()
          }
        });
      } else if (payload.target === "WAITLISTED") {
        const waitlistOrder = poll.responses.filter((response) => response.isWaitlisted && response.userId !== user.id).length + 1;
        await tx.pollResponse.upsert({
          where: { pollId_userId: { pollId: poll.id, userId: user.id } },
          create: {
            pollId: poll.id,
            userId: user.id,
            response: PollResponseChoice.PRESENT,
            isWaitlisted: true,
            waitlistOrder,
            managedById: session.user.id,
            managedAt: new Date()
          },
          update: {
            response: PollResponseChoice.PRESENT,
            isWaitlisted: true,
            waitlistOrder,
            managedById: session.user.id,
            managedAt: new Date()
          }
        });
      } else {
        if (presentCount >= poll.capacity && !poll.responses.some((response) => response.userId === user.id && response.response === PollResponseChoice.PRESENT && !response.isWaitlisted)) {
          throw new BusinessError("capacity_reached");
        }

        await tx.pollResponse.upsert({
          where: { pollId_userId: { pollId: poll.id, userId: user.id } },
          create: {
            pollId: poll.id,
            userId: user.id,
            response: PollResponseChoice.PRESENT,
            isWaitlisted: false,
            waitlistOrder: null,
            managedById: session.user.id,
            managedAt: new Date()
          },
          update: {
            response: PollResponseChoice.PRESENT,
            isWaitlisted: false,
            waitlistOrder: null,
            managedById: session.user.id,
            managedAt: new Date()
          }
        });
      }

      await promoteWaitlisted(tx, poll.id);
    });

    revalidatePollViews(payload.pollId);
    redirectNotice(`/admin/sondages/${payload.pollId}`, "poll_updated");
  } catch (error) {
    const code = errorCode(error);
    if (code === "validation") redirectNotice("/admin/sondages", "validation", "error");
    if (code === "inactive_player") redirectNotice("/admin/sondages", "inactive_player", "error");
    if (code === "capacity_reached") redirectNotice("/admin/sondages", "capacity_reached", "error");
    if (code === "unexpected") throw error;
    redirectNotice("/admin/sondages", code, "error");
  }
}

export async function respondToPoll(formData: FormData) {
  const session = await requirePlayer();
  try {
    const payload = pollRespondSchema.parse({
      pollId: formData.get("pollId"),
      response: formData.get("response")
    });

    await prisma.$transaction(async (tx) => {
      const poll = await fetchPoll(tx, payload.pollId);
      const user = await tx.user.findUnique({
        where: { id: session.user.id },
        include: { wallet: true }
      });

      if (!poll || !user || user.role !== Role.PLAYER) throw new BusinessError("not_found");
      if (!user.isActive) throw new BusinessError("inactive_player");
      if (poll.status !== PollStatus.OPEN) throw new BusinessError("not_open");

      const existing = await tx.pollResponse.findUnique({
        where: { pollId_userId: { pollId: poll.id, userId: user.id } }
      });
      if (existing && !poll.allowResponseChanges) {
        throw new BusinessError("response_locked");
      }

      const presentCount = poll.responses.filter((response) => response.response === PollResponseChoice.PRESENT && !response.isWaitlisted).length;
      const shouldWaitlist = payload.response === PollResponseChoice.PRESENT && !poll.manualControl && presentCount >= poll.capacity && (!existing || !existing.isWaitlisted);
      const waitlistOrder = shouldWaitlist
        ? (poll.responses.filter((response) => response.isWaitlisted && response.userId !== user.id).length + 1)
        : null;

      await tx.pollResponse.upsert({
        where: { pollId_userId: { pollId: poll.id, userId: user.id } },
        create: {
          pollId: poll.id,
          userId: user.id,
          response: payload.response,
          isWaitlisted: shouldWaitlist,
          waitlistOrder
        },
        update: {
          response: payload.response,
          isWaitlisted: shouldWaitlist,
          waitlistOrder,
          managedById: null,
          managedAt: null,
          respondedAt: new Date()
        }
      });

      if (!poll.manualControl) {
        await promoteWaitlisted(tx, poll.id);
      }
    });

    revalidatePollViews(payload.pollId);
    redirectNotice("/espace/sondages", "poll_response_saved");
  } catch (error) {
    const code = errorCode(error);
    if (code === "validation") redirectNotice("/espace/sondages", "validation", "error");
    if (code === "inactive_player") redirectNotice("/espace/sondages", "inactive_player", "error");
    if (code === "not_open") redirectNotice("/espace/sondages", "not_open", "error");
    if (code === "response_locked") redirectNotice("/espace/sondages", "response_locked", "error");
    if (code === "unexpected") throw error;
    redirectNotice("/espace/sondages", code, "error");
  }
}

export async function createMatchFromPoll(formData: FormData) {
  const session = await requireAdmin();
  const pollId = String(formData.get("pollId") ?? "");

  try {
    await prisma.$transaction(async (tx) => {
      const poll = await fetchPoll(tx, pollId);
      if (!poll) throw new BusinessError("not_found");
      if (poll.matchId) throw new BusinessError("match_exists");

      const match = await tx.match.create({
        data: {
          title: poll.matchTitle,
          matchDate: poll.matchDate,
          startTime: poll.startTime,
          endTime: poll.endTime,
          location: poll.location,
          capacity: poll.capacity,
          participationFee: poll.matchAmount,
          status: MatchStatus.OPEN,
          createdById: session.user.id
        }
      });

      const presentResponses = poll.responses.filter((response) => response.response === PollResponseChoice.PRESENT && !response.isWaitlisted);
      for (const response of presentResponses) {
        await tx.matchParticipant.create({
          data: {
            matchId: match.id,
            userId: response.userId,
            status: MatchParticipantStatus.INVITED,
            paymentStatus: MatchPaymentStatus.NOT_REQUIRED,
            amountCharged: decimal(0)
          }
        });
      }

      await tx.poll.update({
        where: { id: poll.id },
        data: {
          matchId: match.id,
          status: PollStatus.CLOSED
        }
      });
    });

    revalidatePollViews(pollId);
    redirectNotice(`/admin/sondages/${pollId}`, "poll_match_created");
  } catch (error) {
    const code = errorCode(error);
    if (code === "not_found") redirectNotice("/admin/sondages", "not_found", "error");
    if (code === "match_exists") redirectNotice("/admin/sondages", "match_exists", "error");
    if (code === "unexpected") throw error;
    redirectNotice("/admin/sondages", code, "error");
  }
}
