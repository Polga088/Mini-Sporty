import type { Match } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { buildPresenceToken, buildPresenceUrl, createPresenceToken } from "@/lib/presence";

function presenceExpiry(matchDate: Date) {
  return new Date(matchDate.getTime() + 12 * 60 * 60 * 1000);
}

export type PresenceQrState = {
  match: Match;
  token: string | null;
  url: string | null;
  isActive: boolean;
};

export async function getOrCreatePresenceQr(matchId: string, force = false): Promise<PresenceQrState> {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    throw new Error("MATCH_NOT_FOUND");
  }

  if (
    !force &&
    match.qrTokenId &&
    match.qrTokenHash &&
    match.qrTokenExpiresAt &&
    !match.qrDisabledAt &&
    match.qrTokenExpiresAt.getTime() > Date.now()
  ) {
    const token = buildPresenceToken(match.id, match.qrTokenId, match.qrTokenExpiresAt);
    return {
      match,
      token,
      url: buildPresenceUrl(process.env.AUTH_URL ?? "http://localhost:3000", token),
      isActive: true
    };
  }

  if (!force && match.qrDisabledAt) {
    return {
      match,
      token: null,
      url: null,
      isActive: false
    };
  }

  const expiresAt = presenceExpiry(match.matchDate);
  const token = createPresenceToken(match.id, expiresAt);

  await prisma.match.update({
    where: { id: match.id },
    data: {
      qrTokenId: token.tokenId,
      qrTokenHash: token.tokenHash,
      qrTokenExpiresAt: expiresAt,
      qrDisabledAt: null,
      qrGeneratedAt: new Date()
    }
  });

  return {
    match,
    token: token.token,
    url: buildPresenceUrl(process.env.AUTH_URL ?? "http://localhost:3000", token.token),
    isActive: true
  };
}

export async function disablePresenceQr(matchId: string) {
  return prisma.match.update({
    where: { id: matchId },
    data: {
      qrDisabledAt: new Date(),
      qrTokenExpiresAt: new Date(),
      qrTokenHash: null
    }
  });
}

export async function getMatchByQrTokenId(tokenId: string) {
  return prisma.match.findFirst({
    where: { qrTokenId: tokenId },
    include: {
      participants: {
        include: {
          user: {
            include: {
              wallet: true
            }
          }
        }
      },
      presenceLogs: {
        orderBy: { createdAt: "desc" },
        include: {
          actor: { select: { name: true } },
          user: { select: { name: true } },
          participant: { select: { id: true } }
        }
      }
    }
  });
}
