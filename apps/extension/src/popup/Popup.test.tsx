import { createEmptyVault, createTerm, liveTerms, upsertTerm } from "@ankiski/core";
import { MemoryAdapter } from "@ankiski/storage";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DRAFT_KEY, saveDraft } from "../shared/draft.ts";
import { SETTINGS_KEY } from "../shared/settings.ts";
import { createExtensionChromeMock } from "../testing/chrome-mock.ts";
import { Popup } from "./Popup.tsx";

function seeded() {
  let vault = createEmptyVault();
  vault = upsertTerm(
    vault,
    createTerm({ term: "alpha", meaningJa: "あるふぁ", tags: ["news"] }, { id: "a" }),
  );
  vault = upsertTerm(vault, createTerm({ term: "beta", meaningJa: "べーた" }, { id: "b" }));
  return vault;
}

describe("Popup", () => {
  it("prefills the form from the stored draft and consumes it", async () => {
    const mock = createExtensionChromeMock();
    await saveDraft(
      {
        term: "ubiquitous",
        example: "The word ubiquitous appears here.",
        sourceUrl: "https://example.com/article",
        createdAt: "2026-03-05T00:00:00.000Z",
      },
      mock.chrome.storage,
    );

    render(<Popup adapter={new MemoryAdapter(seeded())} storage={mock.chrome.storage} />);

    const termInput = await screen.findByDisplayValue("ubiquitous");
    expect(termInput).toBeInTheDocument();
    expect(screen.getByDisplayValue("The word ubiquitous appears here.")).toBeInTheDocument();
    await waitFor(() => {
      expect(mock.chrome.storage.session.store[DRAFT_KEY]).toBeUndefined();
    });
  });

  it("saves a new term through the adapter and shows a success banner", async () => {
    const mock = createExtensionChromeMock();
    const adapter = new MemoryAdapter(createEmptyVault());
    const user = userEvent.setup();

    render(<Popup adapter={adapter} storage={mock.chrome.storage} />);

    await user.type(await screen.findByLabelText(/単語/), "serendipity");
    await user.type(screen.getByLabelText(/意味（日本語）/), "偶然の幸運");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await screen.findByText("保存しました");
    const saved = liveTerms(await adapter.load());
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ term: "serendipity", meaningJa: "偶然の幸運" });
  });

  it("lists the five most recent terms, newest first", async () => {
    const mock = createExtensionChromeMock();
    let vault = createEmptyVault();
    for (let i = 0; i < 7; i += 1) {
      vault = upsertTerm(
        vault,
        createTerm(
          { term: `term-${i}`, meaningJa: `意味${i}` },
          { id: `id-${i}`, now: new Date(2026, 0, i + 1) },
        ),
      );
    }

    render(<Popup adapter={new MemoryAdapter(vault)} storage={mock.chrome.storage} />);

    const list = await screen.findByRole("list");
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(5);
    expect(items[0]).toHaveTextContent("term-6");
    expect(items[4]).toHaveTextContent("term-2");
  });

  it("links to the configured web app URL", async () => {
    const mock = createExtensionChromeMock();
    await mock.chrome.storage.sync.set({
      [SETTINGS_KEY]: { webAppUrl: "http://localhost:5173/" },
    });

    render(<Popup adapter={new MemoryAdapter(seeded())} storage={mock.chrome.storage} />);

    await waitFor(() => {
      expect(screen.getByRole("link", { name: "ankiski を開く" })).toHaveAttribute(
        "href",
        "http://localhost:5173/",
      );
    });
  });
});
