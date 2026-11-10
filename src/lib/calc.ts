/**
 * calc.ts — every money calculation lives here, so the form and the PDF
 * always show exactly the same numbers.
 *
 * Order: subtotal -> minus discount -> taxable amount -> plus VAT -> grand total
 */
import type { DiscountType, LineItem } from "./types";

/** Rounds to 2 decimals the way accountants expect (0.005 -> 0.01). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Turns NaN / undefined / text into 0 so half-typed inputs never crash. */
export function num(n: unknown): number {
  const v = typeof n === "number" ? n : parseFloat(String(n ?? ""));
  return Number.isFinite(v) ? v : 0;
}

/** VAT is always 5%, added on top of the amount. */
export const VAT_RATE = 5;

/** The line amount is the unit price as entered; the crew count is only a label. */
export function lineAmount(item: Pick<LineItem, "unitPrice">): number {
  return round2(num(item.unitPrice));
}

export interface Totals {
  subtotal: number;
  discount: number;
  taxable: number;
  tax: number;
  total: number;
}

export function calculateTotals(
  items: Pick<LineItem, "unitPrice">[],
  discountType: DiscountType,
  discountValue: number,
): Totals {
  const taxRate = VAT_RATE;
  const subtotal = round2(items.reduce((sum, it) => sum + lineAmount(it), 0));
  let discount =
    discountType === "percent"
      ? round2((subtotal * num(discountValue)) / 100)
      : round2(num(discountValue));
  discount = Math.min(Math.max(discount, 0), subtotal); // never negative, never more than subtotal
  const taxable = round2(subtotal - discount);
  const tax = round2((taxable * num(taxRate)) / 100);
  const total = round2(taxable + tax);
  return { subtotal, discount, taxable, tax, total };
}
