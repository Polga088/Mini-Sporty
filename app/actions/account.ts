"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(8)
  })
  .refine((payload) => payload.newPassword === payload.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"]
  });

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  return session;
}

function redirectWithNotice(kind: "success" | "error", notice: string) {
  redirect(`/mot-de-passe?${new URLSearchParams({ [kind]: notice }).toString()}`);
}

export async function changeMyPassword(formData: FormData) {
  const session = await requireSession();

  try {
    const payload = changePasswordSchema.parse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword")
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        passwordHash: true,
        sessionVersion: true,
        mustChangePassword: true
      }
    });

    if (!user) {
      redirect("/connexion");
    }

    const passwordValid = await bcrypt.compare(payload.currentPassword, user.passwordHash);
    if (!passwordValid) {
      redirectWithNotice("error", "invalid_current_password");
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        passwordHash: await bcrypt.hash(payload.newPassword, 10),
        passwordChangedAt: new Date(),
        sessionVersion: { increment: 1 },
        mustChangePassword: false
      }
    });

    revalidatePath("/mot-de-passe");
    revalidatePath("/espace");
    revalidatePath("/admin");
  } catch (error) {
    if (error instanceof z.ZodError) {
      redirectWithNotice("error", "validation");
    }
    throw error;
  }

  redirectWithNotice("success", "password_changed");
}
