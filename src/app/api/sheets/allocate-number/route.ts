/**
 * /api/sheets/allocate-number
 *
 *   POST { type: "invoice" | "quotation" }  →  { number: "INV-0007" }
 *
 * Calls the script's allocateNumber action, which increments the counter in
 * the Settings sheet and returns the formatted number string.
 */
import { callScript } from "@/lib/server/googleScript";

const fail = (error: string, status = 502) =>
  Response.json({ error }, { status });

export async function POST(request: Request) {
  let body: { type?: string };
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }

  const type = body.type;
  if (type !== "invoice" && type !== "quotation") {
    return fail("type must be invoice or quotation.", 400);
  }

  try {
    const data = await callScript({ action: "allocateNumber", type });
    return Response.json({ number: data.number as string });
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}
