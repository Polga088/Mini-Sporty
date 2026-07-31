import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createExpense } from "@/app/actions/expenses";
import { canAccessSensitiveAdmin } from "@/lib/permissions";
import { redirect } from "next/navigation";
import { formatDh } from "@/lib/money";

export default async function AdminExpensesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!canAccessSensitiveAdmin(session.user.role)) redirect("/espace");

  const expenses = await prisma.expense.findMany({ orderBy: { expenseDate: "desc" } });

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Enregistrer une dépense</CardTitle>
        <form action={createExpense} className="mt-4 grid min-w-0 gap-3 md:grid-cols-2">
          <input name="title" placeholder="Titre" className="w-full min-w-0 rounded-xl border px-3 py-2" />
          <input name="amount" type="number" step="0.01" inputMode="decimal" placeholder="Montant" className="w-full min-w-0 rounded-xl border px-3 py-2" />
          <input name="description" placeholder="Description" className="w-full min-w-0 rounded-xl border px-3 py-2 md:col-span-2" />
          <input name="expenseDate" type="date" className="w-full min-w-0 rounded-xl border px-3 py-2" />
          <input name="receiptUrl" placeholder="Justificatif" className="w-full min-w-0 rounded-xl border px-3 py-2" />
          <Button type="submit" className="w-full md:col-span-2 sm:w-auto">Enregistrer</Button>
        </form>
      </Card>

      <Card>
        <CardTitle>Dépenses</CardTitle>
        <div className="mt-4 hidden overflow-hidden rounded-xl border md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3">Titre</th>
                <th className="px-4 py-3">Catégorie</th>
                <th className="px-4 py-3">Montant</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense: (typeof expenses)[number]) => (
                <tr key={expense.id} className="border-t">
                  <td className="px-4 py-3">{expense.title}</td>
                  <td className="px-4 py-3">{expense.category}</td>
                  <td className="px-4 py-3">{expense.amount.toString()} DH</td>
                  <td className="px-4 py-3">{expense.expenseDate.toLocaleDateString("fr-FR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-3 md:hidden">
          {expenses.map((expense: (typeof expenses)[number]) => (
            <article key={expense.id} className="rounded-2xl border bg-white p-4">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-slate-950">{expense.title}</p>
                  <p className="mt-1 text-sm text-slate-500">{expense.category}</p>
                </div>
                <p className="shrink-0 whitespace-nowrap font-semibold text-slate-950">{formatDh(expense.amount)}</p>
              </div>
              <p className="mt-3 text-sm text-slate-600">{expense.expenseDate.toLocaleDateString("fr-FR")}</p>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}
