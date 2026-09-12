import { parseVault } from "./schema.ts";
import type { Vault } from "./types.ts";

/** Canonical file name for an exported/imported vault snapshot. */
export const VAULT_JSON_FILE_NAME = "vault.json";

/** Pretty-printed, newline-terminated JSON. Deterministic for equal inputs. */
export function serializeVault(vault: Vault): string {
  return `${JSON.stringify(vault, null, 2)}\n`;
}

/**
 * Parses and validates a vault.json payload.
 * Throws SyntaxError for malformed JSON and ZodError for schema violations.
 */
export function parseVaultJson(json: string): Vault {
  return parseVault(JSON.parse(json));
}
