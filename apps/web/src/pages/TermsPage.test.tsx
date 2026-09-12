import { liveTerms } from "@ankiski/core";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useVaultStore } from "../store/vault-store.ts";
import { makeTerm, renderWithRouter, seedVault } from "../test-utils.tsx";
import { TermsPage } from "./TermsPage.tsx";

const alpha = makeTerm(
  { term: "alpha", meaningJa: "最初", tags: ["toeic"] },
  { updatedAt: "2026-01-01T00:00:00.000Z", createdAt: "2026-01-01T00:00:00.000Z" },
);
const bravo = makeTerm(
  { term: "bravo", meaningEn: "well done", tags: ["daily"] },
  { updatedAt: "2026-02-01T00:00:00.000Z", createdAt: "2026-02-01T00:00:00.000Z" },
);

function bodyRows() {
  const table = screen.getByRole("table");
  const body = within(table).getAllByRole("rowgroup")[1];
  return within(body as HTMLElement).getAllByRole("row");
}

describe("TermsPage", () => {
  beforeEach(async () => {
    await seedVault([alpha, bravo]);
  });

  it("lists live terms", async () => {
    renderWithRouter(<TermsPage />);
    expect(await screen.findByText("alpha")).toBeInTheDocument();
    expect(screen.getByText("bravo")).toBeInTheDocument();
    expect(bodyRows()).toHaveLength(2);
  });

  it("shows an empty state when there are no terms", async () => {
    await seedVault([]);
    renderWithRouter(<TermsPage />);
    expect(await screen.findByText(/単語がまだありません/)).toBeInTheDocument();
  });

  it("filters by the search box", async () => {
    const user = userEvent.setup();
    renderWithRouter(<TermsPage />);
    await user.type(screen.getByLabelText("検索"), "brav");
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText("bravo")).toBeInTheDocument();
  });

  it("filters by tag chips", async () => {
    const user = userEvent.setup();
    renderWithRouter(<TermsPage />);
    await user.click(screen.getByRole("button", { name: "タグ toeic で絞り込む" }));
    expect(bodyRows()).toHaveLength(1);
    expect(screen.getByText("alpha")).toBeInTheDocument();
  });

  it("sorts by a column header and toggles direction", async () => {
    const user = userEvent.setup();
    renderWithRouter(<TermsPage />);
    const header = screen.getByRole("button", { name: /単語/ });

    await user.click(header);
    expect(within(bodyRows()[0] as HTMLElement).getByText("alpha")).toBeInTheDocument();

    await user.click(header);
    expect(within(bodyRows()[0] as HTMLElement).getByText("bravo")).toBeInTheDocument();
  });

  it("bulk deletes selected rows after confirmation", async () => {
    const user = userEvent.setup();
    renderWithRouter(<TermsPage />);

    await user.click(screen.getByRole("checkbox", { name: "alpha を選択" }));
    await user.click(screen.getByRole("button", { name: /選択した 1 件を削除/ }));

    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "削除する" }));

    await waitFor(() => {
      expect(liveTerms(useVaultStore.getState().vault)).toHaveLength(1);
    });
  });

  it("keeps the term when the delete dialog is cancelled", async () => {
    const user = userEvent.setup();
    renderWithRouter(<TermsPage />);

    await user.click(screen.getByRole("checkbox", { name: "alpha を選択" }));
    await user.click(screen.getByRole("button", { name: /選択した 1 件を削除/ }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "キャンセル" }));

    expect(liveTerms(useVaultStore.getState().vault)).toHaveLength(2);
  });

  it("edits a term through the dialog form", async () => {
    const user = userEvent.setup();
    renderWithRouter(<TermsPage />);

    await user.click(screen.getByRole("button", { name: "alpha を編集" }));
    const dialog = await screen.findByRole("dialog");
    const meaning = within(dialog).getByLabelText(/意味（日本語）/);
    await user.clear(meaning);
    await user.type(meaning, "一番目");
    await user.click(within(dialog).getByRole("button", { name: "保存" }));

    await waitFor(() => {
      const edited = liveTerms(useVaultStore.getState().vault).find((t) => t.term === "alpha");
      expect(edited?.meaningJa).toBe("一番目");
    });
  });

  it("hides Speak buttons when speechSynthesis is unavailable", async () => {
    renderWithRouter(<TermsPage />);
    await screen.findByText("alpha");
    expect(screen.queryByRole("button", { name: /読み上げ/ })).not.toBeInTheDocument();
  });

  it("speaks a row when the Web Speech API is available", async () => {
    const speak = vi.fn();
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: {
        getVoices: () => [{ name: "Alex", lang: "en-US", voiceURI: "Alex:en-US" }],
        speak,
        cancel: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: class {
        lang = "";
        voice: unknown = null;
        constructor(public text: string) {}
      },
    });

    const user = userEvent.setup();
    renderWithRouter(<TermsPage />);
    await user.click(await screen.findByRole("button", { name: "alpha を読み上げ" }));
    expect(speak).toHaveBeenCalled();

    Reflect.deleteProperty(window, "speechSynthesis");
    Reflect.deleteProperty(window, "SpeechSynthesisUtterance");
  });
});
