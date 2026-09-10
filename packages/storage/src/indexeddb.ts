import type { StorageAdapter, Vault } from "@ankiski/core";
import { type DBSchema, type IDBPDatabase, openDB } from "idb";
import { emptyVault } from "./empty.ts";

const STORE_NAME = "vault";
const KEY = "current";
const BROADCAST_CHANNEL_NAME = "ankiski-vault";

interface AnkiskiDb extends DBSchema {
  vault: {
    key: string;
    value: Vault;
  };
}

export type IndexedDbAdapterOptions = {
  dbName?: string;
};

/** IndexedDB-backed storage adapter for the web app. */
export class IndexedDbAdapter implements StorageAdapter {
  readonly kind = "indexeddb" as const;

  #dbName: string;
  #dbPromise: Promise<IDBPDatabase<AnkiskiDb>> | undefined;

  constructor(options: IndexedDbAdapterOptions = {}) {
    this.#dbName = options.dbName ?? "ankiski";
  }

  #openDb(): Promise<IDBPDatabase<AnkiskiDb>> {
    if (!this.#dbPromise) {
      this.#dbPromise = openDB<AnkiskiDb>(this.#dbName, 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        },
      });
    }
    return this.#dbPromise;
  }

  async isAvailable(): Promise<boolean> {
    if (typeof indexedDB === "undefined") {
      return false;
    }
    try {
      await this.#openDb();
      return true;
    } catch {
      return false;
    }
  }

  async load(): Promise<Vault> {
    const db = await this.#openDb();
    const stored = await db.get(STORE_NAME, KEY);
    return stored ?? emptyVault();
  }

  async save(vault: Vault): Promise<void> {
    const db = await this.#openDb();
    await db.put(STORE_NAME, vault, KEY);
    this.#broadcast();
  }

  #broadcast(): void {
    if (typeof BroadcastChannel === "undefined") {
      return;
    }
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    channel.postMessage({ dbName: this.#dbName });
    channel.close();
  }

  subscribe(listener: (vault: Vault) => void): () => void {
    if (typeof BroadcastChannel === "undefined") {
      return () => {};
    }
    const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    const handler = (event: MessageEvent<{ dbName: string }>) => {
      if (event.data?.dbName !== this.#dbName) {
        return;
      }
      this.load()
        .then((vault) => listener(vault))
        .catch(() => {});
    };
    channel.addEventListener("message", handler);
    return () => {
      channel.removeEventListener("message", handler);
      channel.close();
    };
  }
}
