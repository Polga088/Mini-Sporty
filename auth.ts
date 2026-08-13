import NextAuth, { type Session, type User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdmin, isCaptain } from "@/lib/permissions";
import { AccountApprovalStatus, Role } from "@prisma/client";
import {
  isSessionSnapshotValid,
  loadSessionUserSnapshot,
  safeAuthRedirect,
  type SessionUserSnapshot
} from "@/lib/auth-security";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? (process.env.NODE_ENV === "test" ? "test-secret" : undefined);

if (!authSecret) {
  throw new Error("AUTH_SECRET est obligatoire.");
}

export function canAccountSignIn(user: {
  role: Role;
  isActive: boolean;
  approvalStatus: AccountApprovalStatus;
}) {
  if (!user.isActive) return false;
  if (user.role === Role.PLAYER) return user.approvalStatus === AccountApprovalStatus.APPROVED;
  return true;
}

export function applyAuthUserToToken(token: JWT, user: User) {
  token.sub = user.id;
  token.role = user.role;
  token.isActive = user.isActive;
  token.approvalStatus = user.approvalStatus;
  token.mustChangePassword = user.mustChangePassword;
  token.sessionVersion = user.sessionVersion;
  token.passwordChangedAt = user.passwordChangedAt ?? null;
  return token;
}

export function clearAuthToken(token: JWT) {
  token.sub = undefined;
  token.role = undefined;
  token.isActive = undefined;
  token.approvalStatus = undefined;
  token.mustChangePassword = undefined;
  token.sessionVersion = undefined;
  token.passwordChangedAt = undefined;
  return token;
}

export function applySnapshotToToken(token: JWT, snapshot: SessionUserSnapshot) {
  token.role = snapshot.role;
  token.isActive = snapshot.isActive;
  token.approvalStatus = snapshot.approvalStatus;
  token.mustChangePassword = snapshot.mustChangePassword;
  token.sessionVersion = snapshot.sessionVersion;
  token.passwordChangedAt = snapshot.passwordChangedAt?.toISOString() ?? null;
  return token;
}

export function applyTokenToSession(session: Session, token: JWT) {
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  trustHost: process.env.AUTH_TRUST_HOST !== "false",
  useSecureCookies: process.env.NODE_ENV === "production",
  session: { strategy: "jwt" },
  pages: {
    signIn: "/connexion"
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" }
      },
      async authorize(rawCredentials) {
        const credentials = credentialsSchema.parse(rawCredentials);
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !canAccountSignIn(user)) return null;

        const passwordValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!passwordValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          approvalStatus: user.approvalStatus,
          mustChangePassword: user.mustChangePassword,
          sessionVersion: user.sessionVersion,
          passwordChangedAt: user.passwordChangedAt?.toISOString() ?? null
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        applyAuthUserToToken(token, user);
      }

      if (token.sub) {
        const dbUser = await loadSessionUserSnapshot(token.sub);

        if (!dbUser || !isSessionSnapshotValid(token, dbUser)) {
          return clearAuthToken(token);
        }

        applySnapshotToToken(token, dbUser);
      }

      return token;
    },
    async session({ session, token }) {
      return applyTokenToSession(session, token);
    },
    async redirect({ url, baseUrl }) {
      return safeAuthRedirect(url, baseUrl);
    }
  }
});
