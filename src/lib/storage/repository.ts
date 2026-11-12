/**
 * repository.ts — the "contract" for saving and loading data.
 *
 * The rest of the app ONLY talks to this interface. Today it is implemented
 * with IndexedDB (indexeddb.ts). To move to Supabase or Prisma later, write a
 * new file that implements the same functions (e.g. supabase.ts) and change
 * one line in storage/index.ts. No page or component needs to change.
 */
import type { AppDocument, BackupData, Client, DocType, Settings } from "../types";

export interface Repository {
  // Settings
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<void>;

  // Documents
  listDocuments(): Promise<AppDocument[]>;
  getDocument(id: string): Promise<AppDocument | undefined>;
  saveDocument(doc: AppDocument): Promise<void>;
  deleteDocument(id: string): Promise<void>;
  /** Returns the next number (e.g. INV-0007) and increments the counter. */
  allocateNumber(type: DocType): Promise<string>;

  // Clients
  listClients(): Promise<Client[]>;
  /** Saves (creates or updates) a client. Returns the saved client — the id may differ
   *  from what was passed in when using the Google Sheets backend (script-assigned ID). */
  saveClient(client: Client): Promise<Client>;
  deleteClient(id: string): Promise<void>;

  // Backup
  exportAll(): Promise<BackupData>;
  /** "replace" wipes current data first; "merge" keeps it and overwrites matching ids. */
  importAll(data: BackupData, mode: "replace" | "merge"): Promise<void>;
}

/** Today's date as "DDMMYYYY", e.g. 10 Nov 2026 -> "10112026". */
export function compactDate(d: Date = new Date()): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}${mm}${d.getFullYear()}`;
}

/**
 * Invoice numbers: "FOH-<DDMMYYYY>-<NNN>", e.g. FOH-10112026-001.
 * Pass all existing numbers so we always pick the next sequential slot for today.
 */
export function invoiceNumber(used: Set<string> = new Set(), date: Date = new Date()): string {
  const prefix = `FOH-${compactDate(date)}-`;
  const existing = [...used]
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n));
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  if (next > 999) throw new Error("All 999 invoice numbers for today are used.");
  return prefix + String(next).padStart(3, "0");
}

/**
 * Quotation numbers: "FOH-QT-<DDMMYYYY>-<NNN>", e.g. FOH-QT-10112026-001.
 * Pass all existing numbers so we always pick the next sequential slot for today.
 */
export function quotationNumber(used: Set<string> = new Set(), date: Date = new Date()): string {
  const prefix = `FOH-QT-${compactDate(date)}-`;
  const existing = [...used]
    .filter((n) => n.startsWith(prefix))
    .map((n) => parseInt(n.slice(prefix.length), 10))
    .filter((n) => Number.isFinite(n));
  const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
  if (next > 999) throw new Error("All 999 quotation numbers for today are used.");
  return prefix + String(next).padStart(3, "0");
}

/** What an unsaved invoice shows until it gets its real number on save. */
export function invoiceNumberPlaceholder(date: Date = new Date()): string {
  return `FOH-${compactDate(date)}-XXX`;
}

/** What an unsaved quotation shows until it gets its real number on save. */
export function quotationNumberPlaceholder(date: Date = new Date()): string {
  return `FOH-QT-${compactDate(date)}-XXX`;
}

/** Formats 7 -> "QT-0007". */
export function formatNumber(prefix: string, n: number, padding: number): string {
  return `${prefix}${String(n).padStart(Math.max(1, padding), "0")}`;
}
