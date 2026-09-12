import type { Vault } from "@ankiski/core";
import { describe, expect, it, vi } from "vitest";
import { emptyVault } from "./empty.ts";
import { MemoryAdapter } from "./memory.ts";

function makeVault(overrides: Partial<Vault> = {}): Vault {
  return {
    ...emptyVault(new Date("2024-01-01T00:00:00.000Z")),
    ...overrides,
  };
}

describe("MemoryAdapter", () => {
  it("has kind 'memory'", () => {
    const adapter = new MemoryAdapter();
    expect(adapter.kind).toBe("memory");
  });

  it("isAvailable resolves true", async () => {
    const adapter = new MemoryAdapter();
    await expect(adapter.isAvailable()).resolves.toBe(true);
  });

  it("load returns an empty vault when no initial vault is given", async () => {
    const adapter = new MemoryAdapter();
    const vault = await adapter.load();
    expect(vault.terms).toEqual([]);
    expect(vault.tags).toEqual([]);
    expect(vault.schemaVersion).toBe(1);
  });

  it("load/save roundtrip", async () => {
    const adapter = new MemoryAdapter();
    const vault = makeVault({ tags: ["a"] });
    await adapter.save(vault);
    const loaded = await adapter.load();
    expect(loaded).toEqual(vault);
  });

  it("uses the initial vault provided in the constructor", async () => {
    const vault = makeVault({ tags: ["seed"] });
    const adapter = new MemoryAdapter(vault);
    const loaded = await adapter.load();
    expect(loaded).toEqual(vault);
  });

  it("isolates stored data: mutating the returned vault does not affect storage", async () => {
    const adapter = new MemoryAdapter();
    const vault = makeVault({ tags: ["a"] });
    await adapter.save(vault);
    const loaded = await adapter.load();
    loaded.tags.push("mutated");

    const loadedAgain = await adapter.load();
    expect(loadedAgain.tags).toEqual(["a"]);
  });

  it("isolates stored data: mutating the vault passed to save does not affect storage", async () => {
    const adapter = new MemoryAdapter();
    const vault = makeVault({ tags: ["a"] });
    await adapter.save(vault);
    vault.tags.push("mutated-after-save");

    const loaded = await adapter.load();
    expect(loaded.tags).toEqual(["a"]);
  });

  it("notifies subscribers on save", async () => {
    const adapter = new MemoryAdapter();
    const listener = vi.fn();
    adapter.subscribe(listener);

    const vault = makeVault({ tags: ["x"] });
    await adapter.save(vault);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(vault);
  });

  it("unsubscribe stops notifications", async () => {
    const adapter = new MemoryAdapter();
    const listener = vi.fn();
    const unsubscribe = adapter.subscribe(listener);
    unsubscribe();

    await adapter.save(makeVault());

    expect(listener).not.toHaveBeenCalled();
  });
});
