import type { StorageAdapter } from "@ankiski/core";
import { detectExtension } from "./bridge.ts";
import { IndexedDbAdapter } from "./indexeddb.ts";
import { MemoryAdapter } from "./memory.ts";

export type SelectStorageMode = "extension-bridge" | "indexeddb" | "memory";

export type SelectStorageOptions = {
  extensionId?: string;
  prefer?: "auto" | "indexeddb";
};

export type SelectStorageResult = {
  adapter: StorageAdapter;
  mode: SelectStorageMode;
};

/** Picks the best available storage adapter for the current environment. */
export async function selectStorage(opts: SelectStorageOptions = {}): Promise<SelectStorageResult> {
  if (opts.extensionId) {
    const bridge = await detectExtension(opts.extensionId);
    if (bridge) {
      return { adapter: bridge, mode: "extension-bridge" };
    }
  }

  const indexedDb = new IndexedDbAdapter();
  if (await indexedDb.isAvailable()) {
    return { adapter: indexedDb, mode: "indexeddb" };
  }

  return { adapter: new MemoryAdapter(), mode: "memory" };
}
