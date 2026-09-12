import { liveTerms } from "@ankiski/core";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useVaultStore } from "../store/vault-store.ts";
import { renderWithRouter, seedVault } from "../test-utils.tsx";
import { AddPage } from "./AddPage.tsx";

describe("AddPage", () => {
  beforeEach(async () => {
    await seedVault([]);
  });

  it("adds a term and announces success", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AddPage />);

    await user.type(screen.getByLabelText(/単語/), "ubiquitous");
    await user.type(screen.getByLabelText(/意味（日本語）/), "遍在する");
    await user.click(screen.getByRole("button", { name: "保存" }));

    await waitFor(() => {
      expect(liveTerms(useVaultStore.getState().vault)).toHaveLength(1);
    });
    expect(await screen.findByText(/ubiquitous を追加しました/)).toBeInTheDocument();
  });

  it("does not save when validation fails", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AddPage />);

    await user.type(screen.getByLabelText(/単語/), "ubiquitous");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findAllByText(/意味を入力してください/)).not.toHaveLength(0);
    expect(liveTerms(useVaultStore.getState().vault)).toHaveLength(0);
  });

  it("lets the success banner be dismissed", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AddPage />);

    await user.type(screen.getByLabelText(/単語/), "lucid");
    await user.type(screen.getByLabelText(/意味（英語）/), "clear");
    await user.click(screen.getByRole("button", { name: "保存" }));

    const banner = await screen.findByText(/lucid を追加しました/);
    expect(banner).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "閉じる" }));
    await waitFor(() => {
      expect(screen.queryByText(/lucid を追加しました/)).not.toBeInTheDocument();
    });
  });
});
