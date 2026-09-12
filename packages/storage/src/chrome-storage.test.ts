import type { Vault } from "@ankiski/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ChromeStorageAdapter } from "./chrome-storage.ts";
import { emptyVault } from "./empty.ts";
import { type ChromeMock, createChromeMock } from "./testing/chrome-mock.ts";

function makeVault(overrides: Partial<Vault> = {}): Vault {
  return {
    ...emptyVault(new Date("2024-01-01T00:00:00.000Z")),
    ...overrides,
  };
}

let mock: ChromeMock;

beforeEach(() => {
  mock = createChromeMock();
  // biome-ignore lint/suspicious/noExplicitAny: test-only global assignment
  (globalThis as any).chrome = mock.chrome;
});

afterEach(() => {
  // biome-ignore lint/suspicious/noExplicitAny: test-only global cleanup
  (globalThis as any).chrome = undefined;
});

describe("ChromeStorageAdapter", () => {
  it("has kind 'chrome-storage'", () => {
    const adapter = new ChromeStorageAdapter();
    expect(adapter.kind).toBe("chrome-storage");
  });

  it("isAvailable resolves true when chrome.storage.local exists", async () => {
    const adapter = new ChromeStorageAdapter();
    await expect(adapter.isAvailable()).resolves.toBe(true);
  });

  it("isAvailable resolves false when chrome is undefined", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: test-only global cleanup
    (globalThis as any).chrome = undefined;
    const adapter = new ChromeStorageAdapter();
    await expect(adapter.isAvailable()).resolves.toBe(false);
  });

  it("load returns an empty vault when nothing is stored", async () => {
    const adapter = new ChromeStorageAdapter();
    const vault = await adapter.load();
    expect(vault.terms).toEqual([]);
    expect(vault.tags).toEqual([]);
  });

  it("load/save roundtrip", async () => {
    const adapter = new ChromeStorageAdapter();
    const vault = makeVault({ tags: ["a"] });
    await adapter.save(vault);
    const loaded = await adapter.load();
    expect(loaded).toEqual(vault);
  });

  it("subscribe fires when the storage key changes", async () => {
    const adapter = new ChromeStorageAdapter();
    const listener = vi.fn();
    adapter.subscribe(listener);

    const vault = makeVault({ tags: ["changed"] });
    mock.emitChange({ "ankiski.vault": { newValue: vault } });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(vault);
  });

  it("subscribe ignores changes to other keys", async () => {
    const adapter = new ChromeStorageAdapter();
    const listener = vi.fn();
    adapter.subscribe(listener);

    mock.emitChange({ "other.key": { newValue: "x" } });

    expect(listener).not.toHaveBeenCalled();
  });

  it("unsubscribe stops notifications", async () => {
    const adapter = new ChromeStorageAdapter();
    const listener = vi.fn();
    const unsubscribe = adapter.subscribe(listener);
    unsubscribe();

    mock.emitChange({ "ankiski.vault": { newValue: makeVault() } });

    expect(listener).not.toHaveBeenCalled();
  });
});
