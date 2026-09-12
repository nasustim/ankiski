/** Minimal shape of the `chrome` global this package depends on. */
export type ChromeLike = {
  storage: {
    local: {
      get(key: string): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
    onChanged: {
      addListener(
        listener: (
          changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
          areaName: string,
        ) => void,
      ): void;
      removeListener(
        listener: (
          changes: Record<string, { oldValue?: unknown; newValue?: unknown }>,
          areaName: string,
        ) => void,
      ): void;
    };
  };
};

export type ChromeMock = {
  chrome: ChromeLike;
  store: Record<string, unknown>;
  emitChange(changes: Record<string, { oldValue?: unknown; newValue?: unknown }>): void;
};

/** Creates a fake `chrome.storage.local` implementation for unit tests. */
export function createChromeMock(): ChromeMock {
  const store: Record<string, unknown> = {};
  const listeners = new Set<
    (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, areaName: string) => void
  >();

  const chrome: ChromeLike = {
    storage: {
      local: {
        async get(key: string): Promise<Record<string, unknown>> {
          return key in store ? { [key]: store[key] } : {};
        },
        async set(items: Record<string, unknown>): Promise<void> {
          for (const [key, value] of Object.entries(items)) {
            store[key] = value;
          }
        },
      },
      onChanged: {
        addListener(listener) {
          listeners.add(listener);
        },
        removeListener(listener) {
          listeners.delete(listener);
        },
      },
    },
  };

  return {
    chrome,
    store,
    emitChange(changes) {
      for (const listener of listeners) {
        listener(changes, "local");
      }
    },
  };
}
