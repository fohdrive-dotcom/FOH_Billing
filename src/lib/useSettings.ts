"use client";
/**
 * useSettings — React hook that loads settings from browser storage.
 * Returns null while loading (the first render happens before storage is read).
 */
import { useEffect, useState } from "react";
import type { Settings } from "./types";
import { repo } from "./storage";

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    repo
      .getSettings()
      .then(setSettings)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  return { settings, setSettings, error };
}
