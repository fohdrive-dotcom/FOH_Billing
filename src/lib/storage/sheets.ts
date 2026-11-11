/**
 * sheets.ts — Repository implementation backed by Google Sheets via the
 * Next.js API routes in /api/sheets/* and /api/sheet-settings.
 *
 * All reads/writes go through Next.js server routes, which call the
 * Google Apps Script web app. The API key never leaves the server.
 *
 * Activate by setting  NEXT_PUBLIC_USE_SHEETS=true  in .env.local.
 */
import type { AppDocument, BackupData, Client, DocType, Settings } from "../types";
import { DEFAULT_SETTINGS } from "../defaults";
import { applySheetToSettings, settingsToSheet } from "../sheetSettings";
import { invoiceNumber, compactDate } from "./repository";
import type { Repository } from "./repository";

async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, cache: "no-store" });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok || (data as { error?: string }).error) {
    throw new Error((data as { error?: string }).error || `API error ${res.status}`);
  }
  return data;
}

export const sheetsRepository: Repository = {
  // ─── Settings ────────────────────────────────────────────────────────────

  async getSettings(): Promise<Settings> {
    const data = await api<{ ok: boolean; settings: Record<string, string> }>("/api/sheet-settings");
    return applySheetToSettings(DEFAULT_SETTINGS, data.settings);
  },

  async saveSettings(settings: Settings): Promise<void> {
    await api("/api/sheet-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: settingsToSheet(settings) }),
    });
  },

  // ─── Documents ───────────────────────────────────────────────────────────

  async listDocuments(): Promise<AppDocument[]> {
    const [invData, quotData] = await Promise.all([
      api<{ documents: AppDocument[] }>("/api/sheets/documents?type=invoice"),
      api<{ documents: AppDocument[] }>("/api/sheets/documents?type=quotation"),
    ]);
    return [...(invData.documents ?? []), ...(quotData.documents ?? [])].sort((a, b) =>
      (b.createdAt ?? "").localeCompare(a.createdAt ?? ""),
    );
  },

  async getDocument(id: string): Promise<AppDocument | undefined> {
    const data = await api<{ document: AppDocument | null }>(
      `/api/sheets/documents?id=${encodeURIComponent(id)}`,
    );
    return data.document ?? undefined;
  },

  async saveDocument(doc: AppDocument): Promise<void> {
    await api("/api/sheets/documents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ document: doc }),
    });
  },

  async deleteDocument(id: string): Promise<void> {
    await api(`/api/sheets/documents?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  async allocateNumber(type: DocType): Promise<string> {
    if (type === "invoice") {
      // Build the number locally: FOH-DDMMYYYY-NNN, sequential within today.
      const data = await api<{ documents: AppDocument[] }>("/api/sheets/documents?type=invoice");
      const used = new Set((data.documents ?? []).map((d) => d.number));
      return invoiceNumber(used);
    }
    // Quotations: use the Apps Script's persistent sequential counter.
    const data = await api<{ number: string }>("/api/sheets/allocate-number", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    return data.number;
  },

  // ─── Clients ─────────────────────────────────────────────────────────────

  async listClients(): Promise<Client[]> {
    const data = await api<{ clients: Client[] }>("/api/sheets/clients");
    return data.clients ?? [];
  },

  async saveClient(client: Client): Promise<Client> {
    const data = await api<{ client: Client }>("/api/sheets/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client }),
    });
    return data.client;
  },

  async deleteClient(id: string): Promise<void> {
    await api(`/api/sheets/clients?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  },

  // ─── Backup / Restore ────────────────────────────────────────────────────

  async exportAll(): Promise<BackupData> {
    const [settings, documents, clients] = await Promise.all([
      this.getSettings(),
      this.listDocuments(),
      this.listClients(),
    ]);
    return {
      app: "foh-billing",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      documents,
      clients,
    };
  },

  async importAll(data: BackupData, mode: "replace" | "merge"): Promise<void> {
    if (mode === "replace") {
      const [existingDocs, existingClients] = await Promise.all([
        this.listDocuments(),
        this.listClients(),
      ]);
      await Promise.all([
        ...existingDocs.map((d) => this.deleteDocument(d.id)),
        ...existingClients.map((c) => this.deleteClient(c.id)),
      ]);
    }
    // Sequential to avoid hitting Apps Script rate limits.
    for (const doc of data.documents) await this.saveDocument(doc);
    for (const client of data.clients) await this.saveClient(client);
    await this.saveSettings(data.settings);
  },
};
