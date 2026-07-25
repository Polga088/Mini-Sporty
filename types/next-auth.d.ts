import "next-auth";
import "next-auth/jwt";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: Role;
      isAdmin?: boolean;
      isCaptain?: boolean;
      isActive?: boolean;
      mustChangePassword?: boolean;
      sessionVersion?: number;
      passwordChangedAt?: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  interface User {
    role?: Role;
    isActive?: boolean;
    mustChangePassword?: boolean;
    sessionVersion?: number;
    passwordChangedAt?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    isActive?: boolean;
    mustChangePassword?: boolean;
    sessionVersion?: number;
    passwordChangedAt?: string | null;
  }
}
