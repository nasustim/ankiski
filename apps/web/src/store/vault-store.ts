import type { StorageAdapter, Term, TermInput, TermPatch, Vault } from "@ankiski/core";
import {
  updateTerm as applyPatch,
  collectTags,
  createEmptyVault,
  createTerm,
  softDeleteTerm,
  upsertTerm,
} from "@ankiski/core";
import type { SelectStorageMode } from "@ankiski/storage";
import { importVaultJson, selectStorage, serializeVault } from "@ankiski/storage";
import { create, type StoreApi, type UseBoundStore } from "zustand";

/** How long mutations are coalesced before hitting the storage adapter. */
export const SAVE_DEBOUNCE_MS = 500;

export type VaultStatus = "idle" | "loading" | "ready" | "error";

export type InitOverrides = {
  adapter?: StorageAdapter;
  mode?: SelectStorageMode;
  extensionId?: string;
};

export type VaultState = {
  vault: Vault;
  status: VaultStatus;
  mode?: SelectStorageMode;
  error?: string;
  init: (overrides?: InitOverrides) => Promise<void>;
  addTerm: (input: TermInput) => Term;
  updateTerm: (id: string, patch: TermPatch) => void;
  deleteTerms: (ids: readonly string[]) => void;
  markExported: (ids: readonly string[], now?: Date) => void;
  importJson: (text: string) => Promise<number>;
  exportJson: () => string;
  knownTags: () => string[];
  flush: () => Promise<void>;
};

export type VaultStore = UseBoundStore<StoreApi<VaultState>>;

function sortedUnion(...lists: readonly (readonly string[])[]): string[] {
  const set = new Set<string>();
  for (const list of lists) for (const item of list) set.add(item);
  return [...set].sort();
}

export function createVaultStore(): VaultStore {
  let adapter: StorageAdapter | undefined;
  let unsubscribe: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: Promise<void> = Promise.resolve();
  /** updatedAt of the vault we last pushed, so our own change echo is ignored. */
  let lastSavedAt: string | undefined;

  return create<VaultState>()((set, get) => {
    function persistNow(): Promise<void> {
      const target = adapter;
      if (!target) return Promise.resolve();
      const vault = get().vault;
      lastSavedAt = vault.updatedAt;
      inFlight = target.save(vault).catch((error: unknown) => {
        set({ error: error instanceof Error ? error.message : String(error) });
      });
      return inFlight;
    }

    function schedulePersist(): void {
      if (timer !== undefined) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        void persistNow();
      }, SAVE_DEBOUNCE_MS);
    }

    function commit(vault: Vault): void {
      set({ vault });
      schedulePersist();
    }

    function mapTerms(ids: readonly string[], fn: (term: Term) => Term, now = new Date()): void {
      const wanted = new Set(ids);
      const { vault } = get();
      commit({
        ...vault,
        updatedAt: now.toISOString(),
        terms: vault.terms.map((term) => (wanted.has(term.id) ? fn(term) : term)),
      });
    }

    return {
      vault: createEmptyVault(),
      status: "idle",

      async init(overrides = {}) {
        set({ status: "loading" });
        try {
          const selected =
            overrides.adapter !== undefined
              ? { adapter: overrides.adapter, mode: overrides.mode ?? "memory" }
              : await selectStorage(
                  overrides.extensionId === undefined ? {} : { extensionId: overrides.extensionId },
                );

          unsubscribe?.();
          adapter = selected.adapter;
          const vault = await adapter.load();
          lastSavedAt = vault.updatedAt;
          set({ vault, mode: selected.mode, status: "ready" });

          unsubscribe = adapter.subscribe?.((incoming) => {
            // Ignore the echo of our own save.
            if (incoming.updatedAt === lastSavedAt) return;
            lastSavedAt = incoming.updatedAt;
            set({ vault: incoming });
          });
        } catch (error) {
          set({ status: "error", error: error instanceof Error ? error.message : String(error) });
        }
      },

      addTerm(input) {
        const term = createTerm(input);
        commit(upsertTerm(get().vault, term));
        return term;
      },

      updateTerm(id, patch) {
        const existing = get().vault.terms.find((term) => term.id === id);
        if (!existing) return;
        commit(upsertTerm(get().vault, applyPatch(existing, patch)));
      },

      deleteTerms(ids) {
        mapTerms(ids, (term) => softDeleteTerm(term));
      },

      markExported(ids, now = new Date()) {
        const stamp = now.toISOString();
        mapTerms(ids, (term) => ({ ...term, exportedAt: stamp }), now);
      },

      async importJson(text) {
        const { merged, imported } = importVaultJson(get().vault, text);
        commit(merged);
        await get().flush();
        return imported;
      },

      exportJson() {
        return serializeVault(get().vault);
      },

      knownTags() {
        const { vault } = get();
        return sortedUnion(vault.tags, collectTags(vault.terms));
      },

      async flush() {
        if (timer !== undefined) {
          clearTimeout(timer);
          timer = undefined;
        }
        await persistNow();
        await inFlight;
      },
    };
  });
}

/** The app-wide vault store. */
export const useVaultStore = createVaultStore();
