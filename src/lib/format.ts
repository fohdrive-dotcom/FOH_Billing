/**
 * format.ts — small helpers for ids, dates and money.
 */

/** Random unique id (works in every modern browser). */
export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Today as "YYYY-MM-DD" in the user's local timezone. */
export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Adds days to a "YYYY-MM-DD" (or full ISO) date. */
export function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const date = new Date(y, m - 1, d + (Number.isFinite(days) ? days : 0));
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-11-09" -> "November 09, 2026" (quotation style) */
export function formatDateLong(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${MONTHS[Number(m) - 1]} ${d}, ${y}`;
}

/** "2026-11-09" -> "09/11/2026" (invoice style) */
export function formatDateShort(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

/** 1234.5 -> "1,234.50" */
export function money(n: number): string {
  const value = Number.isFinite(n) ? n : 0;
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Removes characters that are not allowed in file names. */
export function safeFileName(s: string): string {
  return s.replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "_").slice(0, 60) || "Client";
}
