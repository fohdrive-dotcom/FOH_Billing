/**
 * defaults.ts — the starting settings for a brand-new install.
 * All of these can be changed later on the /settings page (stored in the browser).
 *
 * The values below were taken from your sample INVOICE.pdf / QUOTATION.pdf.
 */
import type { AppDocument, DocType, Settings } from "./types";
import { addDays, todayISO, uid } from "./format";

export const DEFAULT_SETTINGS: Settings = {
  business: {
    name: "FOH MEDIA & EVENTS - L.L.C",
    // TODO: replace this — your quotation says "Shabia 09, Abu Dhabi" but the invoice says "Shabia, ME9, Musaffah". Pick one.
    address: "Shabia, ME9, Musaffah\nAbu Dhabi, UAE",
    phone: "+971 56 240 0780 / +971 50 964 1243",
    email: "fohmediaproduction@gmail.com",
    email2: "info@fohmedia.ae",
    website: "", // TODO: replace this — e.g. www.fohmedia.ae
    taxNumber: "105307937000003",
    tagline: "Media Production, Event Management, Creative Solutions",
  },
  bank: {
    beneficiary: "FOH Media and Events LLC",
    bankName: "Abu Dhabi Commercial Bank (ADCB)",
    branch: "Abu Dhabi Main Branch",
    accountNumber: "14571760920001",
    iban: "AE610030014571760920001",
    swift: "", // TODO: replace this — ADCB SWIFT is usually ADCBAEAA, please confirm with your bank
  },
  currency: "AED",
  invoiceTaxRate: 5,
  // Your quotation terms say "All prices quoted are exclusive of VAT", so quotations default to 0% VAT.
  quotationTaxRate: 0,
  invoicePrefix: "INV-", // change to "FOH-" if you prefer your old style
  quotationPrefix: "QT-",
  nextInvoiceNumber: 1,
  nextQuotationNumber: 1,
  numberPadding: 4,
  paymentDays: 0,
  validityDays: 5,
  invoiceTerms: "Full payment is required upon completion of the work.",
  quotationTerms: [
    "Payment: 50% advance upon order confirmation; the remaining 50% is payable immediately after the event.",
    "Additional Services: Any additional requirements or services not included in this quotation will be charged separately.",
    "Scope: Services will be provided as specified in the quotation. Any changes to the agreed scope may incur additional charges.",
    "VAT: All prices quoted are exclusive of VAT. VAT will be charged additionally as applicable.",
  ].join("\n"),
  invoiceNotes: "",
  quotationNotes: "",
  signatoryName: "FOH Media & Events LLC", // TODO: replace this — e.g. your name
  signatoryTitle: "", // TODO: replace this — e.g. "Managing Director"
  logoDataUrl: "",
  sealDataUrl: "",
  quotationShowUnitPrice: false,
};

/** Builds an empty document pre-filled from settings. */
export function newDocument(type: DocType, settings: Settings): AppDocument {
  const today = todayISO();
  const now = new Date().toISOString();
  return {
    id: uid(),
    type,
    number: "", // assigned when first saved (so opening /new never "uses up" a number)
    status: "draft",
    issueDate: today,
    dueDate: type === "invoice" ? addDays(today, settings.paymentDays) : "",
    validUntil: type === "quotation" ? addDays(today, settings.validityDays) : "",
    client: { name: "", address: "", email: "", phone: "", taxNumber: "" },
    items: [{ id: uid(), title: "", description: "", quantity: 1, unit: "Crew", unitPrice: 0, days: 1 }],
    discountType: "amount",
    discountValue: 0,
    taxRate: type === "invoice" ? settings.invoiceTaxRate : settings.quotationTaxRate,
    currency: settings.currency,
    notes: type === "invoice" ? settings.invoiceNotes : settings.quotationNotes,
    terms: type === "invoice" ? settings.invoiceTerms : settings.quotationTerms,
    showSeal: true,
    showDays: false,
    createdAt: now,
    updatedAt: now,
  };
}
