import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessSensitiveAdmin } from "@/lib/permissions";
import { NextResponse } from "next/server";

function toCsv(rows: Array<Record<string, string | number | boolean | null | undefined>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((key) => {
          const value = String(row[key] ?? "").replaceAll('"', '""');
          return `"${value}"`;
        })
        .join(",")
    )
  ].join("\n");
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.redirect(new URL("/connexion", request.url));
  if (!canAccessSensitiveAdmin(session.user.role)) return NextResponse.redirect(new URL("/espace", request.url));

  const url = new URL(request.url);
  const period = url.searchParams.get("period") ?? "30d";
  const players = await prisma.user.findMany({
    where: { role: "PLAYER" },
    select: { name: true, email: true, phone: true, isActive: true }
  });

  const csv = toCsv(
    players.map((player) => ({
      ...player,
      period
    }))
  );

  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename=statistiques-${period}.csv`,
      "cache-control": "no-store, max-age=0",
      pragma: "no-cache",
      "x-content-type-options": "nosniff"
    }
  });
}
