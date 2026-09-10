import "fake-indexeddb/auto";
import type { Vault } from "@ankiski/core";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { emptyVault } from "./empty.ts";
import { IndexedDbAdapter } from "./indexeddb.ts";

function makeVault(overrides: Partial<Vault> = {}): Vault {
  return {
    ...emptyVault(new Date("2024-01-01T00:00:00.000Z")),
    ...overrides,
  };
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
});

describe("IndexedDbAdapter", () => {
  it("has kind 'indexeddb'", () => {
    const adapter = new IndexedDbAdapter({ dbName: "test-kind" });
    expect(adapter.kind).toBe("indexeddb");
  });

  it("isAvailable resolves true when indexedDB exists", async () => {
    const adapter = new IndexedDbAdapter({ dbName: "test-available" });
    await expect(adapter.isAvailable()).resolves.toBe(true);
  });

  it("load returns an empty vault when nothing is stored", async () => {
    const adapter = new IndexedDbAdapter({ dbName: "test-empty" });
    const vault = await adapter.load();
    expect(vault.terms).toEqual([]);
    expect(vault.tags).toEqual([]);
    expect(vault.schemaVersion).toBe(1);
  });

  it("load/save roundtrip", async () => {
    const adapter = new IndexedDbAdapter({ dbName: "test-roundtrip" });
    const vault = makeVault({ tags: ["a"] });
    await adapter.save(vault);
    const loaded = await adapter.load();
    expect(loaded).toEqual(vault);
  });

  it("overwrites the stored vault on subsequent saves", async () => {
    const adapter = new IndexedDbAdapter({ dbName: "test-overwrite" });
    await adapter.save(makeVault({ tags: ["a"] }));
    await adapter.save(makeVault({ tags: ["b"] }));
    const loaded = await adapter.load();
    expect(loaded.tags).toEqual(["b"]);
  });

  it("persists across two adapter instances sharing the same dbName", async () => {
    const dbName = "test-shared";
    const first = new IndexedDbAdapter({ dbName });
    await first.save(makeVault({ tags: ["persisted"] }));

    const second = new IndexedDbAdapter({ dbName });
    const loaded = await second.load();
    expect(loaded.tags).toEqual(["persisted"]);
  });
});
