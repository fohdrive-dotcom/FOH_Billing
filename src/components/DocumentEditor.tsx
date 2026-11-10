"use client";
/**
 * DocumentEditor.tsx — the main invoice / quotation form with live totals
 * and a live PDF preview. Used by /new and /documents/[id].
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { documentFormSchema, type DocumentFormValues } from "@/lib/schema";
import type { AppDocument, Client, DocStatus, DocType, Settings } from "@/lib/types";
import { statusesFor } from "@/lib/types";
import { repo, formatNumber, invoiceNumberPlaceholder } from "@/lib/storage";
import { calculateTotals, num, VAT_RATE } from "@/lib/calc";
import { amountToWords } from "@/lib/numberToWords";
import { addDays, money, uid } from "@/lib/format";
import { convertQuotationToInvoice } from "@/lib/docActions";
import { LineItemsEditor } from "./LineItemsEditor";
import { PdfPreview } from "./PdfPreview";
import { Button, Card, Field, cx, inputClass } from "./ui";

interface Props {
  initial: AppDocument;
  settings: Settings;
  /** true on /new (not saved yet) */
  isNew: boolean;
}

/** AppDocument -> the values the form edits */
function toFormValues(d: AppDocument): DocumentFormValues {
  return {
    type: d.type,
    status: d.status,
    issueDate: d.issueDate,
    dueDate: d.dueDate,
    validUntil: d.validUntil,
    clientId: d.clientId,
    // Email / phone / TRN are optional — fill in blanks for older records.
    client: {
      name: d.client.name ?? "",
      address: d.client.address ?? "",
      email: d.client.email ?? "",
      phone: d.client.phone ?? "",
      taxNumber: d.client.taxNumber ?? "",
    },
    items: d.items.map((it) => ({ ...it })),
    discountType: d.discountType,
    discountValue: d.discountValue,
    taxRate: VAT_RATE,
    currency: d.currency,
    notes: d.notes,
    terms: d.terms,
    showSeal: d.showSeal,
  };
}

/** form values (possibly half-typed) + the fixed parts -> AppDocument */
function toDocument(base: AppDocument, v: Partial<DocumentFormValues>): AppDocument {
  return {
    ...base,
    ...v,
    status: (v.status ?? base.status) as DocStatus,
    client: { ...base.client, ...v.client },
    items: (v.items ?? base.items).map((it) => ({
      id: it?.id ?? uid(),
      title: it?.title ?? "",
      description: it?.description ?? "",
      unit: it?.unit ?? "",
      quantity: num(it?.quantity),
      unitPrice: num(it?.unitPrice),
    })),
    discountValue: num(v.discountValue),
    taxRate: VAT_RATE,
  };
}

export function DocumentEditor({ initial, settings, isNew }: Props) {
  const router = useRouter();
  // `base` holds the parts the form doesn't edit (id, number, createdAt …)
  const [base, setBase] = useState<AppDocument>(initial);
  const [saved, setSaved] = useState(!isNew);
  const [clients, setClients] = useState<Client[]>([]);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"form" | "preview">("form"); // mobile only

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    trigger,
    reset,
    formState: { errors, isDirty },
  } = useForm<DocumentFormValues>({
    resolver: zodResolver(documentFormSchema),
    defaultValues: toFormValues(initial),
    mode: "onTouched", // show errors after leaving a field
  });

  // Live values for totals + preview.
  const values = useWatch({ control }) as Partial<DocumentFormValues>;
  const type = (values.type ?? initial.type) as DocType;
  const liveDoc = useMemo(() => toDocument(base, values), [base, values]);
  const totals = calculateTotals(liveDoc.items, liveDoc.discountType, liveDoc.discountValue);

  // Number shown before saving = the one that WILL be used.
  const previewNumber =
    base.number ||
    (type === "invoice"
      ? invoiceNumberPlaceholder()
      : formatNumber(settings.quotationPrefix, settings.nextQuotationNumber, settings.numberPadding));
  const previewDoc = useMemo(() => ({ ...liveDoc, number: previewNumber }), [liveDoc, previewNumber]);

  useEffect(() => {
    repo.listClients().then(setClients);
  }, []);

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  function flash(kind: "ok" | "error", text: string) {
    setMessage({ kind, text });
    setTimeout(() => setMessage(null), 4000);
  }

  /** Switching Invoice <-> Quotation on a NEW document resets type-specific defaults. */
  function changeType(next: DocType) {
    const issue = getValues("issueDate");
    setValue("type", next);
    setValue("status", "draft");
    setValue("terms", next === "invoice" ? settings.invoiceTerms : settings.quotationTerms);
    setValue("notes", next === "invoice" ? settings.invoiceNotes : settings.quotationNotes);
    setValue("dueDate", next === "invoice" ? addDays(issue, settings.paymentDays) : "");
    setValue("validUntil", next === "quotation" ? addDays(issue, settings.validityDays) : "");
  }

  function pickClient(id: string) {
    const c = clients.find((x) => x.id === id);
    if (!c) return;
    setValue("clientId", c.id);
    setValue(
      "client",
      {
        name: c.name,
        address: c.address ?? "",
        email: c.email ?? "",
        phone: c.phone ?? "",
        taxNumber: c.taxNumber ?? "",
      },
      { shouldValidate: true, shouldDirty: true },
    );
  }

  async function saveClient() {
    if (!(await trigger("client"))) return flash("error", "Fix the client details first.");
    const c = getValues("client");
    const existing = clients.find((x) => x.id === getValues("clientId"));
    const now = new Date().toISOString();
    const client: Client = { ...c, id: existing?.id ?? uid(), createdAt: existing?.createdAt ?? now, updatedAt: now };
    await repo.saveClient(client);
    setValue("clientId", client.id);
    setClients(await repo.listClients());
    flash("ok", existing ? "Client updated." : "Client saved to your list.");
  }

  /** Validates, assigns a number if needed, saves. Returns the saved document. */
  async function save(v: DocumentFormValues): Promise<AppDocument> {
    const number = base.number || (await repo.allocateNumber(v.type));
    const doc = toDocument({ ...base, number }, v);
    await repo.saveDocument(doc);
    setBase(doc);
    setSaved(true);
    reset(v); // marks the form as "not dirty"
    if (isNew) router.replace(`/documents/${doc.id}`, { scroll: false });
    return doc;
  }

  const onSave = handleSubmit(
    async (v) => {
      setBusy(true);
      try {
        const doc = await save(v);
        flash("ok", `Saved ${doc.number}.`);
      } catch (e) {
        flash("error", `Save failed: ${e instanceof Error ? e.message : e}`);
      } finally {
        setBusy(false);
      }
    },
    () => flash("error", "Please fix the highlighted fields."),
  );

  const onSaveAndDownload = handleSubmit(
    async (v) => {
      setBusy(true);
      try {
        const doc = await save(v);
        const { downloadPdf } = await import("@/lib/pdf/generate");
        await downloadPdf(doc, settings);
        flash("ok", `Saved and downloaded ${doc.number}.`);
      } catch (e) {
        flash("error", `Download failed: ${e instanceof Error ? e.message : e}`);
      } finally {
        setBusy(false);
      }
    },
    () => flash("error", "Please fix the highlighted fields."),
  );

  async function onConvert() {
    if (isDirty) return flash("error", "Save your changes first.");
    if (!confirm("Create a new invoice from this quotation?")) return;
    const invoice = await convertQuotationToInvoice(base);
    router.push(`/documents/${invoice.id}`);
  }

  async function onDelete() {
    if (!confirm(`Delete ${base.number}? This cannot be undone.`)) return;
    await repo.deleteDocument(base.id);
    router.push("/documents");
  }

  const statuses = statusesFor(type);
  const words = amountToWords(totals.total, liveDoc.currency);

  return (
    <div>
      {/* ===== Top bar ===== */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isNew && !saved ? "New " : ""}
            {type === "invoice" ? "Invoice" : "Quotation"}{" "}
            <span className="text-slate-500">{previewNumber}</span>
          </h1>
          {!base.number ? (
            <p className="text-xs text-slate-500">The number is reserved when you first save.</p>
          ) : null}
          {base.convertedToId ? (
            <a className="text-xs text-indigo-700 underline" href={`/documents/${base.convertedToId}`}>
              Converted to invoice →
            </a>
          ) : null}
          {base.convertedFromId ? (
            <a className="text-xs text-indigo-700 underline" href={`/documents/${base.convertedFromId}`}>
              ← Created from quotation
            </a>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {saved ? (
            <>
              {type === "quotation" ? (
                <Button onClick={onConvert} disabled={busy}>
                  Convert to invoice
                </Button>
              ) : null}
              <Button onClick={() => router.push(`/new?from=${base.id}`)}>Duplicate</Button>
              <Button variant="danger" onClick={onDelete}>
                Delete
              </Button>
            </>
          ) : null}
          <Button onClick={onSave} disabled={busy}>
            Save
          </Button>
          <Button variant="primary" onClick={onSaveAndDownload} disabled={busy}>
            {busy ? "Working…" : "Save & Download PDF"}
          </Button>
        </div>
      </div>

      {message ? (
        <div
          role="status"
          className={cx(
            "mb-4 rounded-md border px-3 py-2 text-sm",
            message.kind === "ok"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-700",
          )}
        >
          {message.text}
        </div>
      ) : null}

      {/* Mobile tabs */}
      <div className="mb-4 grid grid-cols-2 rounded-md border border-slate-300 bg-white p-1 lg:hidden">
        {(["form", "preview"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cx(
              "rounded py-1.5 text-sm font-medium capitalize",
              tab === t ? "bg-indigo-700 text-white" : "text-slate-600",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ===================== FORM ===================== */}
        <form onSubmit={onSave} noValidate className={cx("space-y-5", tab !== "form" && "hidden lg:block")}>
          <Card title="Document">
            {isNew && !saved ? (
              <div className="mb-4 inline-flex rounded-md border border-slate-300 p-1">
                {(["invoice", "quotation"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => changeType(t)}
                    className={cx(
                      "rounded px-4 py-1.5 text-sm font-medium capitalize",
                      type === t ? "bg-indigo-700 text-white" : "text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Issue date" error={errors.issueDate?.message}>
                <input type="date" {...register("issueDate")} className={inputClass} aria-invalid={!!errors.issueDate} />
              </Field>
              {type === "invoice" ? (
                <Field label="Due date" error={errors.dueDate?.message}>
                  <input type="date" {...register("dueDate")} className={inputClass} aria-invalid={!!errors.dueDate} />
                </Field>
              ) : (
                <Field label="Valid until" error={errors.validUntil?.message}>
                  <input
                    type="date"
                    {...register("validUntil")}
                    className={inputClass}
                    aria-invalid={!!errors.validUntil}
                  />
                </Field>
              )}
              <Field label="Status">
                <select {...register("status")} className={inputClass + " capitalize"}>
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>

          <Card
            title="Client"
            actions={
              <Button variant="ghost" className="text-xs" onClick={saveClient}>
                Save to client list
              </Button>
            }
          >
            {clients.length ? (
              <Field label="Pick a saved client" className="mb-4">
                <select
                  className={inputClass}
                  value={values.clientId ?? ""}
                  onChange={(e) => pickClient(e.target.value)}
                >
                  <option value="">— choose —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Client name *" error={errors.client?.name?.message} className="sm:col-span-2">
                <input {...register("client.name")} className={inputClass} aria-invalid={!!errors.client?.name} />
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <textarea {...register("client.address")} rows={2} className={inputClass} />
              </Field>
              <Field label="Email (optional)" error={errors.client?.email?.message}>
                <input
                  type="email"
                  {...register("client.email")}
                  className={inputClass}
                  aria-invalid={!!errors.client?.email}
                />
              </Field>
              <Field label="Phone (optional)">
                <input type="tel" {...register("client.phone")} className={inputClass} />
              </Field>
              <Field label="Tax number / TRN (optional)" className="sm:col-span-2">
                <input {...register("client.taxNumber")} className={inputClass} />
              </Field>
            </div>
          </Card>

          <Card title="Line items">
            <LineItemsEditor control={control} register={register} errors={errors} currency={liveDoc.currency} />
          </Card>

          <Card title="Totals">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Discount" error={errors.discountValue?.message}>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    {...register("discountValue", { valueAsNumber: true })}
                    className={inputClass}
                    aria-invalid={!!errors.discountValue}
                  />
                  <select {...register("discountType")} className={inputClass + " w-24"}>
                    <option value="amount">{liveDoc.currency}</option>
                    <option value="percent">%</option>
                  </select>
                </div>
              </Field>
              <Field label="Currency" error={errors.currency?.message}>
                <input {...register("currency")} className={inputClass + " uppercase"} maxLength={5} />
              </Field>
            </div>

            <dl className="mt-5 space-y-1 rounded-md bg-slate-50 p-4 text-sm tabular-nums">
              <Row label="Subtotal" value={money(totals.subtotal)} />
              {totals.discount > 0 ? <Row label="Discount" value={`− ${money(totals.discount)}`} /> : null}
              <Row label={`VAT (${VAT_RATE}%)`} value={`+ ${money(totals.tax)}`} />
              <div className="flex justify-between border-t border-slate-300 pt-2 text-base font-bold">
                <dt>Grand total</dt>
                <dd>
                  {money(totals.total)} {liveDoc.currency}
                </dd>
              </div>
              <p className="pt-1 text-xs italic text-slate-500">{words}</p>
            </dl>
          </Card>

          <Card title="Notes, terms & seal">
            <div className="space-y-4">
              <Field label="Notes (optional)" error={errors.notes?.message}>
                <textarea {...register("notes")} rows={2} className={inputClass} />
              </Field>
              <Field label="Terms & conditions" hint="One term per line." error={errors.terms?.message}>
                <textarea {...register("terms")} rows={4} className={inputClass} />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register("showSeal")} className="h-4 w-4 accent-indigo-700" />
                Show company seal / stamp on this document
              </label>
            </div>
          </Card>
        </form>

        {/* ===================== PREVIEW ===================== */}
        <div className={cx("lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)]", tab !== "preview" && "hidden lg:block")}>
          <PdfPreview doc={previewDoc} settings={settings} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate-700">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
