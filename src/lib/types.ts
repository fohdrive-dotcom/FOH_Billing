/**
 * types.ts — the "shape" of every piece of data in the app.
 *
 * If you ever move to Supabase / Prisma, these types become your table columns.
 */

export type DocType = "invoice" | "quotation";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";
export type QuotationStatus = "draft" | "sent" | "accepted" | "rejected";
export type DocStatus = InvoiceStatus | QuotationStatus;

export const INVOICE_STATUSES: InvoiceStatus[] = ["draft", "sent", "paid", "overdue"];
export const QUOTATION_STATUSES: QuotationStatus[] = ["draft", "sent", "accepted", "rejected"];

export function statusesFor(type: DocType): DocStatus[] {
  return type === "invoice" ? INVOICE_STATUSES : QUOTATION_STATUSES;
}

/** One row of the items table. */
export interface LineItem {
  id: string;
  /** Bold first line, e.g. "Videography" (optional). */
  title: string;
  /** Normal text under the title, e.g. "Videography With Editing - ADIPEC 2026". */
  description: string;
  quantity: number;
  /** Unit label shown after the quantity, e.g. "Crew", "Day", "Pcs". */
  unit: string;
  unitPrice: number;
  /** Optional number of days — used when the document has showDays = true. */
  days?: number;
}

/** Client details as printed on a document. */
export interface ClientInfo {
  name: string;
  address: string;
  email: string;
  phone: string;
  taxNumber: string;
}

/** A saved client (address book entry). */
export interface Client extends ClientInfo {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export type DiscountType = "amount" | "percent";

/** An invoice or a quotation. */
export interface AppDocument {
  id: string;
  type: DocType;
  /** e.g. INV-0001 / QT-0001 */
  number: string;
  status: DocStatus;
  /** Dates are stored as "YYYY-MM-DD" strings (easy to sort, no timezone bugs). */
  issueDate: string;
  /** Invoices only. */
  dueDate: string;
  /** Quotations only. */
  validUntil: string;
  client: ClientInfo;
  clientId?: string;
  items: LineItem[];
  discountType: DiscountType;
  discountValue: number;
  /** Percentage, e.g. 5 for 5% */
  taxRate: number;
  currency: string;
  notes: string;
  /** One term per line. */
  terms: string;
  showSeal: boolean;
  /** Whether the "No of Days" column is active for this document. */
  showDays: boolean;
  /** When true: "No of Crew" becomes "Quantity" and campaign dates are shown. */
  isDigitalMarketing: boolean;
  /** Campaign start date (Digital Marketing mode only), "YYYY-MM-DD". */
  campaignStartDate?: string;
  /** Campaign end date (Digital Marketing mode only), "YYYY-MM-DD". */
  campaignEndDate?: string;
  /** Set when an invoice was created from a quotation. */
  convertedFromId?: string;
  /** Set on a quotation after it was converted. */
  convertedToId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessDetails {
  name: string;
  address: string; // multi-line allowed
  phone: string;
  email: string;
  email2: string;
  website: string;
  taxNumber: string; // TRN
  tagline: string; // printed in the invoice footer bar
}

export interface BankDetails {
  beneficiary: string;
  bankName: string;
  branch: string;
  accountNumber: string;
  iban: string;
  swift: string;
}

export interface Settings {
  business: BusinessDetails;
  bank: BankDetails;
  currency: string;
  invoiceTaxRate: number;
  quotationTaxRate: number;
  invoicePrefix: string;
  quotationPrefix: string;
  nextInvoiceNumber: number;
  nextQuotationNumber: number;
  /** How many digits: 4 -> 0001 */
  numberPadding: number;
  /** Days added to issue date for invoice due date. */
  paymentDays: number;
  /** Days added to issue date for quotation validity. */
  validityDays: number;
  invoiceTerms: string;
  quotationTerms: string;
  invoiceNotes: string;
  quotationNotes: string;
  signatoryName: string;
  signatoryTitle: string;
  /** Uploaded replacement images (data URLs). Empty = use /public/assets files. */
  logoDataUrl: string;
  sealDataUrl: string;
  /** The quotation template has no Unit Price column; turn this on to add one. */
  quotationShowUnitPrice: boolean;
}

/** Everything in the app, used for JSON backup / restore. */
export interface BackupData {
  app: "foh-billing";
  version: 1;
  exportedAt: string;
  settings: Settings;
  documents: AppDocument[];
  clients: Client[];
}
