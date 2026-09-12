import { describe, expect, it } from "vitest";
import { DRAFT_KEY, peekDraft } from "../shared/draft.ts";
import type { ExtensionChromeMockOptions } from "../testing/chrome-mock.ts";
import { createExtensionChromeMock } from "../testing/chrome-mock.ts";
import {
  type CaptureDeps,
  CONTEXT_MENU_ID,
  CONTEXT_MENU_TITLE,
  handleContextMenuClick,
  openPopupSafely,
  POPUP_PATH,
  registerContextMenu,
} from "./capture.ts";

const NOW = new Date("2026-03-05T09:07:00.000Z");

function setup(options: ExtensionChromeMockOptions = {}) {
  const mock = createExtensionChromeMock(options);
  const deps: CaptureDeps = {
    scripting: mock.chrome.scripting,
    storage: mock.chrome.storage,
    action: mock.chrome.action,
    windows: mock.chrome.windows,
    runtime: mock.chrome.runtime,
    now: () => NOW,
  };
  return { mock, deps };
}

describe("registerContextMenu", () => {
  it("creates a single selection-scoped item", () => {
    const mock = createExtensionChromeMock();

    registerContextMenu(mock.chrome.contextMenus);

    expect(mock.createdMenus).toEqual([
      { id: CONTEXT_MENU_ID, title: CONTEXT_MENU_TITLE, contexts: ["selection"] },
    ]);
  });

  it("is titled 'Add to ankiski'", () => {
    expect(CONTEXT_MENU_TITLE).toBe("Add to ankiski");
  });
});

describe("handleContextMenuClick", () => {
  it("ignores clicks on other menu items", async () => {
    const { mock, deps } = setup();

    const draft = await handleContextMenuClick(
      { menuItemId: "something-else", selectionText: "ubiquitous" },
      { id: 1, url: "https://example.com/a" },
      deps,
    );

    expect(draft).toBeNull();
    expect(mock.chrome.storage.session.store[DRAFT_KEY]).toBeUndefined();
  });

  it("ignores a click with no selected text", async () => {
    const { mock, deps } = setup();

    const draft = await handleContextMenuClick(
      { menuItemId: CONTEXT_MENU_ID, selectionText: "   " },
      { id: 1, url: "https://example.com/a" },
      deps,
    );

    expect(draft).toBeNull();
    expect(mock.injections).toHaveLength(0);
  });

  it("stores a draft whose example is the surrounding sentence", async () => {
    const { mock, deps } = setup({
      executeScriptResult: [
        {
          result: {
            selection: "ubiquitous",
            context: "Nothing here. The word ubiquitous appears in this one. Then more.",
          },
        },
      ],
    });

    const draft = await handleContextMenuClick(
      { menuItemId: CONTEXT_MENU_ID, selectionText: "ubiquitous" },
      { id: 42, url: "https://example.com/article" },
      deps,
    );

    expect(draft).toEqual({
      term: "ubiquitous",
      example: "The word ubiquitous appears in this one.",
      sourceUrl: "https://example.com/article",
      createdAt: NOW.toISOString(),
    });
    expect(await peekDraft(mock.chrome.storage)).toEqual(draft);
  });

  it("injects into the clicked tab", async () => {
    const { mock, deps } = setup();

    await handleContextMenuClick(
      { menuItemId: CONTEXT_MENU_ID, selectionText: "ubiquitous" },
      { id: 42, url: "https://example.com/article" },
      deps,
    );

    expect(mock.injections).toHaveLength(1);
    expect(mock.injections[0]?.target).toEqual({ tabId: 42 });
  });

  it("falls back to the raw selection when the injection returns nothing", async () => {
    const { deps } = setup({ executeScriptResult: [] });

    const draft = await handleContextMenuClick(
      { menuItemId: CONTEXT_MENU_ID, selectionText: "  ubiquitous  " },
      { id: 42, url: "https://example.com/article" },
      deps,
    );

    expect(draft?.term).toBe("ubiquitous");
    expect(draft?.example).toBe("ubiquitous");
  });

  it("falls back when the injection is refused (e.g. a chrome:// page)", async () => {
    const { deps } = setup({ executeScriptError: new Error("Cannot access contents of url") });

    const draft = await handleContextMenuClick(
      { menuItemId: CONTEXT_MENU_ID, selectionText: "ubiquitous" },
      { id: 42, url: "https://example.com/article" },
      deps,
    );

    expect(draft?.example).toBe("ubiquitous");
  });

  it("skips injection when the tab has no id", async () => {
    const { mock, deps } = setup();

    const draft = await handleContextMenuClick(
      {
        menuItemId: CONTEXT_MENU_ID,
        selectionText: "ubiquitous",
        pageUrl: "https://example.com/p",
      },
      undefined,
      deps,
    );

    expect(mock.injections).toHaveLength(0);
    expect(draft?.sourceUrl).toBe("https://example.com/p");
  });

  it("prefers the tab URL over the page URL", async () => {
    const { deps } = setup();

    const draft = await handleContextMenuClick(
      {
        menuItemId: CONTEXT_MENU_ID,
        selectionText: "ubiquitous",
        pageUrl: "https://example.com/p",
      },
      { id: 1, url: "https://example.com/tab" },
      deps,
    );

    expect(draft?.sourceUrl).toBe("https://example.com/tab");
  });

  it("leaves the source blank when neither URL is known", async () => {
    const { deps } = setup();

    const draft = await handleContextMenuClick(
      { menuItemId: CONTEXT_MENU_ID, selectionText: "ubiquitous" },
      undefined,
      deps,
    );

    expect(draft?.sourceUrl).toBe("");
  });

  it("opens the popup after storing the draft", async () => {
    const { mock, deps } = setup();

    await handleContextMenuClick(
      { menuItemId: CONTEXT_MENU_ID, selectionText: "ubiquitous" },
      { id: 1, url: "https://example.com/a" },
      deps,
    );

    expect(mock.openPopupCalls).toBe(1);
    expect(mock.createdWindows).toHaveLength(0);
  });

  it("falls back to a popup window when action.openPopup is refused", async () => {
    const { mock, deps } = setup({ openPopupError: new Error("no user gesture") });

    await handleContextMenuClick(
      { menuItemId: CONTEXT_MENU_ID, selectionText: "ubiquitous" },
      { id: 1, url: "https://example.com/a" },
      deps,
    );

    expect(mock.createdWindows).toHaveLength(1);
    expect(mock.createdWindows[0]).toMatchObject({ type: "popup" });
    expect(String(mock.createdWindows[0]?.url)).toContain(POPUP_PATH);
  });
});

describe("openPopupSafely", () => {
  it("uses action.openPopup when it succeeds", async () => {
    const { mock, deps } = setup();

    await openPopupSafely(deps);

    expect(mock.openPopupCalls).toBe(1);
    expect(mock.createdWindows).toHaveLength(0);
  });

  it("swallows a failure of the window fallback too", async () => {
    const { deps } = setup({ openPopupError: new Error("nope") });
    const broken: typeof deps = {
      ...deps,
      windows: {
        create: async () => {
          throw new Error("also nope");
        },
      },
    };

    await expect(openPopupSafely(broken)).resolves.toBeUndefined();
  });
});
