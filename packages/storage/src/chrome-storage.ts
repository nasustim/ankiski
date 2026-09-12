import type { StorageAdapter, Vault } from "@ankiski/core";
import { emptyVault } from "./empty.ts";

const KEY = "ankiski.vault";

/** chrome.storage.local-backed storage adapter for the Chrome extension. */
export class ChromeStorageAdapter implements StorageAdapter {
  readonly kind = "chrome-storage" as const;

  async isAvailable(): Promise<boolean> {
    return typeof chrome !== "undefined" && !!chrome.storage?.local;
  }

  async load(): Promise<Vault> {
    const result = await chrome.storage.local.get(KEY);
    const vault = result[KEY] as Vault | undefined;
    return vault ?? emptyVault();
  }

  async save(vault: Vault): Promise<void> {
    await chrome.storage.local.set({ [KEY]: vault });
  }

  subscribe(listener: (vault: Vault) => void): () => void {
    const handler = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName !== "local") {
        return;
      }
      const change = changes[KEY];
      if (!change) {
        return;
      }
      listener(change.newValue as Vault);
    };
    chrome.storage.onChanged.addListener(handler);
    return () => {
      chrome.storage.onChanged.removeListener(handler);
    };
  }
}
