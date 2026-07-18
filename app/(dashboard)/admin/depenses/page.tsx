import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardTitle } from "@/components/ui/card";
import { createExpense } from "@/app/actions/expenses";
import { redirect } from "next/navigation";

export default async function AdminExpensesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/connexion");
  if (!session.user.isAdmin) redirect("/espace");

  const expenses = await prisma.expense.findMany({ orderBy: { expenseDate: "desc" } });

  return (
    <div className="space-y-6">
      <Card>
        <CardTitle>Enregistrer une dépense</CardTitle>
        <form action={createExpense} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="title" placeholder="Titre" className="rounded-xl border px-3 py-2" />
          <input name="amount" type="number" step="0.01" placeholder="Montant" className="rounded-xl border px-3 py-2" />
          <input name="description" placeholder="Description" className="rounded-xl border px-3 py-2 md:col-span-2" />
          <input name="expenseDate" type="date" className="rounded-xl border px-3 py-2" />
          <input name="receiptUrl" placeholder="Justificatif" className="rounded-xl border px-3 py-2" />
          <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm text-white md:col-span-2">Enregistrer</button>
        </form>
      </Card>

      <Card>
        <CardTitle>Dépenses</CardTitle>
        <div className="mt-4 overflow-hidden rounded-xl border">
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
      </Card>
    </div>
  );
}
