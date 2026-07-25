import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { NotificationType, PollResponseChoice, PollStatus, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { decimal } from "../lib/money";
import { syncPolls } from "../lib/poll-sync";

let adminId = "";
const cleanupEmails: string[] = [];
const cleanupPollIds: string[] = [];
const TEST_PREFIX = "sync-poll-suite";

beforeAll(async () => {
  const admin = await prisma.user.findUnique({
    where: { email: "admin@fridaymatch.local" },
    select: { id: true, role: true }
  });

  if (!admin || admin.role !== Role.ADMIN) {
    throw new Error("Admin seed manquant pour les tests de synchronisation.");
  }

  adminId = admin.id;
});

async function cleanupFixtures() {
  if (cleanupPollIds.length > 0) {
    await prisma.poll.deleteMany({
      where: {
        id: { in: cleanupPollIds.splice(0, cleanupPollIds.length) }
      }
    });
  }

  if (cleanupEmails.length > 0) {
    await prisma.user.deleteMany({
      where: {
        email: { in: cleanupEmails.splice(0, cleanupEmails.length) }
      }
    });
  }

  await prisma.pollResponse.deleteMany({
    where: {
      poll: {
        title: { startsWith: `${TEST_PREFIX}-` }
      }
    }
  });

  await prisma.notification.deleteMany({
    where: {
      user: {
        email: { startsWith: `${TEST_PREFIX}-` }
      }
    }
  });

  await prisma.poll.deleteMany({
    where: {
      title: { startsWith: `${TEST_PREFIX}-` }
    }
  });
}

beforeEach(async () => {
  await cleanupFixtures();
});

afterEach(async () => {
  await cleanupFixtures();
});

async function createTempPlayer(label: string) {
  const email = `${TEST_PREFIX}-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
  cleanupEmails.push(email);

  return prisma.user.create({
    data: {
      name: label,
      email,
      passwordHash: "hash",
      role: Role.PLAYER
    }
  });
}

async function createExpiredPoll() {
  const poll = await prisma.poll.create({
    data: {
      title: `${TEST_PREFIX}-poll-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      description: null,
      matchTitle: `${TEST_PREFIX}-match`,
      matchDate: new Date("2026-08-01T20:00:00.000Z"),
      startTime: "20:00",
      endTime: "21:30",
      location: `${TEST_PREFIX}-terrain`,
      capacity: 2,
      matchAmount: decimal(10),
      allowResponseChanges: true,
      manualControl: false,
      opensAt: new Date("2026-07-01T18:00:00.000Z"),
      closesAt: new Date("2026-07-02T18:00:00.000Z"),
      status: PollStatus.OPEN,
      createdById: adminId
    }
  });

  cleanupPollIds.push(poll.id);
  return poll;
}

describe("syncPolls", () => {
  it("ferme les sondages expirés, promeut la liste d'attente et reste idempotent", async () => {
    const poll = await createExpiredPoll();
    const presentPlayer = await createTempPlayer("sync-present");
    const waitlistedPlayer = await createTempPlayer("sync-waitlisted");

    await prisma.pollResponse.createMany({
      data: [
        {
          pollId: poll.id,
          userId: presentPlayer.id,
          response: PollResponseChoice.PRESENT,
          isWaitlisted: false,
          waitlistOrder: null
        },
        {
          pollId: poll.id,
          userId: waitlistedPlayer.id,
          response: PollResponseChoice.PRESENT,
          isWaitlisted: true,
          waitlistOrder: 1
        }
      ]
    });

    const firstRun = await syncPolls(prisma, new Date("2026-08-10T12:00:00.000Z"));
    expect(firstRun.processedPolls).toBe(1);
    expect(firstRun.closedPolls).toBe(1);
    expect(firstRun.promotedParticipants).toBe(1);

    const updatedPoll = await prisma.poll.findUnique({
      where: { id: poll.id },
      include: { responses: true }
    });

    expect(updatedPoll?.status).toBe(PollStatus.CLOSED);
    expect(updatedPoll?.responses).toHaveLength(2);
    expect(updatedPoll?.responses.find((response) => response.userId === waitlistedPlayer.id)?.isWaitlisted).toBe(false);
    expect(updatedPoll?.responses.find((response) => response.userId === waitlistedPlayer.id)?.response).toBe(PollResponseChoice.PRESENT);

    const promotedNotification = await prisma.notification.findMany({
      where: {
        userId: waitlistedPlayer.id,
        type: NotificationType.POLL_PROMOTED
      }
    });
    expect(promotedNotification).toHaveLength(1);

    const secondRun = await syncPolls(prisma, new Date("2026-08-10T12:00:00.000Z"));
    expect(secondRun.processedPolls).toBe(0);
    expect(secondRun.closedPolls).toBe(0);
    expect(secondRun.promotedParticipants).toBe(0);

    const promotedNotificationAfterSecondRun = await prisma.notification.findMany({
      where: {
        userId: waitlistedPlayer.id,
        type: NotificationType.POLL_PROMOTED
      }
    });
    expect(promotedNotificationAfterSecondRun).toHaveLength(1);
  });
});
