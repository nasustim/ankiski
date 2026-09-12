import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "../store/settings-store.ts";
import { useVaultStore } from "../store/vault-store.ts";
import { makeTerm, renderWithRouter, seedVault } from "../test-utils.tsx";
import { SettingsPage } from "./SettingsPage.tsx";

const downloadText = vi.hoisted(() => vi.fn());
vi.mock("../lib/download.ts", () => ({ downloadText, downloadBlob: vi.fn() }));

const alpha = makeTerm({ term: "alpha", meaningJa: "最初" });

describe("SettingsPage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    await seedVault([alpha]);
  });

  it("shows the active storage mode", async () => {
    renderWithRouter(<SettingsPage />);
    expect(await screen.findByText("メモリ（一時保存）")).toBeInTheDocument();
  });

  it("warns about backups when the extension bridge is in use", async () => {
    await seedVault([]);
    useVaultStore.setState({ mode: "extension-bridge" });
    renderWithRouter(<SettingsPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent(/バックアップ/);
  });

  it("downloads vault.json", async () => {
    const user = userEvent.setup();
    renderWithRouter(<SettingsPage />);
    await user.click(screen.getByRole("button", { name: "vault.json をダウンロード" }));

    expect(downloadText).toHaveBeenCalledTimes(1);
    const [text, fileName] = downloadText.mock.calls[0] as unknown as [string, string];
    expect(JSON.parse(text).terms).toHaveLength(1);
    expect(fileName).toMatch(/^ankiski-vault-\d{8}-\d{4}\.json$/);
  });

  it("imports vault.json and reports the count", async () => {
    const user = userEvent.setup();
    renderWithRouter(<SettingsPage />);

    const incoming = {
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      terms: [makeTerm({ term: "bravo", meaningEn: "well done" })],
      tags: [],
    };
    const file = new File([JSON.stringify(incoming)], "vault.json", { type: "application/json" });
    await user.upload(screen.getByLabelText("vault.json を読み込む"), file);

    expect(await screen.findByText(/1 件を取り込みました/)).toBeInTheDocument();
    expect(useVaultStore.getState().vault.terms).toHaveLength(2);
  });

  it("reports a malformed vault.json", async () => {
    const user = userEvent.setup();
    renderWithRouter(<SettingsPage />);

    const file = new File(["nope"], "vault.json", { type: "application/json" });
    await user.upload(screen.getByLabelText("vault.json を読み込む"), file);

    expect(await screen.findByRole("alert")).toHaveTextContent(/読み込めません/);
    expect(useVaultStore.getState().vault.terms).toHaveLength(1);
  });

  it("persists the default deck name", async () => {
    const user = userEvent.setup();
    renderWithRouter(<SettingsPage />);

    const input = screen.getByLabelText("既定のデッキ名");
    await user.clear(input);
    await user.type(input, "Deck::A");

    await waitFor(() => {
      expect(useSettingsStore.getState().deckName).toBe("Deck::A");
    });
  });

  it("links to the GitHub repository", async () => {
    renderWithRouter(<SettingsPage />);
    const link = await screen.findByRole("link", { name: /GitHub/ });
    expect(link).toHaveAttribute("href", "https://github.com/nasustim/ankiski");
  });
});
