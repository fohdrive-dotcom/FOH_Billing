/**
 * indexeddb.ts — stores everything inside the browser using IndexedDB
 * (through the tiny "idb" helper library).
 *
 * IMPORTANT: browser data lives only on THIS browser on THIS device.
 * Use Settings -> "Export backup" regularly.
 */
import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { AppDocument, BackupData, Client, DocType, Settings } from "../types";
import { DEFAULT_SETTINGS } from "../defaults";
import { formatNumber, invoiceNumber, type Repository } from "./repository";

interface BillingDB extends DBSchema {
  documents: { key: string; value: AppDocument };
  clients: { key: string; value: Client };
  settings: { key: string; value: Settings };
}

const DB_NAME = "foh-billing";
const DB_VERSION = 1;
const SETTINGS_KEY = "app";

let dbPromise: Promise<IDBPDatabase<BillingDB>> | null = null;

function getDB() {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser.");
  }
  if (!dbPromise) {
    dbPromise = openDB<BillingDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Runs only the first time (or when DB_VERSION goes up).
        db.createObjectStore("documents", { keyPath: "id" });
        db.createObjectStore("clients", { keyPath: "id" });
        db.createObjectStore("settings");
      },
    });
  }
  return dbPromise;
}

/** Fills in any settings that were added in newer versions of the app. */
function withDefaults(s: Partial<Settings> | undefined): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    business: { ...DEFAULT_SETTINGS.business, ...s?.business },
    bank: { ...DEFAULT_SETTINGS.bank, ...s?.bank },
  };
}

export const indexedDbRepository: Repository = {
  async getSettings() {
    const db = await getDB();
    return withDefaults(await db.get("settings", SETTINGS_KEY));
  },

  async saveSettings(settings) {
    const db = await getDB();
    await db.put("settings", settings, SETTINGS_KEY);
  },

  async listDocuments() {
    const db = await getDB();
    const docs = await db.getAll("documents");
    // newest first
    return docs.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getDocument(id) {
    const db = await getDB();
    return db.get("documents", id);
  },

  async saveDocument(doc) {
    const db = await getDB();
    await db.put("documents", { ...doc, updatedAt: new Date().toISOString() });
  },

  async deleteDocument(id) {
    const db = await getDB();
    await db.delete("documents", id);
  },

  async allocateNumber(type: DocType) {
    const db = await getDB();
    if (type === "invoice") {
      // FOH-DDMMYYYY-123 — random, checked against every number already saved.
      const docs = await db.getAll("documents");
      return invoiceNumber(new Set(docs.map((d) => d.number)));
    }
    // A transaction makes "read counter + increment" safe even with two tabs open.
    const tx = db.transaction("settings", "readwrite");
    const settings = withDefaults(await tx.store.get(SETTINGS_KEY));
    let number: string;
    {
      number = formatNumber(settings.quotationPrefix, settings.nextQuotationNumber, settings.numberPadding);
      settings.nextQuotationNumber += 1;
    }
    await tx.store.put(settings, SETTINGS_KEY);
    await tx.done;
    return number;
  },

  async listClients() {
    const db = await getDB();
    const clients = await db.getAll("clients");
    return clients.sort((a, b) => a.name.localeCompare(b.name));
  },

  async saveClient(client) {
    const db = await getDB();
    const saved = { ...client, updatedAt: new Date().toISOString() };
    await db.put("clients", saved);
    return saved;
  },

  async deleteClient(id) {
    const db = await getDB();
    await db.delete("clients", id);
  },

  async exportAll(): Promise<BackupData> {
    const db = await getDB();
    return {
      app: "foh-billing",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: withDefaults(await db.get("settings", SETTINGS_KEY)),
      documents: await db.getAll("documents"),
      clients: await db.getAll("clients"),
    };
  },

  async importAll(data, mode) {
    const db = await getDB();
    const tx = db.transaction(["documents", "clients", "settings"], "readwrite");
    if (mode === "replace") {
      await tx.objectStore("documents").clear();
      await tx.objectStore("clients").clear();
    }
    for (const d of data.documents) await tx.objectStore("documents").put(d);
    for (const c of data.clients) await tx.objectStore("clients").put(c);
    await tx.objectStore("settings").put(withDefaults(data.settings), SETTINGS_KEY);
    await tx.done;
  },
};
