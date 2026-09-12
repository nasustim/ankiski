import { beforeEach, describe, expect, it } from "vitest";
import { createSettingsStore, DEFAULT_DECK_NAME, SETTINGS_STORAGE_KEY } from "./settings-store.ts";

describe("settings store", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("falls back to the default deck name", () => {
    const store = createSettingsStore();
    expect(store.getState().deckName).toBe(DEFAULT_DECK_NAME);
    expect(store.getState().voiceUri).toBe("");
  });

  it("persists changes to localStorage", () => {
    const store = createSettingsStore();
    store.getState().setDeckName("Japanese::Kanji");
    store.getState().setVoiceUri("Daniel:en-GB");

    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw ?? "{}")).toEqual({
      deckName: "Japanese::Kanji",
      voiceUri: "Daniel:en-GB",
    });
  });

  it("rehydrates previously saved settings", () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ deckName: "Deck", voiceUri: "v" }));
    const store = createSettingsStore();
    expect(store.getState().deckName).toBe("Deck");
    expect(store.getState().voiceUri).toBe("v");
  });

  it("ignores corrupt stored settings", () => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, "{{{");
    const store = createSettingsStore();
    expect(store.getState().deckName).toBe(DEFAULT_DECK_NAME);
  });
});
