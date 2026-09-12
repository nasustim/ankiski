import { mergeVaults, parseVault, type Vault } from "@ankiski/core";
import { z } from "zod";

/** Thrown when a vault.json payload is malformed or fails schema validation. */
export class VaultJsonError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "VaultJsonError";
  }
}

/** Pretty-printed, newline-terminated JSON. */
export function serializeVault(vault: Vault): string {
  return `${JSON.stringify(vault, null, 2)}\n`;
}

/** Parses and validates a vault.json payload, wrapping failures as VaultJsonError. */
export function parseVaultJson(text: string): Vault {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new VaultJsonError(`invalid JSON: ${message}`, { cause: error });
  }

  try {
    return parseVault(raw);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new VaultJsonError(`invalid vault: ${error.issues.map((i) => i.message).join(", ")}`, {
        cause: error,
      });
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new VaultJsonError(`invalid vault: ${message}`, { cause: error });
  }
}

export type ImportVaultJsonResult = {
  merged: Vault;
  imported: number;
};

/** Merges a vault.json payload into the current vault. */
export function importVaultJson(current: Vault, text: string): ImportVaultJsonResult {
  const incoming = parseVaultJson(text);
  return {
    merged: mergeVaults(current, incoming),
    imported: incoming.terms.length,
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Suggested file name for a vault.json export, e.g. ankiski-vault-20240305-0907.json */
export function vaultFileName(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const hh = pad(now.getHours());
  const mm = pad(now.getMinutes());
  return `ankiski-vault-${y}${m}${d}-${hh}${mm}.json`;
}
