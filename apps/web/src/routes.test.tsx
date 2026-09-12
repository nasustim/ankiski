import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { AppRoutes } from "./routes.tsx";
import { renderWithRouter, seedVault } from "./test-utils.tsx";

describe("AppRoutes", () => {
  beforeEach(async () => {
    await seedVault([]);
  });

  it("renders the Terms page at /", async () => {
    renderWithRouter(<AppRoutes />, "/");
    expect(await screen.findByRole("heading", { name: "単語一覧" })).toBeInTheDocument();
  });

  it("renders a main landmark and a nav", () => {
    renderWithRouter(<AppRoutes />, "/");
    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "メインナビゲーション" })).toBeInTheDocument();
  });

  it.each([
    ["/add", "単語を追加"],
    ["/export", "書き出し"],
    ["/settings", "設定"],
  ])("renders %s", async (path, heading) => {
    renderWithRouter(<AppRoutes />, path);
    expect(await screen.findByRole("heading", { name: heading, level: 1 })).toBeInTheDocument();
  });

  it("navigates between pages through the header links", async () => {
    const user = userEvent.setup();
    renderWithRouter(<AppRoutes />, "/");
    await user.click(screen.getByRole("link", { name: "追加" }));
    expect(await screen.findByRole("heading", { name: "単語を追加" })).toBeInTheDocument();
  });

  it("falls back to the Terms page for unknown paths", async () => {
    renderWithRouter(<AppRoutes />, "/nope");
    expect(await screen.findByRole("heading", { name: "単語一覧" })).toBeInTheDocument();
  });
});
