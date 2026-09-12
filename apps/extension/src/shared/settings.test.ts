import { describe, expect, it } from "vitest";
import { createExtensionChromeMock } from "../testing/chrome-mock.ts";
import {
  DEFAULT_WEB_APP_URL,
  loadSettings,
  normalizeSettings,
  SETTINGS_KEY,
  saveSettings,
} from "./settings.ts";

describe("normalizeSettings", () => {
  it("defaults when the stored value is missing", () => {
    expect(normalizeSettings(undefined)).toEqual({ webAppUrl: DEFAULT_WEB_APP_URL });
  });

  it("defaults when the stored value is not an object", () => {
    expect(normalizeSettings("nope")).toEqual({ webAppUrl: DEFAULT_WEB_APP_URL });
  });

  it("keeps a valid https URL", () => {
    expect(normalizeSettings({ webAppUrl: "https://example.com/ankiski/" })).toEqual({
      webAppUrl: "https://example.com/ankiski/",
    });
  });

  it("keeps a localhost dev URL", () => {
    expect(normalizeSettings({ webAppUrl: "http://localhost:5173/" })).toEqual({
      webAppUrl: "http://localhost:5173/",
    });
  });

  it("trims surrounding whitespace", () => {
    expect(normalizeSettings({ webAppUrl: "  https://example.com/  " })).toEqual({
      webAppUrl: "https://example.com/",
    });
  });

  it("rejects a non-http scheme", () => {
    expect(normalizeSettings({ webAppUrl: "javascript:alert(1)" })).toEqual({
      webAppUrl: DEFAULT_WEB_APP_URL,
    });
  });

  it("rejects a blank URL", () => {
    expect(normalizeSettings({ webAppUrl: "   " })).toEqual({ webAppUrl: DEFAULT_WEB_APP_URL });
  });
});

describe("loadSettings / saveSettings", () => {
  it("returns defaults when nothing is stored", async () => {
    const mock = createExtensionChromeMock();
    expect(await loadSettings(mock.chrome.storage)).toEqual({ webAppUrl: DEFAULT_WEB_APP_URL });
  });

  it("round-trips through the sync area", async () => {
    const mock = createExtensionChromeMock();

    await saveSettings({ webAppUrl: "https://example.com/app/" }, mock.chrome.storage);

    expect(mock.chrome.storage.sync.store[SETTINGS_KEY]).toEqual({
      webAppUrl: "https://example.com/app/",
    });
    expect(await loadSettings(mock.chrome.storage)).toEqual({
      webAppUrl: "https://example.com/app/",
    });
  });

  it("falls back to the local area when sync is unavailable", async () => {
    const mock = createExtensionChromeMock();
    const storage = { local: mock.chrome.storage.local };

    await saveSettings({ webAppUrl: "https://example.com/app/" }, storage);

    expect(mock.chrome.storage.local.store[SETTINGS_KEY]).toEqual({
      webAppUrl: "https://example.com/app/",
    });
    expect(await loadSettings(storage)).toEqual({ webAppUrl: "https://example.com/app/" });
  });

  it("normalizes a bad stored value on read", async () => {
    const mock = createExtensionChromeMock();
    await mock.chrome.storage.sync.set({ [SETTINGS_KEY]: { webAppUrl: 7 } });

    expect(await loadSettings(mock.chrome.storage)).toEqual({ webAppUrl: DEFAULT_WEB_APP_URL });
  });

  it("normalizes before writing", async () => {
    const mock = createExtensionChromeMock();

    await saveSettings({ webAppUrl: " ftp://example.com " }, mock.chrome.storage);

    expect(mock.chrome.storage.sync.store[SETTINGS_KEY]).toEqual({
      webAppUrl: DEFAULT_WEB_APP_URL,
    });
  });
});
