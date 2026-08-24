"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type TransactionType = "Income" | "Expense";

type Transaction = {
  id: string;
  date: string;
  description: string;
  type: TransactionType;
  category: string;
  qty: number;
  amount: number;
  paymentMethod: string;
  notes: string;
};

const expenseCategories = [
  "Acrylic (Print & Cut)",
  "NFC Chips",
  "Transportation",
  "Additional Expenses",
];

const incomeCategories = ["Sales"];
const paymentMethods = ["Bank Transfer", "Cash", "Card", "Other"];

const seedTransactions: Transaction[] = [
  {
    id: "seed-1",
    date: new Date().toISOString().slice(0, 10),
    description: "Example: 40 acrylic pieces",
    type: "Expense",
    category: "Acrylic (Print & Cut)",
    qty: 40,
    amount: 0,
    paymentMethod: "Bank Transfer",
    notes: "Enter actual invoice amount",
  },
  {
    id: "seed-2",
    date: new Date().toISOString().slice(0, 10),
    description: "Restaurant / customer sale",
    type: "Income",
    category: "Sales",
    qty: 1,
    amount: 0,
    paymentMethod: "Bank Transfer",
    notes: "",
  },
];

const initialForm = {
  date: new Date().toISOString().slice(0, 10),
  description: "",
  type: "Expense" as TransactionType,
  category: expenseCategories[0],
  qty: "1",
  amount: "",
  paymentMethod: "Bank Transfer",
  notes: "",
};

const idr = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

function categoryOptions(type: TransactionType) {
  return type === "Income" ? incomeCategories : expenseCategories;
}

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>(seedTransactions);
  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    const saved = window.localStorage.getItem("kliq-transactions");
    if (saved) {
      setTransactions(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("kliq-transactions", JSON.stringify(transactions));
  }, [transactions]);

  const totals = useMemo(() => {
    const totalIncome = transactions
      .filter((item) => item.type === "Income")
      .reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = transactions
      .filter((item) => item.type === "Expense")
      .reduce((sum, item) => sum + item.amount, 0);
    const expensesByCategory = expenseCategories.map((category) => ({
      category,
      amount: transactions
        .filter((item) => item.type === "Expense" && item.category === category)
        .reduce((sum, item) => sum + item.amount, 0),
    }));

    return {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      expensesByCategory,
      sales: transactions
        .filter((item) => item.type === "Income" && item.category === "Sales")
        .reduce((sum, item) => sum + item.amount, 0),
    };
  }, [transactions]);

  function updateForm(name: string, value: string) {
    if (name === "type") {
      const nextType = value as TransactionType;
      setForm((current) => ({
        ...current,
        type: nextType,
        category: categoryOptions(nextType)[0],
      }));
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
  }

  function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(form.amount);
    const qty = Number(form.qty) || 1;

    if (!form.description.trim() || Number.isNaN(amount) || amount < 0) {
      return;
    }

    setTransactions((current) => [
      {
        id: crypto.randomUUID(),
        date: form.date,
        description: form.description.trim(),
        type: form.type,
        category: form.category,
        qty,
        amount,
        paymentMethod: form.paymentMethod,
        notes: form.notes.trim(),
      },
      ...current,
    ]);

    setForm((current) => ({
      ...initialForm,
      date: current.date,
      type: current.type,
      category: categoryOptions(current.type)[0],
      paymentMethod: current.paymentMethod,
    }));
  }

  function removeTransaction(id: string) {
    setTransactions((current) => current.filter((item) => item.id !== id));
  }

  function exportCsv() {
    const header = [
      "Date",
      "Description",
      "Type",
      "Category",
      "Qty",
      "Amount (IDR)",
      "Payment Method",
      "Notes",
    ];
    const rows = transactions.map((item) =>
      [
        item.date,
        item.description,
        item.type,
        item.category,
        item.qty,
        item.amount,
        item.paymentMethod,
        item.notes,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "kliq-transactions.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#f5f3ed] text-[#171713]">
      <section className="border-b border-[#d9d2c4] bg-[#fffdf8]">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div>
            <img src="/kliq-logo.png" alt="KLIQ" className="h-16 w-auto object-contain" />
            <h1 className="mt-6 text-3xl font-semibold tracking-normal sm:text-4xl">
              Business budget and cash tracker
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#676154]">
              Track sales, acrylic costs, NFC chips, transportation, and other expenses in one tidy place.
            </p>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="h-11 rounded-md bg-[#171713] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#2d2b25]"
          >
            Export CSV
          </button>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 py-6 sm:px-6 lg:grid-cols-3 lg:px-8">
        <SummaryCard label="Total Income" value={totals.totalIncome} accent="green" />
        <SummaryCard label="Total Expenses" value={totals.totalExpenses} accent="red" />
        <SummaryCard label="Net Profit / Loss" value={totals.netProfit} accent={totals.netProfit >= 0 ? "black" : "red"} />
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-8 sm:px-6 lg:grid-cols-[380px_1fr] lg:px-8">
        <form onSubmit={addTransaction} className="h-fit rounded-md border border-[#d9d2c4] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Add transaction</h2>
          <div className="mt-5 grid gap-4">
            <Field label="Date">
              <input className="field" name="date" type="date" value={form.date} onChange={(event) => updateForm(event.target.name, event.target.value)} />
            </Field>
            <Field label="Description">
              <input className="field" name="description" value={form.description} onChange={(event) => updateForm(event.target.name, event.target.value)} placeholder="Restaurant / customer sale" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select className="field" name="type" value={form.type} onChange={(event) => updateForm(event.target.name, event.target.value)}>
                  <option>Expense</option>
                  <option>Income</option>
                </select>
              </Field>
              <Field label="Qty">
                <input className="field" name="qty" type="number" min="0" step="1" value={form.qty} onChange={(event) => updateForm(event.target.name, event.target.value)} />
              </Field>
            </div>
            <Field label="Category">
              <select className="field" name="category" value={form.category} onChange={(event) => updateForm(event.target.name, event.target.value)}>
                {categoryOptions(form.type).map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </Field>
            <Field label="Amount (IDR)">
              <input className="field" name="amount" type="number" min="0" step="1000" value={form.amount} onChange={(event) => updateForm(event.target.name, event.target.value)} placeholder="0" />
            </Field>
            <Field label="Payment Method">
              <select className="field" name="paymentMethod" value={form.paymentMethod} onChange={(event) => updateForm(event.target.name, event.target.value)}>
                {paymentMethods.map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </Field>
            <Field label="Notes">
              <textarea className="field min-h-20 resize-y" name="notes" value={form.notes} onChange={(event) => updateForm(event.target.name, event.target.value)} placeholder="Invoice, supplier, or customer notes" />
            </Field>
            <button type="submit" className="h-11 rounded-md bg-[#217a5b] px-4 text-sm font-semibold text-white transition hover:bg-[#176246]">
              Add transaction
            </button>
          </div>
        </form>

        <div className="grid gap-6">
          <section className="rounded-md border border-[#d9d2c4] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Expense breakdown</h2>
              <span className="text-sm text-[#676154]">Sales: {idr.format(totals.sales)}</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {totals.expensesByCategory.map((item) => (
                <div key={item.category} className="rounded-md border border-[#e7e0d4] p-4">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{item.category}</span>
                    <span>{idr.format(item.amount)}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-[#eee8dc]">
                    <div
                      className="h-2 rounded-full bg-[#d64f38]"
                      style={{
                        width: `${totals.totalExpenses ? Math.max(4, (item.amount / totals.totalExpenses) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-md border border-[#d9d2c4] bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-[#e7e0d4] p-5 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">Transaction log</h2>
              <span className="text-sm text-[#676154]">{transactions.length} entries saved on this device</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-[#f5f3ed] text-xs uppercase text-[#676154]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Description</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3"> </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#eee8dc]">
                  {transactions.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">{item.date}</td>
                      <td className="px-4 py-3 font-medium">{item.description}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${item.type === "Income" ? "bg-[#dcefe6] text-[#176246]" : "bg-[#f7dfd8] text-[#a53825]"}`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.category}</td>
                      <td className="px-4 py-3 text-right">{item.qty}</td>
                      <td className="px-4 py-3 text-right font-semibold">{idr.format(item.amount)}</td>
                      <td className="px-4 py-3">{item.paymentMethod}</td>
                      <td className="px-4 py-3 text-[#676154]">{item.notes}</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => removeTransaction(item.id)} className="rounded-md border border-[#d9d2c4] px-2 py-1 text-xs text-[#676154] hover:bg-[#f5f3ed]">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "green" | "red" | "black";
}) {
  const color = {
    green: "text-[#217a5b]",
    red: "text-[#d64f38]",
    black: "text-[#171713]",
  }[accent];

  return (
    <div className="rounded-md border border-[#d9d2c4] bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-[#676154]">{label}</p>
      <p className={`mt-3 text-2xl font-semibold ${color}`}>{idr.format(value)}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-[#3c382f]">
      {label}
      {children}
    </label>
  );
}
