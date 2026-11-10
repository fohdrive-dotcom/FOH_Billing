/**
 * storage/index.ts — picks which storage the app uses.
 *
 * To switch to Supabase later:
 *   1. create src/lib/storage/supabase.ts that exports `supabaseRepository: Repository`
 *   2. change the line below to:  export const repo = supabaseRepository;
 */
import { indexedDbRepository } from "./indexeddb";
import type { Repository } from "./repository";

export const repo: Repository = indexedDbRepository;
export { formatNumber, invoiceNumber, invoiceNumberPlaceholder } from "./repository";
