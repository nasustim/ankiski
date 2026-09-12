/**
 * Shared contracts for ankiski. Every package and app codes against these.
 * Spec: https://github.com/nasustim/ankiski/issues/1
 */

export const SCHEMA_VERSION = 1 as const;

export type IsoDateTime = string;

export type Term = {
  /** ULID. Also used as the Anki note GUID so re-exports update instead of duplicate. */
  id: string;
  term: string;
  reading?: string;
  /** At least one of meaningJa / meaningEn must be non-empty. */
  meaningJa?: string;
  meaningEn?: string;
  example?: string;
  sourceUrl?: string;
  tags: string[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  /** Tombstone. A deleted term is kept so merges can propagate the deletion. */
  deletedAt?: IsoDateTime;
  exportedAt?: IsoDateTime;
};

export type Vault = {
  schemaVersion: typeof SCHEMA_VERSION;
  updatedAt: IsoDateTime;
  terms: Term[];
  /** Known tags for autocomplete. */
  tags: string[];
};

/** Persistence boundary. Implementations live in @ankiski/storage. */
export interface StorageAdapter {
  readonly kind: "chrome-storage" | "indexeddb" | "extension-bridge" | "memory";
  isAvailable(): Promise<boolean>;
  load(): Promise<Vault>;
  save(vault: Vault): Promise<void>;
  /** Optional change notification (bridge / chrome.storage can push). Returns unsubscribe. */
  subscribe?(listener: (vault: Vault) => void): () => void;
}

/** Messages the web app sends to the extension via chrome.runtime.sendMessage(extensionId, msg). */
export type BridgeRequest =
  | { type: "ankiski/ping" }
  | { type: "ankiski/load" }
  | { type: "ankiski/save"; vault: Vault };

export type BridgeResponse =
  | { ok: true; type: "ankiski/pong"; version: string }
  | { ok: true; type: "ankiski/vault"; vault: Vault }
  | { ok: true; type: "ankiski/saved" }
  | { ok: false; error: string };

/** Options shared by the .apkg and text exporters. */
export type ExportOptions = {
  deckName: string;
  /** Defaults to "English Vocab". */
  noteTypeName?: string;
};

export const ENGLISH_VOCAB_FIELDS = [
  "Term",
  "Reading",
  "MeaningJa",
  "MeaningEn",
  "Example",
  "Source",
] as const;
