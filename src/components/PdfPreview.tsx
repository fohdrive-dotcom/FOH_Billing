"use client";
/**
 * PdfPreview.tsx — live preview of the PDF, showing only the pages.
 *
 * Every time the document changes we wait 600 ms (so we don't rebuild on every
 * key press), build the PDF in the browser, then draw each page onto a <canvas>
 * with pdf.js. No browser PDF viewer = no toolbar, sidebar or zoom controls.
 */
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import type { AppDocument, Settings } from "@/lib/types";

/** Loads pdf.js once and points it at its worker file. */
async function loadPdfJs() {
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  }
  return pdfjs;
}

/** Draws every page of `pdf` as a canvas, `width` CSS pixels wide. */
async function renderPages(pdf: PDFDocumentProxy, width: number): Promise<HTMLCanvasElement[]> {
  const ratio = window.devicePixelRatio || 1;
  const canvases: HTMLCanvasElement[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const viewport = page.getViewport({ scale: (width / base.width) * ratio });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.style.width = "100%";
    canvas.style.height = "auto";
    canvas.style.display = "block";
    canvas.className = "rounded-sm bg-white shadow-md";
    await page.render({ canvas, viewport }).promise;
    canvases.push(canvas);
  }
  return canvases;
}

export function PdfPreview({ doc, settings }: { doc: AppDocument; settings: Settings }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [width, setWidth] = useState(0);
  const pagesRef = useRef<HTMLDivElement>(null);

  // Turn the document into a string so the effect only re-runs when content changes.
  const key = JSON.stringify(doc) + JSON.stringify(settings);

  // 1) Build the PDF file whenever the document changes.
  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;
    const timer = setTimeout(async () => {
      setBusy(true);
      try {
        const [{ renderPdfBlob }, pdfjs] = await Promise.all([import("@/lib/pdf/generate"), loadPdfJs()]);
        const blob = await renderPdfBlob(doc, settings);
        const loaded = await pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
        if (cancelled) {
          loaded.loadingTask.destroy();
          return;
        }
        createdUrl = URL.createObjectURL(blob);
        setUrl(createdUrl);
        setPdf((old) => {
          old?.loadingTask.destroy();
          return loaded;
        });
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setBusy(false);
        }
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      // Free memory used by the previous file a bit later (the link may still point to it).
      if (createdUrl) {
        const old = createdUrl;
        setTimeout(() => URL.revokeObjectURL(old), 5000);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // 2) Track the available width so pages fill the column (and stay sharp after resizing).
  useEffect(() => {
    const el = pagesRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.round(entry.contentRect.width));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // 3) Draw the pages. New canvases replace the old ones only when ready, so nothing flickers.
  useEffect(() => {
    if (!pdf || !width || !pagesRef.current) return;
    let cancelled = false;
    renderPages(pdf, width)
      .then((canvases) => {
        if (cancelled || !pagesRef.current) return;
        pagesRef.current.replaceChildren(...canvases);
        setBusy(false);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setBusy(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pdf, width]);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
        <span>{busy ? "Updating preview…" : "Live preview"}</span>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer" className="font-medium text-indigo-700 underline">
            Open in new tab
          </a>
        ) : null}
      </div>
      {error ? (
        <div className="mb-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Could not build the PDF preview: {error}
          <br />
          <span className="text-xs">Check that the logo/seal images are PNG or JPG (see Troubleshooting in README).</span>
        </div>
      ) : null}
      <div className="relative min-h-[70vh] flex-1 overflow-y-auto rounded-md bg-slate-200 p-3">
        {/* pdf.js puts one <canvas> per page in here */}
        <div ref={pagesRef} className="flex flex-col gap-3" />
        {!pdf && !error ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
            Building preview…
          </div>
        ) : null}
      </div>
    </div>
  );
}
