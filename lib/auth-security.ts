import { createHash } from "node:crypto";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SessionUserSnapshot = {
  role: Role;
  isActive: boolean;
  mustChangePassword: boolean;
  sessionVersion: number;
  passwordChangedAt: Date | null;
};

export function safeAuthRedirect(url: string, baseUrl: string) {
  if (url.startsWith("/")) {
    return `${baseUrl}${url}`;
  }

  try {
    const target = new URL(url);
    const base = new URL(baseUrl);

    if (target.origin === base.origin) {
      return url;
    }
  } catch {
    // Fall through to baseUrl.
  }

  return baseUrl;
}

export async function loadSessionUserSnapshot(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      isActive: true,
      mustChangePassword: true,
      sessionVersion: true,
      passwordChangedAt: true
    }
  });
}

export function isSessionSnapshotValid(
  token: {
    role?: Role | null;
    isActive?: boolean;
    mustChangePassword?: boolean;
    sessionVersion?: number;
    passwordChangedAt?: string | null;
  },
  snapshot: SessionUserSnapshot
) {
  return (
    snapshot.isActive &&
    token.role === snapshot.role &&
    token.isActive === snapshot.isActive &&
    token.mustChangePassword === snapshot.mustChangePassword &&
    token.sessionVersion === snapshot.sessionVersion &&
    token.passwordChangedAt === (snapshot.passwordChangedAt?.toISOString() ?? null)
  );
}

export function hashString(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
