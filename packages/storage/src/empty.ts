import type { Vault } from "@ankiski/core";

/** A fresh, empty vault. */
export function emptyVault(now: Date = new Date()): Vault {
  return {
    schemaVersion: 1,
    updatedAt: now.toISOString(),
    terms: [],
    tags: [],
  };
}
