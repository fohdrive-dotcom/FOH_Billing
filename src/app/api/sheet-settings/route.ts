/**
 * /api/sheet-settings — server-side bridge to the Google Apps Script web app.
 * Keeps the script URL and API key out of the browser (they live in .env.local).
 *
 *   GET  -> { ok: true, settings: { "business.name": "...", ... } }   (flat keys, string values)
 *   POST { settings: { "business.name": "..." } } -> { ok: true }
 *
 * The Apps Script expects:  POST { apiKey, action: "get" }
 *                       or  POST { apiKey, action: "update", updates: { "business.name": "..." } }
 * and answers               { success, settings?, error? }
 */
import { connection } from "next/server";
import { SHEET_FIELDS } from "@/lib/sheetSettings";

function scriptUrl(): string | null {
  if (process.env.GOOGLE_SCRIPT_URL) return process.env.GOOGLE_SCRIPT_URL;
  const id = process.env.GOOGLE_SCRIPT_DEPLOYMENT_ID;
  return id ? `https://script.google.com/macros/s/${id}/exec` : null;
}

const fail = (error: string, status = 502) => Response.json({ ok: false, error }, { status });

/** Calls the Apps Script. It replies with a redirect; fetch follows it to the JSON result. */
async function callScript(payload: Record<string, unknown>) {
  const url = scriptUrl();
  if (!url) throw new Error("GOOGLE_SCRIPT_URL is not set in .env.local");
  const apiKey = process.env.GOOGLE_SCRIPT_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_SCRIPT_API_KEY is not set in .env.local");

  const res = await fetch(url, {
    method: "POST",
    // text/plain avoids Apps Script CORS/preflight quirks; the script parses the JSON itself.
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ apiKey, ...payload }),
    cache: "no-store",
  });
  const text = await res.text();

  let data: { success?: boolean; settings?: unknown; error?: string };
  try {
    data = JSON.parse(text);
  } catch {
    if (text.includes("accounts.google.com") || /accessdenied|تم رفض الدخول|access denied/i.test(text)) {
      throw new Error(
        'Google blocked access to the script. In Apps Script: Deploy → Manage deployments → Edit → "Execute as: Me" and "Who has access: Anyone", then Deploy.',
      );
    }
    // Apps Script error pages contain the script's error text (e.g. "TypeError: ... (line 5, file Code)").
    const scriptError = text
      .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, "\n")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .split("\n")
      .map((l) => l.trim())
      .find((l) => /error/i.test(l));
    throw new Error(
      scriptError ? `Apps Script error: ${scriptError}` : `Apps Script did not return JSON (HTTP ${res.status}).`,
    );
  }
  if (!data.success) {
    const msg = data.error || "Apps Script returned an error.";
    throw new Error(
      msg === "Unauthorized access" ? "Apps Script rejected the API key — API_KEY in the script must match GOOGLE_SCRIPT_API_KEY." : msg,
    );
  }
  return data;
}

/** { business: { name: "x" }, currency: "AED" } -> { "business.name": "x", currency: "AED" } */
function flatten(obj: unknown, prefix = "", out: Record<string, string> = {}) {
  if (obj && typeof obj === "object" && !Array.isArray(obj)) {
    for (const [k, v] of Object.entries(obj)) flatten(v, prefix ? `${prefix}.${k}` : k, out);
  } else if (prefix) {
    out[prefix] = obj == null ? "" : String(obj);
  }
  return out;
}

export async function GET() {
  await connection(); // always run at request time, never prerender
  try {
    const data = await callScript({ action: "get" });
    return Response.json({ ok: true, settings: flatten(data.settings ?? {}) });
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }
  // Forward known setting keys with correct types: the script validates that
  // number keys are numbers and boolean keys are actual booleans (not strings).
  const input = (body as { settings?: Record<string, unknown> })?.settings ?? {};
  const updates: Record<string, string | number | boolean> = {};
  for (const { key, kind } of SHEET_FIELDS) {
    if (!(key in input)) continue;
    const raw = input[key];
    if (kind === "boolean") {
      // Accept true/false, "true"/"false", "TRUE"/"FALSE", 1/0
      updates[key] = raw === true || String(raw).toLowerCase() === "true";
    } else if (kind === "number") {
      updates[key] = Number(raw);
    } else {
      updates[key] = String(raw ?? "");
    }
  }

  try {
    await callScript({ action: "update", updates });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}
