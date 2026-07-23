"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { SETTINGS_SINGLETON_KEY } from "@/lib/settings";
import { appSettingsSchema } from "@/lib/validators";
import { Prisma } from "@prisma/client";
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

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!session.user.isAdmin) redirect("/espace");
  return session;
}

function errorCode(error: unknown) {
  if (error instanceof BusinessError) return error.code;
  if (error instanceof z.ZodError) return "validation";
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return "not_found";
  return "unexpected";
}

function normalizeOptionalUrl(value: string | null | undefined) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : null;
}

function redirectWithNotice(path: string, notice: string, kind: "success" | "error" = "success") {
  redirect(`${path}?${new URLSearchParams({ [kind]: notice }).toString()}`);
}

export async function updateGeneralSettings(formData: FormData) {
  await requireAdmin();

  try {
    const payload = appSettingsSchema.parse({
      singletonKey: SETTINGS_SINGLETON_KEY,
      organizationName: formData.get("organizationName"),
      logoUrl: formData.get("logoUrl"),
      defaultGround: formData.get("defaultGround"),
      defaultMatchPrice: formData.get("defaultMatchPrice"),
      defaultCapacity: formData.get("defaultCapacity"),
      walletAlertThreshold: formData.get("walletAlertThreshold"),
      whatsappTemplate: formData.get("whatsappTemplate")
    });

    await prisma.appSettings.upsert({
      where: { singletonKey: SETTINGS_SINGLETON_KEY },
      create: {
        singletonKey: SETTINGS_SINGLETON_KEY,
        organizationName: payload.organizationName,
        logoUrl: normalizeOptionalUrl(payload.logoUrl),
        defaultGround: payload.defaultGround,
        defaultMatchPrice: payload.defaultMatchPrice,
        defaultCapacity: payload.defaultCapacity,
        walletAlertThreshold: payload.walletAlertThreshold,
        whatsappTemplate: payload.whatsappTemplate
      },
      update: {
        organizationName: payload.organizationName,
        logoUrl: normalizeOptionalUrl(payload.logoUrl),
        defaultGround: payload.defaultGround,
        defaultMatchPrice: payload.defaultMatchPrice,
        defaultCapacity: payload.defaultCapacity,
        walletAlertThreshold: payload.walletAlertThreshold,
        whatsappTemplate: payload.whatsappTemplate
      }
    });

    revalidatePath("/admin");
    revalidatePath("/admin/parametres");
    revalidatePath("/admin/matchs/nouveau");
    revalidatePath("/admin/sondages/nouveau");
    revalidatePath("/espace");

    redirectWithNotice("/admin/parametres", "settings_updated");
  } catch (error) {
    const code = errorCode(error);
    if (code === "validation") redirectWithNotice("/admin/parametres", "validation", "error");
    if (code === "unexpected") throw error;
    redirectWithNotice("/admin/parametres", code, "error");
  }
}
