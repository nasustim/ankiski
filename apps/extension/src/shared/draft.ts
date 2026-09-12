import { chromeStorage, readKey, type StorageAreaLike, type StorageLike } from "./storage-area.ts";

export const DRAFT_KEY = "ankiski.draft";

/**
 * A capture handed from the context menu to the popup. Short-lived: it lives in
 * `chrome.storage.session` where available so it disappears with the browser session.
 */
export type Draft = {
  term: string;
  example: string;
  sourceUrl: string;
  createdAt: string;
};

/** Session storage when the browser has it, otherwise the local area. */
export function draftArea(storage: StorageLike = chromeStorage()): StorageAreaLike {
  return storage.session ?? storage.local;
}

function isDraft(value: unknown): value is Draft {
  if (typeof value !== "object" || value === null) return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.term === "string" &&
    typeof draft.example === "string" &&
    typeof draft.sourceUrl === "string" &&
    typeof draft.createdAt === "string"
  );
}

export async function saveDraft(
  draft: Draft,
  storage: StorageLike = chromeStorage(),
): Promise<void> {
  await draftArea(storage).set({ [DRAFT_KEY]: draft });
}

/** Reads the pending draft without consuming it. */
export async function peekDraft(storage: StorageLike = chromeStorage()): Promise<Draft | null> {
  const value = await readKey(draftArea(storage), DRAFT_KEY);
  return isDraft(value) ? value : null;
}

/** Reads the pending draft and clears it, so reopening the popup starts blank. */
export async function takeDraft(storage: StorageLike = chromeStorage()): Promise<Draft | null> {
  const area = draftArea(storage);
  const value = await readKey(area, DRAFT_KEY);
  if (value !== undefined) await area.remove(DRAFT_KEY);
  return isDraft(value) ? value : null;
}
