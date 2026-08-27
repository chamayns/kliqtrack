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

type SupabaseTransaction = {
  id: string;
  transaction_date: string;
  description: string;
  transaction_type: TransactionType;
  category: string;
  qty: number;
  amount: number;
  payment_method: string;
  notes: string | null;
};

type Filters = {
  query: string;
  type: "All" | TransactionType;
  category: "All" | string;
  paymentMethod: "All" | string;
};

const expenseCategories = [
  "Acrylic (Print & Cut)",
  "NFC Chips",
  "Transportation",
  "Additional Expenses",
];

const incomeCategories = ["Sales"];
const allCategories = [...incomeCategories, ...expenseCategories];
const paymentMethods = ["Bank Transfer", "Cash", "Card", "Other"];

const today = new Date().toISOString().slice(0, 10);
const currentMonth = today.slice(0, 7);
const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

function normalizeSupabaseUrl(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const cleanValue = value.replace(/\/$/, "");

  if (cleanValue.startsWith("http://") || cleanValue.startsWith("https://")) {
    return cleanValue;
  }

  return `https://${cleanValue}.supabase.co`;
}

const supabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);
const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const initialForm = {
  date: today,
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

function monthLabel(month: string) {
  const [year, monthIndex] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthIndex - 1, 1));
}

function moveMonth(month: string, offset: number) {
  const [year, monthIndex] = month.split("-").map(Number);
  const next = new Date(year, monthIndex - 1 + offset, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
}

function fromSupabase(item: SupabaseTransaction): Transaction {
  return {
    id: item.id,
    date: item.transaction_date,
    description: item.description,
    type: item.transaction_type,
    category: item.category,
    qty: item.qty,
    amount: item.amount,
    paymentMethod: item.payment_method,
    notes: item.notes || "",
  };
}

async function supabaseRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase is not configured");
  }

  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const body = await response.json().catch(() => null);
      const message =
        body?.message || body?.error_description || body?.error || "Supabase request failed";
      throw new Error(String(message));
    }

    if (response.status === 404) {
      throw new Error("Could not find the Supabase table. Check the Supabase URL and run supabase/schema.sql.");
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error("Supabase rejected the request. Check the anon key and table policies.");
    }

    throw new Error(`Supabase request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

function friendlyError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) {
    return fallback;
  }

  if (error.message.includes("<!DOCTYPE") || error.message.includes("<html")) {
    return "Could not connect to Supabase. Check NEXT_PUBLIC_SUPABASE_URL in Vercel.";
  }

  if (error.message === "Failed to fetch") {
    return "Could not reach Supabase. Check the project URL and browser network access.";
  }

  return error.message.slice(0, 180);
}

export default function Home() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [form, setForm] = useState(initialForm);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [filters, setFilters] = useState<Filters>({
    query: "",
    type: "All",
    category: "All",
    paymentMethod: "All",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(
    isSupabaseConfigured ? "Ready to sync with Supabase" : "Add Supabase env vars to enable saving",
  );

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    void loadTransactions();
  }, []);

  async function loadTransactions() {
    try {
      setIsLoading(true);
      setStatus("Loading transactions...");
      const records = await supabaseRequest<SupabaseTransaction[]>(
        "transactions?select=*&order=transaction_date.desc,created_at.desc",
      );
      setTransactions(records.map(fromSupabase));
      setStatus("Synced with Supabase");
    } catch (error) {
      setStatus(friendlyError(error, "Could not load transactions"));
    } finally {
      setIsLoading(false);
    }
  }

  const monthTransactions = useMemo(
    () => transactions.filter((item) => item.date.startsWith(selectedMonth)),
    [transactions, selectedMonth],
  );

  const filteredTransactions = useMemo(() => {
    const query = filters.query.trim().toLowerCase();

    return monthTransactions.filter((item) => {
      const matchesQuery =
        !query ||
        [item.description, item.category, item.paymentMethod, item.notes]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesType = filters.type === "All" || item.type === filters.type;
      const matchesCategory = filters.category === "All" || item.category === filters.category;
      const matchesPayment =
        filters.paymentMethod === "All" || item.paymentMethod === filters.paymentMethod;

      return matchesQuery && matchesType && matchesCategory && matchesPayment;
    });
  }, [filters, monthTransactions]);

  const totals = useMemo(() => {
    const totalIncome = monthTransactions
      .filter((item) => item.type === "Income")
      .reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = monthTransactions
      .filter((item) => item.type === "Expense")
      .reduce((sum, item) => sum + item.amount, 0);
    const expensesByCategory = expenseCategories.map((category) => ({
      category,
      amount: monthTransactions
        .filter((item) => item.type === "Expense" && item.category === category)
        .reduce((sum, item) => sum + item.amount, 0),
    }));

    return {
      totalIncome,
      totalExpenses,
      netProfit: totalIncome - totalExpenses,
      expensesByCategory,
      sales: monthTransactions
        .filter((item) => item.type === "Income" && item.category === "Sales")
        .reduce((sum, item) => sum + item.amount, 0),
    };
  }, [monthTransactions]);

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

  async function addTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = Number(form.amount);
    const qty = Number(form.qty) || 1;

    if (!isSupabaseConfigured) {
      setStatus("Add Supabase env vars before saving transactions");
      return;
    }

    if (!form.description.trim() || Number.isNaN(amount) || amount < 0) {
      setStatus("Add a description and valid amount");
      return;
    }

    try {
      setIsLoading(true);
      setStatus("Saving transaction...");
      const [saved] = await supabaseRequest<SupabaseTransaction[]>("transactions", {
        method: "POST",
        body: JSON.stringify({
          transaction_date: form.date,
          description: form.description.trim(),
          transaction_type: form.type,
          category: form.category,
          qty,
          amount,
          payment_method: form.paymentMethod,
          notes: form.notes.trim() || null,
        }),
      });

      setTransactions((current) => [fromSupabase(saved), ...current]);
      setSelectedMonth(form.date.slice(0, 7));
      setForm((current) => ({
        ...initialForm,
        date: current.date,
        type: current.type,
        category: categoryOptions(current.type)[0],
        paymentMethod: current.paymentMethod,
      }));
      setStatus("Saved to Supabase");
    } catch (error) {
      setStatus(friendlyError(error, "Could not save transaction"));
    } finally {
      setIsLoading(false);
    }
  }

  async function removeTransaction(id: string) {
    if (!isSupabaseConfigured) {
      setStatus("Add Supabase env vars before deleting transactions");
      return;
    }

    try {
      setIsLoading(true);
      setStatus("Deleting transaction...");
      await supabaseRequest(`transactions?id=eq.${id}`, { method: "DELETE" });
      setTransactions((current) => current.filter((item) => item.id !== id));
      setStatus("Deleted from Supabase");
    } catch (error) {
      setStatus(friendlyError(error, "Could not delete transaction"));
    } finally {
      setIsLoading(false);
    }
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
    const rows = filteredTransactions.map((item) =>
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
    link.download = `kliq-transactions-${selectedMonth}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#f8f7f2] text-[#11110f]">
      <section className="mx-auto max-w-7xl px-4 pb-6 pt-5 sm:px-6 lg:px-8">
        <div className="animate-rise flex flex-col gap-5 border-b border-[#ded9cd] pb-6 lg:flex-row lg:items-center lg:justify-between">
          <img
            src="/kliq-logo.png"
            alt="KLIQ"
            className="h-14 w-auto shrink-0 object-contain sm:h-16"
          />

          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={loadTransactions} className="secondary-button" disabled={isLoading}>
                Refresh
              </button>
              <button type="button" onClick={exportCsv} className="secondary-button">
                Export CSV
              </button>
            </div>
            <div className="month-control">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setSelectedMonth((month) => moveMonth(month, -1))}
              >
                {"<"}
              </button>
              <label>
                <span>Month</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                />
              </label>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setSelectedMonth((month) => moveMonth(month, 1))}
              >
                {">"}
              </button>
            </div>
            <span className="max-w-sm truncate text-xs font-medium text-[#69655c]">{status}</span>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-6 sm:px-6 lg:grid-cols-4 lg:px-8">
        <SummaryCard label="Month" value={monthLabel(selectedMonth)} />
        <SummaryCard label="Total Income" value={idr.format(totals.totalIncome)} tone="green" />
        <SummaryCard label="Total Expenses" value={idr.format(totals.totalExpenses)} tone="red" />
        <SummaryCard
          label="Net Profit / Loss"
          value={idr.format(totals.netProfit)}
          tone={totals.netProfit >= 0 ? "dark" : "red"}
        />
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-4 pb-8 sm:px-6 lg:grid-cols-[360px_1fr] lg:px-8">
        <form onSubmit={addTransaction} className="panel animate-rise h-fit p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Add transaction</h2>
            <span className="type-pill income">{form.type}</span>
          </div>

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
            <button type="submit" className="primary-button" disabled={isLoading}>
              {isLoading ? "Working..." : "Add transaction"}
            </button>
          </div>
        </form>

        <div className="grid gap-5">
          <section className="panel animate-rise p-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">Expense breakdown</h2>
              <span className="text-sm text-[#69655c]">Sales this month: {idr.format(totals.sales)}</span>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {totals.expensesByCategory.map((item, index) => (
                <div key={item.category} className="mini-card" style={{ animationDelay: `${index * 60}ms` }}>
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium">{item.category}</span>
                    <span>{idr.format(item.amount)}</span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-[#ece8de]">
                    <div
                      className="bar-fill"
                      style={{
                        width: `${totals.totalExpenses ? Math.max(4, (item.amount / totals.totalExpenses) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel animate-rise overflow-hidden">
            <div className="border-b border-[#e3ded3] p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold">Transaction log</h2>
                <span className="text-sm text-[#69655c]">
                  {filteredTransactions.length} of {monthTransactions.length} entries in {monthLabel(selectedMonth)}
                </span>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_140px_190px_150px]">
                <input
                  className="field"
                  value={filters.query}
                  onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                  placeholder="Search transactions"
                />
                <select
                  className="field"
                  value={filters.type}
                  onChange={(event) => setFilters((current) => ({ ...current, type: event.target.value as Filters["type"] }))}
                >
                  <option>All</option>
                  <option>Income</option>
                  <option>Expense</option>
                </select>
                <select
                  className="field"
                  value={filters.category}
                  onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
                >
                  <option>All</option>
                  {allCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
                <select
                  className="field"
                  value={filters.paymentMethod}
                  onChange={(event) => setFilters((current) => ({ ...current, paymentMethod: event.target.value }))}
                >
                  <option>All</option>
                  {paymentMethods.map((method) => (
                    <option key={method}>{method}</option>
                  ))}
                </select>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" onClick={exportCsv} className="secondary-button">
                  Export filtered CSV
                </button>
                <button
                  type="button"
                  onClick={() => setFilters({ query: "", type: "All", category: "All", paymentMethod: "All" })}
                  className="secondary-button"
                >
                  Clear filters
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-[#f1eee7] text-xs uppercase text-[#6f6a5f]">
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
                <tbody className="divide-y divide-[#eee9df]">
                  {filteredTransactions.length ? (
                    filteredTransactions.map((item, index) => (
                      <tr key={item.id} className="table-row" style={{ animationDelay: `${index * 35}ms` }}>
                        <td className="px-4 py-3">{item.date}</td>
                        <td className="px-4 py-3 font-medium">{item.description}</td>
                        <td className="px-4 py-3">
                          <span className={`type-pill ${item.type === "Income" ? "income" : "expense"}`}>
                            {item.type}
                          </span>
                        </td>
                        <td className="px-4 py-3">{item.category}</td>
                        <td className="px-4 py-3 text-right">{item.qty}</td>
                        <td className="px-4 py-3 text-right font-semibold">{idr.format(item.amount)}</td>
                        <td className="px-4 py-3">{item.paymentMethod}</td>
                        <td className="px-4 py-3 text-[#69655c]">{item.notes}</td>
                        <td className="px-4 py-3 text-right">
                          <button type="button" onClick={() => void removeTransaction(item.id)} className="delete-button">
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="px-4 py-10 text-center text-sm text-[#69655c]">
                        No transactions match this month and filter.
                      </td>
                    </tr>
                  )}
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
  tone = "dark",
}: {
  label: string;
  value: string;
  tone?: "green" | "red" | "dark";
}) {
  const color = {
    green: "text-[#24734f]",
    red: "text-[#bd4938]",
    dark: "text-[#11110f]",
  }[tone];

  return (
    <div className="panel animate-rise p-5">
      <p className="text-sm font-medium text-[#69655c]">{label}</p>
      <p className={`mt-2 truncate text-2xl font-semibold ${color}`}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-[#36332e]">
      {label}
      {children}
    </label>
  );
}
