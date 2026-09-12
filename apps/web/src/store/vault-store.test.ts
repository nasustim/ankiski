import { createTerm, liveTerms } from "@ankiski/core";
import { MemoryAdapter } from "@ankiski/storage";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createVaultStore, SAVE_DEBOUNCE_MS } from "./vault-store.ts";

function setup(adapter = new MemoryAdapter()) {
  const store = createVaultStore();
  return { store, adapter };
}

describe("vault store", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts empty and not ready", () => {
    const { store } = setup();
    expect(store.getState().status).toBe("idle");
    expect(store.getState().vault.terms).toEqual([]);
    expect(store.getState().mode).toBeUndefined();
  });

  it("init loads the vault from the injected adapter", async () => {
    const seeded = createTerm({ term: "ubiquitous", meaningJa: "遍在する" });
    const adapter = new MemoryAdapter();
    await adapter.save({
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      terms: [seeded],
      tags: [],
    });

    const { store } = setup();
    await store.getState().init({ adapter, mode: "memory" });

    expect(store.getState().status).toBe("ready");
    expect(store.getState().mode).toBe("memory");
    expect(store.getState().vault.terms).toHaveLength(1);
  });

  it("addTerm appends a term and persists after the debounce window", async () => {
    const { store, adapter } = setup();
    const save = vi.spyOn(adapter, "save");
    await store.getState().init({ adapter, mode: "memory" });

    store.getState().addTerm({ term: "candid", meaningEn: "frank" });
    expect(liveTerms(store.getState().vault)).toHaveLength(1);
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);
    expect(save).toHaveBeenCalledTimes(1);
    expect((await adapter.load()).terms).toHaveLength(1);
  });

  it("coalesces rapid mutations into a single save", async () => {
    const { store, adapter } = setup();
    const save = vi.spyOn(adapter, "save");
    await store.getState().init({ adapter, mode: "memory" });

    store.getState().addTerm({ term: "a", meaningEn: "a" });
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS / 2);
    store.getState().addTerm({ term: "b", meaningEn: "b" });
    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS);

    expect(save).toHaveBeenCalledTimes(1);
    expect((await adapter.load()).terms).toHaveLength(2);
  });

  it("updateTerm patches an existing term", async () => {
    const { store, adapter } = setup();
    await store.getState().init({ adapter, mode: "memory" });
    const created = store.getState().addTerm({ term: "candid", meaningEn: "frank" });

    store.getState().updateTerm(created.id, { meaningJa: "率直な" });

    const [updated] = liveTerms(store.getState().vault);
    expect(updated?.meaningJa).toBe("率直な");
  });

  it("deleteTerm tombstones instead of dropping the row", async () => {
    const { store, adapter } = setup();
    await store.getState().init({ adapter, mode: "memory" });
    const created = store.getState().addTerm({ term: "candid", meaningEn: "frank" });

    store.getState().deleteTerms([created.id]);

    expect(liveTerms(store.getState().vault)).toHaveLength(0);
    expect(store.getState().vault.terms[0]?.deletedAt).toBeDefined();
  });

  it("markExported stamps exportedAt without bumping updatedAt", async () => {
    const { store, adapter } = setup();
    await store.getState().init({ adapter, mode: "memory" });
    const created = store.getState().addTerm({ term: "candid", meaningEn: "frank" });

    store.getState().markExported([created.id]);

    const [marked] = liveTerms(store.getState().vault);
    expect(marked?.exportedAt).toBeDefined();
    expect(marked?.updatedAt).toBe(created.updatedAt);
  });

  it("importJson merges a vault.json payload and reports the imported count", async () => {
    const { store, adapter } = setup();
    await store.getState().init({ adapter, mode: "memory" });

    const incoming = {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      terms: [createTerm({ term: "lucid", meaningJa: "明快な" })],
      tags: [],
    };
    const imported = await store.getState().importJson(JSON.stringify(incoming));

    expect(imported).toBe(1);
    expect(liveTerms(store.getState().vault)).toHaveLength(1);
  });

  it("importJson rejects malformed payloads and leaves the vault untouched", async () => {
    const { store, adapter } = setup();
    await store.getState().init({ adapter, mode: "memory" });

    await expect(store.getState().importJson("not json")).rejects.toThrow();
    expect(store.getState().vault.terms).toHaveLength(0);
  });

  it("exportJson serializes the current vault", async () => {
    const { store, adapter } = setup();
    await store.getState().init({ adapter, mode: "memory" });
    store.getState().addTerm({ term: "lucid", meaningJa: "明快な" });

    const text = store.getState().exportJson();
    expect(JSON.parse(text).terms).toHaveLength(1);
  });

  it("adopts vaults pushed by the adapter", async () => {
    const { store, adapter } = setup();
    await store.getState().init({ adapter, mode: "memory" });

    await adapter.save({
      schemaVersion: 1,
      updatedAt: new Date(Date.now() + 1000).toISOString(),
      terms: [createTerm({ term: "pushed", meaningEn: "from elsewhere" })],
      tags: [],
    });

    expect(liveTerms(store.getState().vault)).toHaveLength(1);
  });

  it("flush saves immediately and cancels the pending debounce", async () => {
    const { store, adapter } = setup();
    const save = vi.spyOn(adapter, "save");
    await store.getState().init({ adapter, mode: "memory" });

    store.getState().addTerm({ term: "candid", meaningEn: "frank" });
    await store.getState().flush();
    expect(save).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(SAVE_DEBOUNCE_MS * 2);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("knownTags unions vault tags and tags in use", async () => {
    const { store, adapter } = setup();
    await store.getState().init({ adapter, mode: "memory" });
    store.getState().addTerm({ term: "candid", meaningEn: "frank", tags: ["toeic", "b2"] });

    expect(store.getState().knownTags()).toEqual(["b2", "toeic"]);
  });
});
