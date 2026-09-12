import { describe, expect, it } from "vitest";
import { createExtensionChromeMock } from "../testing/chrome-mock.ts";
import { DRAFT_KEY, type Draft, peekDraft, saveDraft, takeDraft } from "./draft.ts";

const draft: Draft = {
  term: "ubiquitous",
  example: "The word ubiquitous appears here.",
  sourceUrl: "https://example.com/article",
  createdAt: "2026-01-01T00:00:00.000Z",
};

describe("saveDraft", () => {
  it("writes to the session area when it exists", async () => {
    const mock = createExtensionChromeMock();

    await saveDraft(draft, mock.chrome.storage);

    expect(mock.chrome.storage.session.store[DRAFT_KEY]).toEqual(draft);
    expect(mock.chrome.storage.local.store[DRAFT_KEY]).toBeUndefined();
  });

  it("falls back to the local area when session storage is unavailable", async () => {
    const mock = createExtensionChromeMock();
    const storage = { local: mock.chrome.storage.local };

    await saveDraft(draft, storage);

    expect(mock.chrome.storage.local.store[DRAFT_KEY]).toEqual(draft);
  });
});

describe("takeDraft", () => {
  it("returns the stored draft and clears it", async () => {
    const mock = createExtensionChromeMock();
    await saveDraft(draft, mock.chrome.storage);

    expect(await takeDraft(mock.chrome.storage)).toEqual(draft);
    expect(await takeDraft(mock.chrome.storage)).toBeNull();
  });

  it("returns null when nothing was captured", async () => {
    const mock = createExtensionChromeMock();
    expect(await takeDraft(mock.chrome.storage)).toBeNull();
  });

  it("discards a malformed draft", async () => {
    const mock = createExtensionChromeMock();
    await mock.chrome.storage.session.set({ [DRAFT_KEY]: { term: 42 } });

    expect(await takeDraft(mock.chrome.storage)).toBeNull();
  });

  it("reads a draft that was written to the local fallback", async () => {
    const mock = createExtensionChromeMock();
    await saveDraft(draft, { local: mock.chrome.storage.local });

    expect(await takeDraft({ local: mock.chrome.storage.local })).toEqual(draft);
  });
});

describe("peekDraft", () => {
  it("reads without clearing", async () => {
    const mock = createExtensionChromeMock();
    await saveDraft(draft, mock.chrome.storage);

    expect(await peekDraft(mock.chrome.storage)).toEqual(draft);
    expect(await peekDraft(mock.chrome.storage)).toEqual(draft);
  });
});
