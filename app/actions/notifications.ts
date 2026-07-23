"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManageSport } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  return session;
}

function redirectWithNotice(path: string, key: string, kind: "success" | "error" = "success") {
  redirect(`${path}?${new URLSearchParams({ [kind]: key }).toString()}`);
}

export async function markNotificationRead(formData: FormData) {
  const session = await requireSession();
  const notificationId = String(formData.get("notificationId") ?? "");

  await prisma.notification.updateMany({
    where: { id: notificationId, userId: session.user.id },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });

  revalidatePath("/espace/notifications");
  revalidatePath("/admin/notifications");
  redirectWithNotice(canManageSport(session.user.role) ? "/admin/notifications" : "/espace/notifications", "notification_read");
}

export async function markAllNotificationsRead(formData?: FormData) {
  void formData;
  const session = await requireSession();

  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: {
      isRead: true,
      readAt: new Date()
    }
  });

  revalidatePath("/espace/notifications");
  revalidatePath("/admin/notifications");
  redirectWithNotice(canManageSport(session.user.role) ? "/admin/notifications" : "/espace/notifications", "notifications_read");
}
