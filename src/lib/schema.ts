/**
 * schema.ts — validation rules (Zod). React Hook Form uses these to show
 * error messages under each field.
 */
import { z } from "zod";

const money = (label: string) =>
  z
    .number({ error: `${label} must be a number` })
    .min(0, `${label} cannot be negative`)
    .max(1_000_000_000, `${label} is too large`);

export const lineItemSchema = z.object({
  id: z.string(),
  title: z.string().max(120, "Title is too long"),
  description: z.string().max(1000, "Description is too long"),
  quantity: z
    .number({ error: "Number of crew must be a number" })
    .gt(0, "Number of crew must be more than 0")
    .max(1_000_000, "Number of crew is too large"),
  unit: z.string().max(20, "Unit is too long"),
  unitPrice: money("Unit price"),
  days: z
    .number({ error: "Number of days must be a number" })
    .min(1, "Days must be at least 1")
    .max(10_000, "Days is too large")
    .optional(),
})
  // At least one of title / description must be filled in.
  .refine((it) => it.title.trim() !== "" || it.description.trim() !== "", {
    message: "Enter a title or description",
    path: ["description"],
  });

export const clientSchema = z.object({
  name: z.string().trim().min(1, "Client name is required").max(150),
  address: z.string().max(500),
  // Optional: leave blank if the client has no email / phone / TRN.
  email: z.string().trim().pipe(z.union([z.literal(""), z.email("Enter a valid email address")])),
  phone: z.string().trim().max(50),
  taxNumber: z.string().trim().max(50),
});

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date");

export const documentFormSchema = z
  .object({
    type: z.enum(["invoice", "quotation"]),
    status: z.string(),
    issueDate: dateString,
    dueDate: z.string(),
    validUntil: z.string(),
    clientId: z.string().optional(),
    client: clientSchema,
    items: z.array(lineItemSchema).min(1, "Add at least one line item"),
    discountType: z.enum(["amount", "percent"]),
    discountValue: money("Discount"),
    taxRate: z
      .number({ error: "VAT rate must be a number" })
      .min(0, "VAT rate cannot be negative")
      .max(100, "VAT rate cannot be more than 100%"),
    currency: z.string().trim().min(1, "Currency is required").max(5),
    notes: z.string().max(2000),
    terms: z.string().max(4000),
    showSeal: z.boolean(),
    showDays: z.boolean(),
    isDigitalMarketing: z.boolean(),
    campaignStartDate: z.string().optional(),
    campaignEndDate: z.string().optional(),
  })
  .refine((d) => !(d.discountType === "percent" && d.discountValue > 100), {
    message: "Discount cannot be more than 100%",
    path: ["discountValue"],
  })
  .refine((d) => d.type !== "invoice" || !d.dueDate || d.dueDate >= d.issueDate, {
    message: "Due date cannot be before the issue date",
    path: ["dueDate"],
  })
  .refine((d) => d.type !== "quotation" || !d.validUntil || d.validUntil >= d.issueDate, {
    message: "Valid-until date cannot be before the issue date",
    path: ["validUntil"],
  });

const wholeNumber = (label: string, min: number, max: number) =>
  z
    .number({ error: `${label} must be a number` })
    .int(`${label} must be a whole number`)
    .min(min, `${label} must be at least ${min}`)
    .max(max, `${label} must be at most ${max}`);

const rate = (label: string) =>
  z.number({ error: `${label} must be a number` }).min(0, `${label} cannot be negative`).max(100, `${label} max is 100`);

export const settingsSchema = z.object({
  business: z.object({
    name: z.string().trim().min(1, "Business name is required"),
    address: z.string(),
    phone: z.string(),
    email: z.union([z.literal(""), z.email("Enter a valid email")]),
    email2: z.union([z.literal(""), z.email("Enter a valid email")]),
    website: z.string(),
    taxNumber: z.string(),
    tagline: z.string(),
  }),
  bank: z.object({
    beneficiary: z.string(),
    bankName: z.string(),
    branch: z.string(),
    accountNumber: z.string(),
    iban: z.string().regex(/^$|^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/, "IBAN looks wrong (no spaces, e.g. AE07...)"),
    swift: z.string().regex(/^$|^[A-Z0-9]{8}([A-Z0-9]{3})?$/, "SWIFT must be 8 or 11 letters/numbers"),
  }),
  currency: z.string().trim().min(1, "Currency is required").max(5),
  invoiceTaxRate: rate("Invoice VAT"),
  quotationTaxRate: rate("Quotation VAT"),
  invoicePrefix: z.string().max(12),
  quotationPrefix: z.string().max(12),
  nextInvoiceNumber: wholeNumber("Next invoice number", 1, 99_999_999),
  nextQuotationNumber: wholeNumber("Next quotation number", 1, 99_999_999),
  numberPadding: wholeNumber("Digits", 1, 8),
  paymentDays: wholeNumber("Payment days", 0, 365),
  validityDays: wholeNumber("Validity days", 0, 365),
  invoiceTerms: z.string(),
  quotationTerms: z.string(),
  invoiceNotes: z.string(),
  quotationNotes: z.string(),
  signatoryName: z.string(),
  signatoryTitle: z.string(),
  logoDataUrl: z.string(),
  sealDataUrl: z.string(),
  quotationShowUnitPrice: z.boolean(),
});

export type DocumentFormValues = z.infer<typeof documentFormSchema>;
export type SettingsFormValues = z.infer<typeof settingsSchema>;
export type ClientFormValues = z.infer<typeof clientSchema>;
