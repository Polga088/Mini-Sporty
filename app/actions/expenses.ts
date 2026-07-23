"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { decimal } from "@/lib/money";
import { canAccessSensitiveAdmin } from "@/lib/permissions";
import { createExpenseSchema } from "@/lib/validators";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!canAccessSensitiveAdmin(session.user.role)) redirect("/espace");
  return session;
}

export async function createExpense(formData: FormData) {
  const session = await requireAdmin();
  const payload = createExpenseSchema.parse({
    title: formData.get("title"),
    description: formData.get("description"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    expenseDate: formData.get("expenseDate"),
    matchId: formData.get("matchId"),
    contributionId: formData.get("contributionId"),
    receiptUrl: formData.get("receiptUrl")
  });

  await prisma.expense.create({
    data: {
      title: payload.title,
      description: payload.description,
      category: payload.category,
      amount: decimal(payload.amount),
      expenseDate: new Date(payload.expenseDate),
      matchId: payload.matchId || null,
      contributionId: payload.contributionId || null,
      receiptUrl: payload.receiptUrl || null,
      createdById: session.user.id
    }
  });

  revalidatePath("/admin/depenses");
}
