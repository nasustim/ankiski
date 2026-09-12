import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useVaultStore } from "../store/vault-store.ts";
import { makeTerm, renderWithRouter, seedVault } from "../test-utils.tsx";
import { ExportPage } from "./ExportPage.tsx";

const exportApkg = vi.hoisted(() => vi.fn(async () => new Uint8Array([1, 2, 3])));
const downloadBlob = vi.hoisted(() => vi.fn());
const downloadText = vi.hoisted(() => vi.fn());

vi.mock("@ankiski/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ankiski/core")>()),
  exportApkg,
}));

vi.mock("../lib/download.ts", () => ({ downloadBlob, downloadText }));

const alpha = makeTerm(
  { term: "alpha", meaningJa: "最初", tags: ["toeic"] },
  { createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" },
);
const bravo = makeTerm(
  { term: "bravo", meaningEn: "well done", tags: ["daily"] },
  {
    createdAt: "2026-02-01T00:00:00.000Z",
    updatedAt: "2026-02-01T00:00:00.000Z",
    exportedAt: "2026-03-01T00:00:00.000Z",
  },
);

describe("ExportPage", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await seedVault([alpha, bravo]);
  });

  it("previews the number of terms to export", async () => {
    renderWithRouter(<ExportPage />);
    expect(await screen.findByText(/2 件を書き出します/)).toBeInTheDocument();
  });

  it("defaults the deck name", async () => {
    renderWithRouter(<ExportPage />);
    expect(await screen.findByLabelText("デッキ名")).toHaveValue("English::Vocabulary");
  });

  it("narrows the preview with the not-yet-exported filter", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExportPage />);
    await user.click(screen.getByRole("checkbox", { name: "まだ書き出していない単語のみ" }));
    expect(await screen.findByText(/1 件を書き出します/)).toBeInTheDocument();
  });

  it("narrows the preview by tag", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExportPage />);
    await user.click(screen.getByRole("checkbox", { name: "toeic" }));
    expect(await screen.findByText(/1 件を書き出します/)).toBeInTheDocument();
  });

  it("narrows the preview by date range", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExportPage />);
    await user.type(screen.getByLabelText("作成日（開始）"), "2026-01-15");
    expect(await screen.findByText(/1 件を書き出します/)).toBeInTheDocument();
  });

  it("builds and downloads an .apkg", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExportPage />);
    await user.click(screen.getByRole("button", { name: ".apkg をダウンロード" }));

    await waitFor(() => {
      expect(exportApkg).toHaveBeenCalledTimes(1);
    });
    const [terms, options] = exportApkg.mock.calls[0] as unknown as [
      unknown[],
      { deckName: string },
    ];
    expect(terms).toHaveLength(2);
    expect(options.deckName).toBe("English::Vocabulary");
    expect(downloadBlob).toHaveBeenCalled();
  });

  it("downloads a TSV as the secondary option", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExportPage />);
    await user.click(screen.getByRole("button", { name: "TSV をダウンロード" }));

    expect(downloadText).toHaveBeenCalledTimes(1);
    const [text] = downloadText.mock.calls[0] as unknown as [string];
    expect(text).toContain("#deck:English::Vocabulary");
  });

  it("offers to mark the exported terms afterwards", async () => {
    const user = userEvent.setup();
    renderWithRouter(<ExportPage />);
    await user.click(screen.getByRole("button", { name: "TSV をダウンロード" }));

    await user.click(await screen.findByRole("button", { name: "2 件を書き出し済みにする" }));

    await waitFor(() => {
      const terms = useVaultStore.getState().vault.terms;
      expect(terms.every((term) => term.exportedAt !== undefined)).toBe(true);
    });
  });

  it("surfaces an .apkg build failure", async () => {
    exportApkg.mockRejectedValueOnce(new Error("wasm missing"));
    const user = userEvent.setup();
    renderWithRouter(<ExportPage />);
    await user.click(screen.getByRole("button", { name: ".apkg をダウンロード" }));

    expect(await screen.findByText(/wasm missing/)).toBeInTheDocument();
    expect(downloadBlob).not.toHaveBeenCalled();
  });
});
