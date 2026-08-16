import { AccountApprovalStatus, Role } from "@prisma/client";
import { isAdmin, isCaptain } from "@/lib/permissions";
import type { SessionUserSnapshot } from "@/lib/auth-security";

export type AuthUserPayload = {
  id?: string;
  role?: Role | null;
  isActive?: boolean | null;
  approvalStatus?: AccountApprovalStatus | null;
  mustChangePassword?: boolean | null;
  sessionVersion?: number | null;
  passwordChangedAt?: string | null;
};

export type AuthTokenPayload = {
  sub?: string;
  role?: Role | null;
  isActive?: boolean;
  approvalStatus?: AccountApprovalStatus | null;
  mustChangePassword?: boolean;
  sessionVersion?: number;
  passwordChangedAt?: string | null;
};

export type AuthSessionPayload = {
  user?: {
    id?: string;
    role?: Role | null;
    isAdmin?: boolean;
    isCaptain?: boolean;
    isActive?: boolean;
    approvalStatus?: AccountApprovalStatus | null;
    mustChangePassword?: boolean;
    sessionVersion?: number;
    passwordChangedAt?: string | null;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires?: string;
};

export function canAccountSignIn(user: {
  role: Role;
  isActive: boolean;
  approvalStatus: AccountApprovalStatus;
}) {
  if (!user.isActive) return false;
  if (user.role === Role.PLAYER) return user.approvalStatus === AccountApprovalStatus.APPROVED;
  return true;
}

export function applyAuthUserToToken<TToken extends AuthTokenPayload>(token: TToken, user: AuthUserPayload) {
  token.sub = user.id;
  token.role = user.role;
  token.isActive = user.isActive ?? undefined;
  token.approvalStatus = user.approvalStatus;
  token.mustChangePassword = user.mustChangePassword ?? undefined;
  token.sessionVersion = user.sessionVersion ?? undefined;
  token.passwordChangedAt = user.passwordChangedAt ?? null;
  return token;
}

export function clearAuthToken<TToken extends AuthTokenPayload>(token: TToken) {
  token.sub = undefined;
  token.role = undefined;
  token.isActive = undefined;
  token.approvalStatus = undefined;
  token.mustChangePassword = undefined;
  token.sessionVersion = undefined;
  token.passwordChangedAt = undefined;
  return token;
}

export function applySnapshotToToken<TToken extends AuthTokenPayload>(token: TToken, snapshot: SessionUserSnapshot) {
  token.role = snapshot.role;
  token.isActive = snapshot.isActive;
  token.approvalStatus = snapshot.approvalStatus;
  token.mustChangePassword = snapshot.mustChangePassword;
  token.sessionVersion = snapshot.sessionVersion;
  token.passwordChangedAt = snapshot.passwordChangedAt?.toISOString() ?? null;
  return token;
}

export function applyTokenToSession<TSession extends AuthSessionPayload>(session: TSession, token: AuthTokenPayload) {
  if (session.user) {
    session.user.id = token.sub ?? "";
    session.user.role = token.role;
    session.user.isAdmin = isAdmin(token.role);
    session.user.isCaptain = isCaptain(token.role);
    session.user.isActive = token.isActive ?? false;
    session.user.approvalStatus = token.approvalStatus ?? undefined;
    session.user.mustChangePassword = token.mustChangePassword ?? false;
    session.user.sessionVersion = token.sessionVersion ?? 0;
    session.user.passwordChangedAt = token.passwordChangedAt ?? null;
  }

  return session;
}
