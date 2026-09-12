import { createEmptyVault, createTerm, upsertTerm } from "@ankiski/core";
import { MemoryAdapter } from "@ankiski/storage";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DRAFT_KEY } from "../shared/draft.ts";
import type { ExtensionChromeMock } from "../testing/chrome-mock.ts";
import { createExtensionChromeMock } from "../testing/chrome-mock.ts";
import { CONTEXT_MENU_ID, CONTEXT_MENU_TITLE } from "./capture.ts";
import { startServiceWorker } from "./service-worker.ts";

function pendingVault(count: number) {
  let vault = createEmptyVault();
  for (let i = 0; i < count; i += 1) {
    vault = upsertTerm(vault, createTerm({ term: `t${i}`, meaningJa: "意味" }, { id: `id-${i}` }));
  }
  return vault;
}

/** Lets the promise chains inside the listeners settle. */
async function flush() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("startServiceWorker", () => {
  let mock: ExtensionChromeMock;
  let adapter: MemoryAdapter;
  let stop: () => void;

  beforeEach(() => {
    mock = createExtensionChromeMock({ version: "1.2.3" });
    adapter = new MemoryAdapter(createEmptyVault());
    stop = startServiceWorker(mock.chrome, adapter);
  });

  afterEach(() => {
    stop();
  });

  it("registers the context menu on install", async () => {
    mock.fireInstalled();
    await flush();

    expect(mock.createdMenus).toEqual([
      { id: CONTEXT_MENU_ID, title: CONTEXT_MENU_TITLE, contexts: ["selection"] },
    ]);
  });

  it("paints the badge from the stored vault on startup", async () => {
    await adapter.save(pendingVault(3));
    stop();
    stop = startServiceWorker(mock.chrome, adapter);
    await flush();

    expect(mock.badgeText).toBe("3");
  });

  it("repaints the badge when storage changes", async () => {
    await flush();
    expect(mock.badgeText).toBe("");

    await adapter.save(pendingVault(2));
    mock.emitChange({ "ankiski.vault": { newValue: pendingVault(2) } });
    await flush();

    expect(mock.badgeText).toBe("2");
  });

  it("ignores changes from other storage areas", async () => {
    await adapter.save(pendingVault(2));
    mock.emitChange({ "ankiski.vault": { newValue: pendingVault(2) } }, "sync");
    await flush();

    expect(mock.badgeText).toBe("");
  });

  it("answers a bridge ping from an allowed origin with the manifest version", async () => {
    const response = await mock.sendExternal(
      { type: "ankiski/ping" },
      { origin: "https://nasustim.github.io" },
    );

    expect(response).toEqual({ ok: true, type: "ankiski/pong", version: "1.2.3" });
  });

  it("serves the vault over the bridge", async () => {
    const vault = pendingVault(1);
    await adapter.save(vault);

    const response = await mock.sendExternal(
      { type: "ankiski/load" },
      { origin: "http://localhost:5173" },
    );

    expect(response).toEqual({ ok: true, type: "ankiski/vault", vault });
  });

  it("accepts a save over the bridge", async () => {
    const vault = pendingVault(2);

    const response = await mock.sendExternal(
      { type: "ankiski/save", vault },
      { origin: "https://nasustim.github.io" },
    );

    expect(response).toEqual({ ok: true, type: "ankiski/saved" });
    expect(await adapter.load()).toEqual(vault);
  });

  it("rejects a bridge message from an unknown origin", async () => {
    const response = await mock.sendExternal(
      { type: "ankiski/load" },
      { origin: "https://evil.example" },
    );

    expect(response).toEqual({ ok: false, error: "origin not allowed" });
  });

  it("stores a draft and opens the popup when the context menu is clicked", async () => {
    mock.fireInstalled();
    mock.clickContextMenu(
      { menuItemId: CONTEXT_MENU_ID, selectionText: "ubiquitous" },
      { id: 7, url: "https://example.com/article" },
    );
    await flush();

    expect(mock.chrome.storage.session.store[DRAFT_KEY]).toMatchObject({
      term: "ubiquitous",
      sourceUrl: "https://example.com/article",
    });
    expect(mock.openPopupCalls).toBe(1);
  });

  it("detaches the bridge on stop", async () => {
    stop();

    const response = await Promise.race([
      mock.sendExternal({ type: "ankiski/ping" }, { origin: "https://nasustim.github.io" }),
      new Promise((resolve) => setTimeout(() => resolve("no-listener"), 10)),
    ]);

    expect(response).toBe("no-listener");
    stop = () => {};
  });
});
