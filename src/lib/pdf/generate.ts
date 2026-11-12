/**
 * generate.ts — turns a document into a PDF file (Blob) in the browser.
 *
 * @react-pdf/renderer is loaded with `await import(...)` so it never runs on
 * the server. This avoids "window is not defined" and hydration errors.
 */
import { createElement } from "react";
import type { AppDocument, Settings } from "../types";
import { calculateTotals } from "../calc";
import { amountToWords } from "../numberToWords";
import { safeFileName } from "../format";
import type { PdfProps } from "./shared";

/** Logo/seal: uploaded image from Settings, otherwise the files in /public/assets. */
export function imageSources(settings: Settings) {
  const origin = window.location.origin;
  return {
    logoSrc: settings.logoDataUrl || `${origin}/assets/logo.png`,
    sealSrc: settings.sealDataUrl || `${origin}/assets/seal.png`,
  };
}

export async function renderPdfBlob(doc: AppDocument, settings: Settings): Promise<Blob> {
  const [{ pdf }, { registerFonts }, { InvoicePdf }, { QuotationPdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("./fonts"),
    import("./InvoicePdf"),
    import("./QuotationPdf"),
  ]);
  registerFonts();

  const totals = calculateTotals(doc.items, doc.discountType, doc.discountValue, doc.taxRate);
  const props: PdfProps = {
    doc,
    settings,
    totals,
    amountInWords: amountToWords(totals.total, doc.currency),
    ...imageSources(settings),
  };
  const Template = doc.type === "invoice" ? InvoicePdf : QuotationPdf;
  // createElement(...) is the same as <Template {...props} /> (this file is .ts, not .tsx)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return pdf(createElement(Template, props) as any).toBlob();
}

/** "INV-0001_Allied_Energy_LLC.pdf" */
export function pdfFileName(doc: AppDocument): string {
  const number = doc.number || (doc.type === "invoice" ? "INVOICE-DRAFT" : "QUOTATION-DRAFT");
  return `${number}_${safeFileName(doc.client.name)}.pdf`;
}

export async function downloadPdf(doc: AppDocument, settings: Settings) {
  const blob = await renderPdfBlob(doc, settings);
  const { triggerDownload } = await import("../backup");
  triggerDownload(blob, pdfFileName(doc));
}
