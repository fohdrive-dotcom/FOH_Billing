/**
 * sheetSettings.ts — maps the Google Sheet "Settings" table to the app's
 * Settings object and back.
 *
 * Sheet layout (column A = setting name, column B = value):
 *   business.name | FOH MEDIA & EVENTS - L.L.C
 *   bank.iban     | AE61...
 *   currency      | AED
 *   ...
 *
 * To sync another setting, add it to SHEET_FIELDS.
 */
import type { Settings } from "./types";

type SheetRow = Record<string, string>;
type Kind = "text" | "number" | "boolean";

/** Every setting kept in the sheet (logo/seal images are NOT synced — too big for a cell). */
export const SHEET_FIELDS: { key: string; kind: Kind }[] = [
  { key: "business.name", kind: "text" },
  { key: "business.address", kind: "text" },
  { key: "business.phone", kind: "text" },
  { key: "business.email", kind: "text" },
  { key: "business.email2", kind: "text" },
  { key: "business.website", kind: "text" },
  { key: "business.taxNumber", kind: "text" },
  { key: "business.tagline", kind: "text" },
  { key: "bank.beneficiary", kind: "text" },
  { key: "bank.bankName", kind: "text" },
  { key: "bank.branch", kind: "text" },
  { key: "bank.accountNumber", kind: "text" },
  { key: "bank.iban", kind: "text" },
  { key: "bank.swift", kind: "text" },
  { key: "currency", kind: "text" },
  { key: "invoiceTaxRate", kind: "number" },
  { key: "quotationTaxRate", kind: "number" },
  { key: "invoicePrefix", kind: "text" },
  { key: "quotationPrefix", kind: "text" },
  { key: "nextInvoiceNumber", kind: "number" },
  { key: "nextQuotationNumber", kind: "number" },
  { key: "numberPadding", kind: "number" },
  { key: "paymentDays", kind: "number" },
  { key: "validityDays", kind: "number" },
  { key: "invoiceTerms", kind: "text" },
  { key: "quotationTerms", kind: "text" },
  { key: "invoiceNotes", kind: "text" },
  { key: "quotationNotes", kind: "text" },
  { key: "signatoryName", kind: "text" },
  { key: "signatoryTitle", kind: "text" },
  { key: "quotationShowUnitPrice", kind: "boolean" },
];

/** Reads "business.name" style paths from the settings object. */
function getPath(s: Settings, key: string): unknown {
  return key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], s);
}

function setPath(s: Settings, key: string, value: unknown) {
  const parts = key.split(".");
  let o = s as unknown as Record<string, unknown>;
  for (const p of parts.slice(0, -1)) o = (o[p] ??= {}) as Record<string, unknown>;
  o[parts[parts.length - 1]] = value;
}

/** Settings -> { "business.name": "...", ... } for writing to the sheet. */
export function settingsToSheet(s: Settings): SheetRow {
  return Object.fromEntries(
    SHEET_FIELDS.map(({ key, kind }) => {
      const v = getPath(s, key);
      return [key, kind === "boolean" ? (v ? "TRUE" : "FALSE") : String(v ?? "")];
    }),
  );
}

/**
 * Applies sheet values on top of the current settings.
 * - Text: copied as-is (an empty cell clears the setting).
 * - Numbers/booleans: only applied when the cell holds a valid value.
 * - Rows missing from the sheet are left unchanged.
 */
export function applySheetToSettings(current: Settings, row: SheetRow): Settings {
  const next: Settings = structuredClone(current);
  for (const { key, kind } of SHEET_FIELDS) {
    if (!(key in row)) continue;
    const raw = String(row[key] ?? "").trim();
    if (kind === "text") {
      setPath(next, key, key === "currency" ? raw.toUpperCase() : raw);
    } else if (kind === "number") {
      const n = Number(raw);
      if (raw !== "" && Number.isFinite(n)) setPath(next, key, n);
    } else {
      // Accepts TRUE/FALSE, yes/no, 1/0 — and ignores trailing notes like "FALSE- ...".
      const m = raw.toLowerCase().match(/^(true|false|yes|no|1|0)/);
      if (m) setPath(next, key, ["true", "yes", "1"].includes(m[1]));
    }
  }
  return next;
}

/** True when the sheet would change any synced setting. */
export function sheetDiffers(current: Settings, row: SheetRow): boolean {
  const next = applySheetToSettings(current, row);
  return SHEET_FIELDS.some(({ key }) => getPath(next, key) !== getPath(current, key));
}

/** Browser helpers — they call our own API route, which talks to Google. */
export async function fetchSheetSettings(): Promise<SheetRow> {
  const res = await fetch("/api/sheet-settings", { cache: "no-store" });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Could not load settings from Google Sheet.");
  return data.settings as SheetRow;
}

export async function pushSheetSettings(s: Settings): Promise<void> {
  const res = await fetch("/api/sheet-settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings: settingsToSheet(s) }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || "Could not save settings to Google Sheet.");
}
