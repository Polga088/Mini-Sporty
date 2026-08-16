import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  applyAuthUserToToken,
  applySnapshotToToken,
  applyTokenToSession,
  canAccountSignIn,
  clearAuthToken
} from "@/lib/auth-session";
import {
  isSessionSnapshotValid,
  loadSessionUserSnapshot,
  safeAuthRedirect
} from "@/lib/auth-security";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

const authSecret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? (process.env.NODE_ENV === "test" ? "test-secret" : undefined);

if (!authSecret) {
  throw new Error("AUTH_SECRET est obligatoire.");
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
