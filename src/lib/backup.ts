/**
 * backup.ts — download all data as a .json file, and read it back.
 */
import type { BackupData } from "./types";
import { repo } from "./storage";
import { todayISO } from "./format";

export async function downloadBackup() {
  const data = await repo.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  triggerDownload(blob, `foh-billing-backup_${todayISO()}.json`);
}

/** Reads a .json file chosen by the user and checks it looks like our backup. */
export async function readBackupFile(file: File): Promise<BackupData> {
  const text = await file.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This file is not valid JSON.");
  }
  const d = data as Partial<BackupData>;
  if (d?.app !== "foh-billing" || !Array.isArray(d.documents) || !Array.isArray(d.clients) || !d.settings) {
    throw new Error("This file is not a FOH Billing backup.");
  }
  return d as BackupData;
}

/** Makes the browser download a Blob with the given file name. */
export function triggerDownload(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
