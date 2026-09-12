import { createEmptyVault, createTerm, liveTerms, upsertTerm } from "@ankiski/core";
import { MemoryAdapter, serializeVault } from "@ankiski/storage";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_WEB_APP_URL, SETTINGS_KEY } from "../shared/settings.ts";
import { createExtensionChromeMock } from "../testing/chrome-mock.ts";
import { Options } from "./Options.tsx";

function seeded() {
  let vault = createEmptyVault();
  vault = upsertTerm(vault, createTerm({ term: "alpha", meaningJa: "あるふぁ" }, { id: "a" }));
  vault = upsertTerm(vault, {
    ...createTerm({ term: "beta", meaningJa: "べーた" }, { id: "b" }),
    updatedAt: "2026-01-01T00:00:00.000Z",
    exportedAt: "2026-01-02T00:00:00.000Z",
  });
  return vault;
}

beforeEach(() => {
  // jsdom has no object URL support and no real downloads.
  URL.createObjectURL = vi.fn(() => "blob:mock");
  URL.revokeObjectURL = vi.fn();
});

describe("Options", () => {
  it("shows total and not-yet-exported counts", async () => {
    const mock = createExtensionChromeMock();

    render(<Options adapter={new MemoryAdapter(seeded())} storage={mock.chrome.storage} />);

    const total = await screen.findByText("登録済みの単語");
    expect(total.nextElementSibling).toHaveTextContent("2");
    expect(screen.getByText("未書き出しの単語").nextElementSibling).toHaveTextContent("1");
  });

  it("persists a valid web app URL", async () => {
    const mock = createExtensionChromeMock();
    const user = userEvent.setup();

    render(<Options adapter={new MemoryAdapter(seeded())} storage={mock.chrome.storage} />);

    const input = await screen.findByLabelText("ankiski を開くリンク先");
    await user.clear(input);
    await user.type(input, "http://localhost:5173/");
    await user.click(screen.getByRole("button", { name: "URL を保存" }));

    await screen.findByText("設定を保存しました");
    expect(mock.chrome.storage.sync.store[SETTINGS_KEY]).toEqual({
      webAppUrl: "http://localhost:5173/",
    });
  });

  it("reports an invalid web app URL and restores the default", async () => {
    const mock = createExtensionChromeMock();
    const user = userEvent.setup();

    render(<Options adapter={new MemoryAdapter(seeded())} storage={mock.chrome.storage} />);

    const input = await screen.findByLabelText("ankiski を開くリンク先");
    await user.clear(input);
    await user.type(input, "not a url");
    await user.click(screen.getByRole("button", { name: "URL を保存" }));

    await screen.findByText("URL が正しくありません");
    expect(input).toHaveValue(DEFAULT_WEB_APP_URL);
  });

  it("downloads the vault as JSON", async () => {
    const mock = createExtensionChromeMock();
    const user = userEvent.setup();

    render(<Options adapter={new MemoryAdapter(seeded())} storage={mock.chrome.storage} />);

    await user.click(await screen.findByRole("button", { name: "vault.json を書き出す" }));

    await screen.findByText("vault.json を書き出しました");
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
  });

  it("merges an imported vault.json and reports the count", async () => {
    const mock = createExtensionChromeMock();
    const adapter = new MemoryAdapter(seeded());
    const user = userEvent.setup();

    let incoming = createEmptyVault();
    incoming = upsertTerm(
      incoming,
      createTerm({ term: "gamma", meaningJa: "がんま" }, { id: "c" }),
    );
    const file = new File([serializeVault(incoming)], "vault.json", { type: "application/json" });

    render(<Options adapter={adapter} storage={mock.chrome.storage} />);

    await user.upload(await screen.findByLabelText("vault.json を読み込む"), file);

    await screen.findByText("vault.json を読み込みました");
    expect(screen.getByText("1 件の単語を取り込みました。")).toBeInTheDocument();
    await waitFor(async () => {
      expect(liveTerms(await adapter.load())).toHaveLength(3);
    });
  });

  it("reports a malformed vault.json without saving", async () => {
    const mock = createExtensionChromeMock();
    const adapter = new MemoryAdapter(seeded());
    const user = userEvent.setup();
    const file = new File(["{ not json"], "vault.json", { type: "application/json" });

    render(<Options adapter={adapter} storage={mock.chrome.storage} />);

    await user.upload(await screen.findByLabelText("vault.json を読み込む"), file);

    await screen.findByText("読み込みに失敗しました");
    expect(liveTerms(await adapter.load())).toHaveLength(2);
  });
});
