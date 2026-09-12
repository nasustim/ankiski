/**
 * The subset of `chrome.storage.StorageArea` the extension uses, narrowed so tests
 * can pass a plain object and so the modules below stay independent of the globals.
 */
export type StorageAreaLike = {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(key: string): Promise<void>;
};

/** `chrome.storage` with the optional areas marked optional, as MV2-era hosts lack them. */
export type StorageLike = {
  local: StorageAreaLike;
  session?: StorageAreaLike;
  sync?: StorageAreaLike;
};

/** Resolves the `chrome.storage` global lazily, so importing a module never needs it. */
export function chromeStorage(): StorageLike {
  return chrome.storage as unknown as StorageLike;
}

export async function readKey(area: StorageAreaLike, key: string): Promise<unknown> {
  const result = await area.get(key);
  return result[key];
}
