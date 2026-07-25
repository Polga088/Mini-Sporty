import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isAdmin, isCaptain } from "@/lib/permissions";
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

        if (!user || !user.isActive) return null;

        const passwordValid = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!passwordValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
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
        token.sub = user.id;
        token.role = user.role;
        token.isActive = user.isActive;
        token.mustChangePassword = user.mustChangePassword;
        token.sessionVersion = user.sessionVersion;
        token.passwordChangedAt = user.passwordChangedAt ?? null;
      }

      if (token.sub) {
        const dbUser = await loadSessionUserSnapshot(token.sub);

        if (!dbUser || !isSessionSnapshotValid(token, dbUser)) {
          token.sub = undefined;
          token.role = undefined;
          token.isActive = undefined;
          token.mustChangePassword = undefined;
          token.sessionVersion = undefined;
          token.passwordChangedAt = undefined;
          return token;
        }

        token.role = dbUser.role;
        token.isActive = dbUser.isActive;
        token.mustChangePassword = dbUser.mustChangePassword;
        token.sessionVersion = dbUser.sessionVersion;
        token.passwordChangedAt = dbUser.passwordChangedAt?.toISOString() ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role;
        session.user.isAdmin = isAdmin(token.role);
        session.user.isCaptain = isCaptain(token.role);
        session.user.isActive = token.isActive ?? false;
        session.user.mustChangePassword = token.mustChangePassword ?? false;
        session.user.sessionVersion = token.sessionVersion ?? 0;
        session.user.passwordChangedAt = token.passwordChangedAt ?? null;
      }

      return session;
    },
    async redirect({ url, baseUrl }) {
      return safeAuthRedirect(url, baseUrl);
    }
  }
});
