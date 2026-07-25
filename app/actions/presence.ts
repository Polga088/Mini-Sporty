"use server";

import { auth } from "@/auth";
import { canManageSport } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { buildPresenceToken, verifyPresenceToken } from "@/lib/presence";
import { disablePresenceQr, getMatchByQrTokenId, getOrCreatePresenceQr } from "@/lib/presence-service";
import { MatchParticipantStatus, MatchStatus, PresenceSource, Role } from "@prisma/client";
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

function redirectNotice(url: string, code: string, key: "success" | "error" = "success"): never {
  redirect(`${url}?${new URLSearchParams({ [key]: code }).toString()}`);
}

async function requireStaff() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!canManageSport(session.user.role)) redirect("/espace");
  return session;
}

async function requirePlayer() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (session.user.role !== Role.PLAYER) redirect("/espace");
  return session;
}

function tokenShape(token: string) {
  const [tokenId, signature] = token.split(".");
  if (!tokenId || !signature) throw new BusinessError("invalid_token");
  return { tokenId, signature };
}

function parseMatchToken(rawToken: string) {
  const token = z.string().min(20).parse(rawToken);
  return tokenShape(token);
}


export async function regenerateMatchQr(formData: FormData) {
  await requireStaff();
  const matchId = String(formData.get("matchId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? `/admin/matchs/${matchId}`);
  try {
    await getOrCreatePresenceQr(matchId, true);
    revalidatePath(returnTo);
    revalidatePath("/admin/parametres");
    redirectNotice(returnTo, "qr_regenerated");
  } catch (error) {
    if (error instanceof BusinessError && error.code === "not_found") {
      redirectNotice("/admin/parametres", "not_found", "error");
    }
    if (error instanceof Error && error.message === "MATCH_NOT_FOUND") {
      redirectNotice("/admin/parametres", "not_found", "error");
    }
    throw error;
  }
}

export async function disableMatchQr(formData: FormData) {
  await requireStaff();
  const matchId = String(formData.get("matchId") ?? "");
  const returnTo = String(formData.get("returnTo") ?? `/admin/matchs/${matchId}`);
  const existing = await prisma.match.findUnique({ where: { id: matchId } });
  if (!existing) {
    redirectNotice("/admin/parametres", "not_found", "error");
  }
  await disablePresenceQr(matchId);
  revalidatePath(returnTo);
  revalidatePath("/admin/parametres");
  redirectNotice(returnTo, "qr_disabled");
}

export async function confirmPresenceByToken(formData: FormData) {
  const session = await requirePlayer();
  try {
    const { tokenId, signature } = parseMatchToken(String(formData.get("token") ?? ""));
    const token = `${tokenId}.${signature}`;

    const match = await getMatchByQrTokenId(tokenId);
    if (!match) throw new BusinessError("invalid_token");
    if (!verifyPresenceToken(match.id, tokenId, token, match.qrTokenExpiresAt)) throw new BusinessError("invalid_token");
    if (match.qrDisabledAt) throw new BusinessError("disabled_token");
    if (match.status === MatchStatus.CANCELLED) throw new BusinessError("presence_match_cancelled");
    if (match.status === MatchStatus.COMPLETED) throw new BusinessError("match_finished");
    if (match.qrTokenExpiresAt && match.qrTokenExpiresAt.getTime() < Date.now()) throw new BusinessError("token_expired");

    const participant = match.participants.find((item) => item.userId === session.user.id);
    if (!participant) throw new BusinessError("not_participant");
    if (participant.status === MatchParticipantStatus.WAITLISTED || participant.status === MatchParticipantStatus.CANCELLED) {
      throw new BusinessError("not_participant");
    }
    if (participant.status === MatchParticipantStatus.ATTENDED) {
      throw new BusinessError("already_confirmed");
    }

    await prisma.$transaction(async (tx) => {
      await tx.matchParticipant.update({
        where: { id: participant.id },
        data: { status: MatchParticipantStatus.ATTENDED }
      });

      await tx.matchPresenceLog.create({
        data: {
          matchId: match.id,
          userId: session.user.id,
          participantId: participant.id,
          actorId: session.user.id,
          source: PresenceSource.QR
        }
      });
    });

    revalidatePath(`/presence/${token}`);
    revalidatePath(`/admin/matchs/${match.id}`);
    redirectNotice(`/presence/${token}`, "presence_confirmed");
  } catch (error) {
    if (error instanceof BusinessError) {
      redirectNotice(`/presence/${String(formData.get("token") ?? "")}`, error.code, "error");
    }
    if (error instanceof z.ZodError) {
      redirectNotice(`/presence/${String(formData.get("token") ?? "")}`, "invalid_token", "error");
    }
    throw error;
  }
}

export async function markPresenceManually(formData: FormData) {
  const session = await requireStaff();
  const payload = z
    .object({
      matchId: z.string().min(1),
      participantId: z.string().min(1),
      attendanceStatus: z.enum(["ATTENDED", "ABSENT"])
    })
    .parse({
      matchId: formData.get("matchId"),
      participantId: formData.get("participantId"),
      attendanceStatus: formData.get("attendanceStatus")
    });

  const participant = await prisma.matchParticipant.findUnique({
    where: { id: payload.participantId },
    include: { match: true }
  });

  if (!participant || participant.matchId !== payload.matchId) {
    redirectNotice(`/admin/matchs/${payload.matchId}`, "not_found", "error");
  }

  if (
    participant.status === MatchParticipantStatus.CANCELLED ||
    participant.status === MatchParticipantStatus.INVITED ||
    participant.status === MatchParticipantStatus.WAITLISTED
  ) {
    redirectNotice(`/admin/matchs/${payload.matchId}`, "invalid_state", "error");
  }

  if (participant.status === payload.attendanceStatus) {
    revalidatePath(`/admin/matchs/${payload.matchId}`);
    redirectNotice(`/admin/matchs/${payload.matchId}`, "attendance_marked");
  }

  await prisma.$transaction(async (tx) => {
    await tx.matchParticipant.update({
      where: { id: participant.id },
      data: { status: payload.attendanceStatus }
    });

    await tx.matchPresenceLog.create({
      data: {
        matchId: participant.matchId,
        userId: participant.userId,
        participantId: participant.id,
        actorId: session.user.id,
        source: PresenceSource.MANUAL
      }
    });
  });

  revalidatePath(`/admin/matchs/${payload.matchId}`);
  if (participant.match.qrTokenId && participant.match.qrTokenExpiresAt) {
    revalidatePath(`/presence/${buildPresenceToken(participant.match.id, participant.match.qrTokenId, participant.match.qrTokenExpiresAt)}`);
  }
  redirectNotice(`/admin/matchs/${payload.matchId}`, "attendance_marked");
}
