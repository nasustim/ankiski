import { chromeStorage, readKey, type StorageAreaLike, type StorageLike } from "./storage-area.ts";

export const SETTINGS_KEY = "ankiski.settings";

/** Where the "Open ankiski" links point unless the user overrides it. */
export const DEFAULT_WEB_APP_URL = "https://nasustim.github.io/ankiski/";

export type Settings = {
  webAppUrl: string;
};

export const defaultSettings: Settings = { webAppUrl: DEFAULT_WEB_APP_URL };

/** Settings follow the profile when sync storage exists, otherwise stay local. */
export function settingsArea(storage: StorageLike = chromeStorage()): StorageAreaLike {
  return storage.sync ?? storage.local;
}

function normalizeUrl(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_WEB_APP_URL;
  const trimmed = raw.trim();
  if (trimmed === "") return DEFAULT_WEB_APP_URL;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return DEFAULT_WEB_APP_URL;
    return trimmed;
  } catch {
    return DEFAULT_WEB_APP_URL;
  }
}

/** Coerces anything read from storage (or typed into the options form) into valid settings. */
export function normalizeSettings(raw: unknown): Settings {
  if (typeof raw !== "object" || raw === null) return { ...defaultSettings };
  return { webAppUrl: normalizeUrl((raw as Record<string, unknown>).webAppUrl) };
}

export async function loadSettings(storage: StorageLike = chromeStorage()): Promise<Settings> {
  return normalizeSettings(await readKey(settingsArea(storage), SETTINGS_KEY));
}

export async function saveSettings(
  settings: Settings,
  storage: StorageLike = chromeStorage(),
): Promise<void> {
  await settingsArea(storage).set({ [SETTINGS_KEY]: normalizeSettings(settings) });
}
