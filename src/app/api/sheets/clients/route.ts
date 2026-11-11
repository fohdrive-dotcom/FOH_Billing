/**
 * /api/sheets/clients
 *
 *   GET                        → { clients: Client[] }
 *   POST { client: Client }    → { client: Client }   (create or update)
 *   DELETE ?id=<clientId>      → { ok: true }
 *
 * Maps between the app's Client type (uses `id`) and the script's response (uses `clientId`).
 */
import { connection } from "next/server";
import { callScript } from "@/lib/server/googleScript";
import type { Client } from "@/lib/types";

type ScriptClient = {
  clientId: string;
  name: string;
  address: string;
  email: string;
  phone: string;
  taxNumber: string;
  createdAt: string;
  updatedAt: string;
};

function toAppClient(sc: ScriptClient): Client {
  return {
    id: sc.clientId,
    name: sc.name ?? "",
    address: sc.address ?? "",
    email: sc.email ?? "",
    phone: sc.phone ?? "",
    taxNumber: sc.taxNumber ?? "",
    createdAt: sc.createdAt ?? new Date().toISOString(),
    updatedAt: sc.updatedAt ?? new Date().toISOString(),
  };
}

const fail = (error: string, status = 502) =>
  Response.json({ error }, { status });

export async function GET() {
  await connection();
  try {
    const data = await callScript({ action: "getClients" });
    const raw = (data.clients ?? []) as ScriptClient[];
    return Response.json({ clients: raw.map(toAppClient) });
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export async function POST(request: Request) {
  let body: { client?: Client };
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body.", 400);
  }

  const client = body.client;
  if (!client?.name) return fail("Client name is required.", 400);

  try {
    // Try to update first; fall back to add if the row doesn't exist yet.
    let saved: ScriptClient;
    try {
      const upd = await callScript({
        action: "updateClient",
        clientId: client.id,
        client: {
          name: client.name,
          address: client.address ?? "",
          email: client.email ?? "",
          phone: client.phone ?? "",
          taxNumber: client.taxNumber ?? "",
        },
      });
      saved = upd.client as ScriptClient;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("not found")) throw e;
      // New client — let the script assign a CL-xxx id.
      const added = await callScript({
        action: "addClient",
        client: {
          name: client.name,
          address: client.address ?? "",
          email: client.email ?? "",
          phone: client.phone ?? "",
          taxNumber: client.taxNumber ?? "",
        },
      });
      saved = added.client as ScriptClient;
    }
    return Response.json({ client: toAppClient(saved) });
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail("?id= is required.", 400);
  try {
    await callScript({ action: "deleteClient", clientId: id });
    return Response.json({ ok: true });
  } catch (e) {
    return fail(e instanceof Error ? e.message : String(e));
  }
}
