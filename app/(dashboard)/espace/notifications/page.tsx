import { auth } from "@/auth";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NoticeBanner } from "@/components/notice-banner";
import { markAllNotificationsRead, markNotificationRead } from "@/app/actions/notifications";
import { notificationTypeLabels } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

type QueryParams = Record<string, string | string[] | undefined>;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PlayerNotificationsPage({ searchParams }: { searchParams?: Promise<QueryParams> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");

  const query = (await Promise.resolve(searchParams ?? {})) as QueryParams;
  const success = firstValue(query.success);
  const error = firstValue(query.error);

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="space-y-6">
      <NoticeBanner success={success} error={error} />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <CardTitle>Notifications</CardTitle>
            <CardDescription className="max-w-2xl">
              Suivez les rappels de sondage, de match et de portefeuille.
            </CardDescription>
          </div>
          {notifications.some((item) => !item.isRead) ? (
            <form action={markAllNotificationsRead}>
              <Button type="submit" variant="ghost">
                Tout marquer comme lu
              </Button>
            </form>
          ) : null}
        </div>

        <div className="mt-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed px-4 py-8 text-sm text-slate-500">
              Aucune notification pour le moment.
            </div>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className="rounded-2xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{notification.title}</p>
                      <Badge variant={notification.isRead ? "default" : "warning"}>{notification.isRead ? "Lue" : "Non lue"}</Badge>
                      <Badge variant="info">{notificationTypeLabels[notification.type]}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
                    <p className="mt-1 text-xs text-slate-500">{notification.createdAt.toLocaleString("fr-FR")}</p>
                  </div>
                  {!notification.isRead ? (
                    <form action={markNotificationRead}>
                      <input type="hidden" name="notificationId" value={notification.id} />
                      <Button type="submit" variant="ghost" className="px-3 py-1 text-xs">
                        Marquer comme lue
                      </Button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
