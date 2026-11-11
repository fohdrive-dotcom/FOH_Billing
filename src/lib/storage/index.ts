/**
 * storage/index.ts — picks which storage the app uses.
 *
 * NEXT_PUBLIC_USE_SHEETS=true  →  Google Sheets (via /api/sheets/* routes)
 * (anything else)             →  IndexedDB (browser-local, default)
 *
 * To switch backends, set the env var in .env.local and restart the dev server.
 */
import { indexedDbRepository } from "./indexeddb";
import { sheetsRepository } from "./sheets";
import type { Repository } from "./repository";

export const repo: Repository =
  process.env.NEXT_PUBLIC_USE_SHEETS === "true" ? sheetsRepository : indexedDbRepository;

export { formatNumber, invoiceNumber, invoiceNumberPlaceholder, compactDate } from "./repository";
