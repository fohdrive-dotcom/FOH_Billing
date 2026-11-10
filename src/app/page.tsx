"use client";
/**
 * / — dashboard with quick stats and the most recent documents.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import type { AppDocument, Settings } from "@/lib/types";
import { repo } from "@/lib/storage";
import { docTotal, effectiveStatus } from "@/lib/docActions";
import { formatDateShort, money, todayISO } from "@/lib/format";
import { Card, Loading } from "@/components/ui";
import { StatusBadge, TypeBadge } from "@/components/StatusBadge";

export default function Dashboard() {
  const [docs, setDocs] = useState<AppDocument[] | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);

  useEffect(() => {
    Promise.all([repo.listDocuments(), repo.getSettings()]).then(([d, s]) => {
      setDocs(d);
      setSettings(s);
    });
  }, []);

  if (!docs || !settings) return <Loading />;

  const cur = settings.currency;
  const invoices = docs.filter((d) => d.type === "invoice");
  const quotes = docs.filter((d) => d.type === "quotation");
  const month = todayISO().slice(0, 7); // "2026-11"
  const sum = (list: AppDocument[]) => list.reduce((s, d) => s + docTotal(d), 0);

  const unpaid = invoices.filter((d) => ["sent", "overdue"].includes(effectiveStatus(d)));
  const overdue = invoices.filter((d) => effectiveStatus(d) === "overdue");
  const paidThisMonth = invoices.filter((d) => d.status === "paid" && d.issueDate.startsWith(month));
  const openQuotes = quotes.filter((d) => ["draft", "sent"].includes(d.status));

  const stats = [
    { label: "Unpaid invoices", value: `${money(sum(unpaid))} ${cur}`, sub: `${unpaid.length} invoice(s)` },
    { label: "Overdue", value: `${money(sum(overdue))} ${cur}`, sub: `${overdue.length} invoice(s)`, warn: overdue.length > 0 },
    { label: "Paid this month", value: `${money(sum(paidThisMonth))} ${cur}`, sub: `${paidThisMonth.length} invoice(s)` },
    { label: "Open quotations", value: `${money(sum(openQuotes))} ${cur}`, sub: `${openQuotes.length} quotation(s)` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Link href="/new?type=invoice" className="rounded-md bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-800">
            + New invoice
          </Link>
          <Link href="/new?type=quotation" className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
            + New quotation
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase text-slate-500">{s.label}</p>
            <p className={`mt-1 text-xl font-bold tabular-nums ${s.warn ? "text-red-700" : "text-slate-900"}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.sub}</p>
          </div>
        ))}
      </div>

      <Card
        title="Recent documents"
        actions={
          <Link href="/documents" className="text-sm text-indigo-700 hover:underline">
            View all →
          </Link>
        }
      >
        {docs.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            <p>No documents yet.</p>
            <p className="mt-1">
              First, check your business details in{" "}
              <Link href="/settings" className="text-indigo-700 underline">
                Settings
              </Link>
              , then create your first invoice.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {docs.slice(0, 8).map((d) => (
              <li key={d.id}>
                <Link href={`/documents/${d.id}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 hover:bg-slate-50">
                  <span className="w-24 font-semibold text-indigo-700">{d.number}</span>
                  <TypeBadge type={d.type} />
                  <span className="min-w-0 flex-1 truncate">{d.client.name}</span>
                  <span className="text-xs text-slate-500">{formatDateShort(d.issueDate)}</span>
                  <span className="w-32 text-right tabular-nums">
                    {money(docTotal(d))} {d.currency}
                  </span>
                  <StatusBadge status={effectiveStatus(d)} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
