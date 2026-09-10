import type { StorageAdapter, Vault } from "@ankiski/core";
import { emptyVault } from "./empty.ts";

function cloneVault(vault: Vault): Vault {
  return structuredClone(vault);
}

/** In-memory storage adapter. Useful for tests and as a fallback. */
export class MemoryAdapter implements StorageAdapter {
  readonly kind = "memory" as const;

  #vault: Vault;
  #listeners = new Set<(vault: Vault) => void>();

  constructor(initial?: Vault) {
    this.#vault = cloneVault(initial ?? emptyVault());
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async load(): Promise<Vault> {
    return cloneVault(this.#vault);
  }

  async save(vault: Vault): Promise<void> {
    this.#vault = cloneVault(vault);
    for (const listener of this.#listeners) {
      listener(cloneVault(this.#vault));
    }
  }

  subscribe(listener: (vault: Vault) => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }
}
