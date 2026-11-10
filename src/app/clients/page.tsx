"use client";
/**
 * /clients — add, edit, search and delete saved clients.
 */
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema, type ClientFormValues } from "@/lib/schema";
import type { Client } from "@/lib/types";
import { repo } from "@/lib/storage";
import { uid } from "@/lib/format";
import { Button, Card, Field, Loading, PageHeader, inputClass } from "@/components/ui";

const EMPTY: ClientFormValues = { name: "", address: "", email: "", phone: "", taxNumber: "" };

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[] | null>(null);
  const [editing, setEditing] = useState<Client | null>(null); // null = adding a new client
  const [search, setSearch] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({ resolver: zodResolver(clientSchema), defaultValues: EMPTY });

  const load = () => repo.listClients().then(setClients);
  useEffect(() => {
    load();
  }, []);

  function startEdit(c: Client | null) {
    setEditing(c);
    reset(c ? { ...EMPTY, name: c.name, address: c.address ?? "", email: c.email ?? "", phone: c.phone ?? "", taxNumber: c.taxNumber ?? "" } : EMPTY);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const onSubmit = handleSubmit(async (v) => {
    const now = new Date().toISOString();
    await repo.saveClient({ ...v, id: editing?.id ?? uid(), createdAt: editing?.createdAt ?? now, updatedAt: now });
    startEdit(null);
    load();
  });

  async function remove(c: Client) {
    if (!confirm(`Delete client "${c.name}"? Existing documents keep their copy of the details.`)) return;
    await repo.deleteClient(c.id);
    if (editing?.id === c.id) startEdit(null);
    load();
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (clients ?? []).filter((c) => !q || `${c.name} ${c.email} ${c.phone} ${c.taxNumber}`.toLowerCase().includes(q));
  }, [clients, search]);

  if (!clients) return <Loading />;

  return (
    <div>
      <PageHeader title="Clients" />
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Card title={editing ? `Edit ${editing.name}` : "Add a client"}>
          <form onSubmit={onSubmit} noValidate className="space-y-4">
            <Field label="Name *" error={errors.name?.message}>
              <input {...register("name")} className={inputClass} aria-invalid={!!errors.name} />
            </Field>
            <Field label="Address">
              <textarea {...register("address")} rows={2} className={inputClass} />
            </Field>
            <Field label="Email (optional)" error={errors.email?.message}>
              <input type="email" {...register("email")} className={inputClass} aria-invalid={!!errors.email} />
            </Field>
            <Field label="Phone (optional)">
              <input type="tel" {...register("phone")} className={inputClass} />
            </Field>
            <Field label="Tax number / TRN (optional)">
              <input {...register("taxNumber")} className={inputClass} />
            </Field>
            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={isSubmitting}>
                {editing ? "Update client" : "Add client"}
              </Button>
              {editing ? <Button onClick={() => startEdit(null)}>Cancel</Button> : null}
            </div>
          </form>
        </Card>

        <Card title={`Saved clients (${clients.length})`}>
          <input
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={inputClass + " mb-4"}
            aria-label="Search clients"
          />
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              {clients.length ? "No match." : "No clients yet. Add one on the left, or use “Save to client list” in a document."}
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((c) => (
                <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                  <div className="min-w-0 text-sm">
                    <p className="font-semibold">{c.name}</p>
                    <p className="text-slate-500">
                      {[c.email, c.phone, c.taxNumber && `TRN ${c.taxNumber}`].filter(Boolean).join(" · ") || "—"}
                    </p>
                    {c.address ? <p className="whitespace-pre-line text-xs text-slate-500">{c.address}</p> : null}
                  </div>
                  <div className="flex gap-1">
                    <Button className="px-2 py-1 text-xs" onClick={() => startEdit(c)}>
                      Edit
                    </Button>
                    <Button variant="danger" className="px-2 py-1 text-xs" onClick={() => remove(c)}>
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
