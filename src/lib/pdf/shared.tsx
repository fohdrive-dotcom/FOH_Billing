/**
 * shared.tsx — pieces used by both PDF templates.
 */
import type { AppDocument, Settings } from "../types";
import type { Totals } from "../calc";

/** Everything a PDF template needs to draw itself. */
export interface PdfProps {
  doc: AppDocument;
  settings: Settings;
  totals: Totals;
  amountInWords: string;
  /** Image sources (absolute URL or data: URL). */
  logoSrc: string;
  sealSrc: string;
}

// Colours measured from your sample PDFs.
export const COLORS = {
  navy: "#2E3F8E", // quotation table header / total bar
  gradientLight: "#8B94CB", // left end of the "QUOTATION" bar
  gradientDark: "#283A8C", // right end of the "QUOTATION" bar
  text: "#111111",
  muted: "#333333",
  border: "#000000",
};

/** "Line 1\nLine 2" -> ["Line 1", "Line 2"] without empty lines. */
export function lines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

/** "1" + "Crew" -> "1 Crew" ; 2.5 -> "2.5" */
export function qtyLabel(qty: number, unit: string): string {
  const q = Number.isInteger(qty) ? String(qty) : String(Math.round(qty * 1000) / 1000);
  return unit ? `${q} ${unit}` : q;
}
