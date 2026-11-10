"use client";
/**
 * /documents — history of every invoice and quotation, with search and filters.
 */
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { AppDocument, DocStatus, Settings } from "@/lib/types";
import { INVOICE_STATUSES, QUOTATION_STATUSES } from "@/lib/types";
import { repo } from "@/lib/storage";
import { docTotal, effectiveStatus } from "@/lib/docActions";
import { formatDateShort, money } from "@/lib/format";
import { Button, Card, Loading, PageHeader, inputClass } from "@/components/ui";
import { StatusBadge, TypeBadge } from "@/components/StatusBadge";

const ALL_STATUSES = Array.from(new Set<DocStatus>([...INVOICE_STATUSES, ...QUOTATION_STATUSES]));

export default function DocumentsPage() {
  const router = useRouter();
  const [docs, setDocs] = useState<AppDocument[] | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [type, setType] = useState<"all" | "invoice" | "quotation">("all");
  const [status, setStatus] = useState<"all" | DocStatus>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  /** (Re)loads documents + settings from storage. */
  function load() {
    return Promise.all([repo.listDocuments(), repo.getSettings()]).then(([d, s]) => {
      setDocs(d);
      setSettings(s);
    });
  }
  useEffect(() => {
    Promise.all([repo.listDocuments(), repo.getSettings()]).then(([d, s]) => {
      setDocs(d);
      setSettings(s);
    });
  }, []);

  const filtered = useMemo(() => {
    if (!docs) return [];
    const q = search.trim().toLowerCase();
    return docs.filter((d) => {
      if (type !== "all" && d.type !== type) return false;
      if (status !== "all" && effectiveStatus(d) !== status) return false;
      if (from && d.issueDate < from) return false;
      if (to && d.issueDate > to) return false;
      if (!q) return true;
      return (
        d.number.toLowerCase().includes(q) ||
        d.client.name.toLowerCase().includes(q) ||
        d.items.some((it) => `${it.title} ${it.description}`.toLowerCase().includes(q))
      );
    });
  }, [docs, search, type, status, from, to]);

  async function download(d: AppDocument) {
    if (!settings) return;
    setBusyId(d.id);
    try {
      const { downloadPdf } = await import("@/lib/pdf/generate");
      await downloadPdf(d, settings);
    } catch (e) {
      alert(`Could not create PDF: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(d: AppDocument) {
    if (!confirm(`Delete ${d.number}? This cannot be undone.`)) return;
    await repo.deleteDocument(d.id);
    load();
  }

  async function changeStatus(d: AppDocument, s: DocStatus) {
    await repo.saveDocument({ ...d, status: s });
    load();
  }

  if (!docs) return <Loading />;

  return (
    <div>
      <PageHeader title="Documents">
        <Button variant="primary" onClick={() => router.push("/new?type=invoice")}>
          + Invoice
        </Button>
        <Button onClick={() => router.push("/new?type=quotation")}>+ Quotation</Button>
      </PageHeader>

      <Card>
        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <input
            placeholder="Search number, client, item…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass + " lg:col-span-2"}
            aria-label="Search"
          />
          <select value={type} onChange={(e) => setType(e.target.value as typeof type)} className={inputClass} aria-label="Type">
            <option value="all">All types</option>
            <option value="invoice">Invoices</option>
            <option value="quotation">Quotations</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            className={inputClass + " capitalize"}
            aria-label="Status"
          >
            <option value="all">All statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <div className="flex min-w-0 items-center gap-1 sm:col-span-2">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass + " min-w-0"} aria-label="From date" />
            <span className="text-slate-400">–</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass + " min-w-0"} aria-label="To date" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">
            {docs.length === 0 ? "No documents yet. Create your first invoice!" : "Nothing matches your filters."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="py-2 pr-2">Number</th>
                  <th className="py-2 pr-2">Client</th>
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2 text-right">Total</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => {
                  const st = effectiveStatus(d);
                  return (
                    <tr key={d.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2 pr-2">
                        <Link href={`/documents/${d.id}`} className="font-semibold text-indigo-700 hover:underline">
                          {d.number}
                        </Link>{" "}
                        <TypeBadge type={d.type} />
                      </td>
                      <td className="max-w-[220px] truncate py-2 pr-2">{d.client.name}</td>
                      <td className="py-2 pr-2 tabular-nums">{formatDateShort(d.issueDate)}</td>
                      <td className="py-2 pr-2 text-right tabular-nums">
                        {money(docTotal(d))} {d.currency}
                      </td>
                      <td className="py-2 pr-2">
                        <div className="flex items-center gap-2">
                          <StatusBadge status={st} />
                          <select
                            value={d.status}
                            onChange={(e) => changeStatus(d, e.target.value as DocStatus)}
                            className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs capitalize"
                            aria-label={`Change status of ${d.number}`}
                          >
                            {(d.type === "invoice" ? INVOICE_STATUSES : QUOTATION_STATUSES).map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="py-2 text-right">
                        <div className="flex justify-end gap-1">
                          <Button className="px-2 py-1 text-xs" onClick={() => router.push(`/documents/${d.id}`)}>
                            Edit
                          </Button>
                          <Button className="px-2 py-1 text-xs" onClick={() => router.push(`/new?from=${d.id}`)}>
                            Duplicate
                          </Button>
                          <Button className="px-2 py-1 text-xs" disabled={busyId === d.id} onClick={() => download(d)}>
                            {busyId === d.id ? "…" : "PDF"}
                          </Button>
                          <Button variant="danger" className="px-2 py-1 text-xs" onClick={() => remove(d)}>
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-slate-500">
          Showing {filtered.length} of {docs.length}. “Sent” invoices past their due date show as overdue automatically.
        </p>
      </Card>
    </div>
  );
}
