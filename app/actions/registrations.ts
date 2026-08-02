"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessSensitiveAdmin } from "@/lib/permissions";
import {
  registrationAdminActionSchema,
  publicPlayerRegistrationSchema
} from "@/lib/validators";
import {
  playerRegistrationApprovedNotification,
  playerRegistrationSubmittedNotification
} from "@/lib/notifications";
import { AccountApprovalStatus, Prisma, Role } from "@prisma/client";

export type PublicRegistrationState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

const registrationAttempts = new Map<string, number>();
const REGISTRATION_WINDOW_MS = 30_000;

function normalizePhone(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function genericRegistrationMessage() {
  return "Si cette adresse peut rejoindre l’équipe, la demande sera examinée par l’administrateur.";
}

function noticeUrl(path: string, key: string, notice: string) {
  return `${path}?${new URLSearchParams({ [key]: notice }).toString()}`;
}

function authNoticeUrl(mode: "login" | "register", key: string, notice: string) {
  const params = new URLSearchParams({ [key]: notice });
  if (mode === "register") params.set("mode", "register");
  return `/connexion?${params.toString()}`;
}

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!canAccessSensitiveAdmin(session.user.role)) redirect("/espace");
  return session;
}

function isRepeatedSubmission(email: string) {
  const now = Date.now();
  const previous = registrationAttempts.get(email);
  registrationAttempts.set(email, now);
  return Boolean(previous && now - previous < REGISTRATION_WINDOW_MS);
}

export async function checkCredentialAccess(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) return { status: "invalid" as const };

  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) return { status: "invalid" as const };

  const validPassword = await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) return { status: "invalid" as const };

  if (user.approvalStatus === AccountApprovalStatus.PENDING) return { status: "pending" as const };
  if (user.approvalStatus === AccountApprovalStatus.REJECTED) return { status: "rejected" as const };
  if (!user.isActive) return { status: "inactive" as const };

  return { status: "approved" as const };
}

export async function loginWithCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const access = await checkCredentialAccess(email, password);

  if (access.status === "pending") redirect(authNoticeUrl("login", "error", "registration_pending"));
  if (access.status === "rejected") redirect(authNoticeUrl("login", "error", "registration_denied"));
  if (access.status === "inactive") redirect(authNoticeUrl("login", "error", "inactive_account"));
  if (access.status !== "approved") redirect(authNoticeUrl("login", "error", "login_invalid"));

  await signIn("credentials", {
    email,
    password,
    redirectTo: "/"
  });
}

export async function registerPlayer(
  _previousState: PublicRegistrationState,
  formData: FormData
): Promise<PublicRegistrationState> {
  const parsed = publicPlayerRegistrationSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptRules: formData.get("acceptRules")
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Vérifie les champs puis réessaie.",
      fieldErrors: parsed.error.flatten().fieldErrors
    };
  }

  const payload = parsed.data;
  const normalizedEmail = payload.email.toLowerCase();

  if (isRepeatedSubmission(normalizedEmail)) {
    return {
      status: "error",
      message: "Patiente quelques secondes avant de renvoyer une demande."
    };
  }

  try {
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { approvalStatus: true }
    });

    if (existing) {
      return {
        status: "error",
        message: genericRegistrationMessage()
      };
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);

    await prisma.$transaction(async (tx) => {
      const player = await tx.user.create({
        data: {
          name: payload.name.trim(),
          email: normalizedEmail,
          phone: normalizePhone(payload.phone),
          passwordHash,
          passwordChangedAt: new Date(),
          mustChangePassword: false,
          sessionVersion: 0,
          role: Role.PLAYER,
          isActive: false,
          approvalStatus: AccountApprovalStatus.PENDING,
          requestedAt: new Date()
        }
      });

      const admins = await tx.user.findMany({
        where: {
          role: Role.ADMIN,
          isActive: true,
          approvalStatus: AccountApprovalStatus.APPROVED
        },
        select: { id: true }
      });

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            ...playerRegistrationSubmittedNotification(player.name)
          }))
        });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        status: "error",
        message: genericRegistrationMessage()
      };
    }

    throw error;
  }

  revalidatePath("/admin/inscriptions");
  revalidatePath("/admin");

  return {
    status: "success",
    message: "Demande envoyée. Ton inscription doit maintenant être validée par l’administrateur."
  };
}

export async function registerPlayerAndRedirect(formData: FormData) {
  const result = await registerPlayer({ status: "idle" }, formData);
  if (result.status === "success") redirect(authNoticeUrl("register", "success", "registration_submitted"));
  if (result.message?.includes("quelques secondes")) redirect(authNoticeUrl("register", "error", "registration_rate_limited"));
  if (result.message?.includes("Si cette adresse")) redirect(authNoticeUrl("register", "error", "registration_duplicate"));
  redirect(authNoticeUrl("register", "error", "validation"));
}

export async function approveRegistration(formData: FormData) {
  const session = await requireAdmin();
  const payload = registrationAdminActionSchema.parse({
    userId: formData.get("userId")
  });

  try {
    await prisma.$transaction(async (tx) => {
      const player = await tx.user.findUnique({
        where: { id: payload.userId },
        include: { wallet: true }
      });

      if (!player || player.role !== Role.PLAYER) throw new Error("not_found");
      if (player.approvalStatus !== AccountApprovalStatus.PENDING) throw new Error("already_processed");

      await tx.user.update({
        where: { id: player.id },
        data: {
          approvalStatus: AccountApprovalStatus.APPROVED,
          isActive: true,
          approvedAt: new Date(),
          approvedById: session.user.id,
          rejectedAt: null,
          rejectedById: null,
          rejectionReason: null,
          sessionVersion: { increment: 1 }
        }
      });

      if (!player.wallet) {
        await tx.wallet.create({
          data: {
            userId: player.id
          }
        });
      }

      await tx.notification.create({
        data: {
          userId: player.id,
          ...playerRegistrationApprovedNotification()
        }
      });
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "unexpected";
    if (code === "already_processed") redirect(noticeUrl("/admin/inscriptions", "error", "already_processed"));
    if (code === "not_found") redirect(noticeUrl("/admin/inscriptions", "error", "not_found"));
    throw error;
  }

  revalidatePath("/admin/inscriptions");
  revalidatePath("/admin/joueurs");
  revalidatePath("/admin");
  redirect(noticeUrl("/admin/inscriptions", "success", "registration_approved"));
}

export async function rejectRegistration(formData: FormData) {
  const session = await requireAdmin();
  const payload = registrationAdminActionSchema.parse({
    userId: formData.get("userId"),
    reason: formData.get("reason")
  });

  try {
    await prisma.$transaction(async (tx) => {
      const player = await tx.user.findUnique({
        where: { id: payload.userId },
        include: { wallet: true }
      });

      if (!player || player.role !== Role.PLAYER) throw new Error("not_found");
      if (player.approvalStatus !== AccountApprovalStatus.PENDING) throw new Error("already_processed");
      if (player.wallet) throw new Error("invalid_state");

      await tx.user.update({
        where: { id: player.id },
        data: {
          approvalStatus: AccountApprovalStatus.REJECTED,
          isActive: false,
          rejectedAt: new Date(),
          rejectedById: session.user.id,
          rejectionReason: payload.reason?.trim() || null,
          sessionVersion: { increment: 1 }
        }
      });
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "unexpected";
    if (code === "already_processed") redirect(noticeUrl("/admin/inscriptions", "error", "already_processed"));
    if (code === "not_found") redirect(noticeUrl("/admin/inscriptions", "error", "not_found"));
    if (code === "invalid_state") redirect(noticeUrl("/admin/inscriptions", "error", "invalid_state"));
    throw error;
  }

  revalidatePath("/admin/inscriptions");
  revalidatePath("/admin");
  redirect(noticeUrl("/admin/inscriptions", "success", "registration_rejected"));
}
