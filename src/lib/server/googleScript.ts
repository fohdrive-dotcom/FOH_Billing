/**
 * googleScript.ts — server-only helper that calls the Google Apps Script web app.
 *
 * Never import this in client code (no "use client" files, no browser-side libs).
 * Browser code should call the Next.js API routes, which call this.
 */

function scriptUrl(): string {
  if (process.env.GOOGLE_SCRIPT_URL) return process.env.GOOGLE_SCRIPT_URL;
  const id = process.env.GOOGLE_SCRIPT_DEPLOYMENT_ID;
  if (id) return `https://script.google.com/macros/s/${id}/exec`;
  throw new Error("GOOGLE_SCRIPT_URL is not configured in .env.local");
}

/** Calls the Apps Script and returns the parsed response. Throws on any error. */
export async function callScript(payload: Record<string, unknown>): Promise<Record<string, unknown>> {
  const url = scriptUrl();
  const apiKey = process.env.GOOGLE_SCRIPT_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_SCRIPT_API_KEY is not configured in .env.local");

  const res = await fetch(url, {
    method: "POST",
    // text/plain avoids Apps Script CORS/preflight quirks; the script parses the JSON itself.
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ apiKey, ...payload }),
    cache: "no-store",
  });

  const text = await res.text();
  let data: Record<string, unknown>;

  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    if (text.includes("accounts.google.com") || /accessdenied|access denied/i.test(text)) {
      throw new Error(
        'Google blocked access. In Apps Script: Deploy → Manage deployments → Edit → "Execute as: Me", "Who has access: Anyone", then redeploy.',
      );
    }
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
      scriptError
        ? `Apps Script error: ${scriptError}`
        : `Apps Script did not return JSON (HTTP ${res.status}).`,
    );
  }

  if (!data.success) {
    const msg = String(data.error || "Apps Script returned an error.");
    throw new Error(
      msg === "Unauthorized access"
        ? "Apps Script rejected the API key — API_KEY in the script must match GOOGLE_SCRIPT_API_KEY."
        : msg,
    );
  }

  return data;
}
