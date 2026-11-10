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
  saveClient(client: Client): Promise<void>;
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
 * Invoice numbers: "FOH-<DDMMYYYY>-<3 random digits>", e.g. FOH-10112026-482.
 * Pass the numbers already in use so we never hand out a duplicate.
 */
export function invoiceNumber(used: Set<string> = new Set(), date: Date = new Date()): string {
  const prefix = `FOH-${compactDate(date)}-`;
  const free: string[] = [];
  for (let i = 0; i < 1000; i++) {
    const candidate = prefix + String(i).padStart(3, "0");
    if (!used.has(candidate)) free.push(candidate);
  }
  if (!free.length) throw new Error("All 1000 invoice numbers for today are used.");
  return free[Math.floor(Math.random() * free.length)];
}

/** What an unsaved invoice shows until it gets its real number on save. */
export function invoiceNumberPlaceholder(date: Date = new Date()): string {
  return `FOH-${compactDate(date)}-XXX`;
}

/** Formats 7 -> "QT-0007". */
export function formatNumber(prefix: string, n: number, padding: number): string {
  return `${prefix}${String(n).padStart(Math.max(1, padding), "0")}`;
}
