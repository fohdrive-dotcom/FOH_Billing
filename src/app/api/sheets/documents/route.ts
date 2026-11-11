/**
 * /api/sheets/documents
 *
 *   GET ?type=invoice|quotation         → { documents: AppDocument[] }
 *   GET ?id=<docId>                     → { document: AppDocument }
 *   POST { document: AppDocument }      → { document: AppDocument }
 *   DELETE ?id=<docId>                  → { ok: true }
 */
import { connection } from "next/server";
import { callScript } from "@/lib/server/googleScript";
import type { AppDocument } from "@/lib/types";

const fail = (error: string, status = 502) =>
  Response.json({ error }, { status });

/** Fetches all documents of one type from the script. */
async function fetchDocs(type: "invoice" | "quotation"): Promise<AppDocument[]> {
  const data = await callScript({ action: "getDocuments", type });
  return ((data.documents ?? []) as AppDocument[]).map((d) => ({
    ...d,
    type,
    showDays: d.showDays ?? false,
  }));
}

export async function GET(request: Request) {
  await connection();
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  const type = params.get("type") as "invoice" | "quotation" | null;

  try {
    if (id) {
      // Single doc lookup — try invoice then quotation.
      const invDocs = await fetchDocs("invoice");
      const found = invDocs.find((d) => d.id === id || (d as unknown as Record<string, string>).documentId === id);
      if (found) return Response.json({ document: found });

      const quotDocs = await fetchDocs("quotation");
      const found2 = quotDocs.find((d) => d.id === id || (d as unknown as Record<string, string>).documentId === id);
      return Response.json({ document: found2 ?? null });
    }

    if (!type || (type !== "invoice" && type !== "quotation")) {
      return fail("?type= must be invoice or quotation", 400);
    }
    const docs = await fetchDocs(type);
    return Response.json({ documents: docs });
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export async function POST(request: Request) {
  let body: { document?: AppDocument };
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }

  const doc = body.document;
  if (!doc?.number) return fail("document.number is required.", 400);

  try {
    const data = await callScript({ action: "saveDocument", document: doc });
    return Response.json({ document: data.document as AppDocument });
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export async function DELETE(request: Request) {
  const params = new URL(request.url).searchParams;
  const id = params.get("id");
  if (!id) return fail("?id= is required.", 400);

  try {
    // Try invoice first, fall back to quotation.
    for (const type of ["invoice", "quotation"] as const) {
      try {
        await callScript({ action: "deleteDocument", documentId: id, type });
        return Response.json({ ok: true });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (!msg.includes("not found")) throw e;
        // not in this sheet — try next
      }
    }
    return fail(`Document ${id} not found.`, 404);
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}
