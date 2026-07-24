import { PollResponseChoice, PollStatus, Prisma, PrismaClient } from "@prisma/client";
import { pollPromotedNotification } from "@/lib/notifications";

export type PollSyncResult = {
  processedPolls: number;
  closedPolls: number;
  promotedParticipants: number;
  affectedPollIds: string[];
};

export async function promoteWaitlistedResponses(
  tx: Prisma.TransactionClient,
  pollId: string,
  options: { notify?: boolean; now?: Date } = {}
) {
  const now = options.now ?? new Date();
  const poll = await tx.poll.findUnique({
    where: { id: pollId },
    include: {
      responses: {
        orderBy: [{ waitlistOrder: "asc" }, { createdAt: "asc" }]
      }
    }
  });

  if (!poll || poll.manualControl) {
    return {
      promotedParticipants: 0,
      promotedUserIds: [] as string[]
    };
  }

  const activeCount = poll.responses.filter((response) => response.response === PollResponseChoice.PRESENT && !response.isWaitlisted).length;
  const availableSlots = poll.capacity - activeCount;
  if (availableSlots <= 0) {
    return {
      promotedParticipants: 0,
      promotedUserIds: [] as string[]
    };
  }

  const promotedResponses = poll.responses.filter((response) => response.isWaitlisted).slice(0, availableSlots);
  if (promotedResponses.length === 0) {
    return {
      promotedParticipants: 0,
      promotedUserIds: [] as string[]
    };
  }

  for (const response of promotedResponses) {
    await tx.pollResponse.update({
      where: { id: response.id },
      data: {
        isWaitlisted: false,
        waitlistOrder: null,
        response: PollResponseChoice.PRESENT,
        managedById: null,
        managedAt: now
      }
    });
  }

  if (options.notify) {
    await tx.notification.createMany({
      data: promotedResponses.map((response) => ({
        userId: response.userId,
        ...pollPromotedNotification(poll.title)
      }))
    });
  }

  return {
    promotedParticipants: promotedResponses.length,
    promotedUserIds: promotedResponses.map((response) => response.userId)
  };
}

export async function syncPolls(prisma: PrismaClient, now = new Date()): Promise<PollSyncResult> {
  const openPolls = await prisma.poll.findMany({
    where: { status: PollStatus.OPEN },
    select: { id: true }
  });

  const affectedPollIds = new Set<string>();
  let closedPolls = 0;
  let promotedParticipants = 0;

  for (const { id } of openPolls) {
    const outcome = await prisma.$transaction(async (tx) => {
      const poll = await tx.poll.findUnique({
        where: { id },
        include: {
          responses: {
            orderBy: [{ isWaitlisted: "asc" }, { waitlistOrder: "asc" }, { createdAt: "asc" }]
          }
        }
      });

      if (!poll || poll.status !== PollStatus.OPEN) {
        return { closed: false, promoted: 0 };
      }

      const promotion = await promoteWaitlistedResponses(tx, poll.id, {
        notify: true,
        now
      });

      let closed = false;
      if (poll.closesAt && poll.closesAt.getTime() <= now.getTime()) {
        await tx.poll.update({
          where: { id: poll.id },
          data: { status: PollStatus.CLOSED }
        });
        closed = true;
      }

      return {
        closed,
        promoted: promotion.promotedParticipants
      };
    });

    if (outcome.closed) {
      closedPolls += 1;
      affectedPollIds.add(id);
    }

    if (outcome.promoted > 0) {
      promotedParticipants += outcome.promoted;
      affectedPollIds.add(id);
    }
  }

  return {
    processedPolls: openPolls.length,
    closedPolls,
    promotedParticipants,
    affectedPollIds: [...affectedPollIds]
  };
}
