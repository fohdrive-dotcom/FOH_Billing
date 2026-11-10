/**
 * docActions.ts — business actions on documents (duplicate, convert, status).
 */
import type { AppDocument, DocStatus } from "./types";
import { repo } from "./storage";
import { addDays, todayISO, uid } from "./format";
import { calculateTotals } from "./calc";

/** "sent" invoices past their due date are shown as "overdue" automatically. */
export function effectiveStatus(doc: AppDocument): DocStatus {
  if (doc.type === "invoice" && doc.status === "sent" && doc.dueDate && doc.dueDate < todayISO()) {
    return "overdue";
  }
  return doc.status;
}

export function docTotal(doc: AppDocument): number {
  return calculateTotals(doc.items, doc.discountType, doc.discountValue).total;
}

/** A fresh, unsaved copy (new id, no number, today's date, draft). */
export function copyOf(source: AppDocument): AppDocument {
  const now = new Date().toISOString();
  const today = todayISO();
  const gap = (from: string, to: string) =>
    from && to ? Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) : 0;
  return {
    ...structuredClone(source),
    id: uid(),
    number: "",
    status: "draft",
    issueDate: today,
    dueDate: source.dueDate ? addDays(today, gap(source.issueDate, source.dueDate)) : "",
    validUntil: source.validUntil ? addDays(today, gap(source.issueDate, source.validUntil)) : "",
    items: source.items.map((it) => ({ ...it, id: uid() })),
    convertedFromId: undefined,
    convertedToId: undefined,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Quotation -> Invoice in one click.
 * Creates and saves a new invoice with the next invoice number,
 * and marks the quotation as "accepted". Returns the new invoice.
 */
export async function convertQuotationToInvoice(quotation: AppDocument): Promise<AppDocument> {
  const settings = await repo.getSettings();
  const base = copyOf(quotation);
  const invoice: AppDocument = {
    ...base,
    type: "invoice",
    number: await repo.allocateNumber("invoice"),
    status: "draft",
    dueDate: addDays(base.issueDate, settings.paymentDays),
    validUntil: "",
    taxRate: settings.invoiceTaxRate, // quotations are usually excl. VAT; invoices add it
    terms: settings.invoiceTerms,
    notes: settings.invoiceNotes,
    convertedFromId: quotation.id,
  };
  await repo.saveDocument(invoice);
  await repo.saveDocument({ ...quotation, status: "accepted", convertedToId: invoice.id });
  return invoice;
}
