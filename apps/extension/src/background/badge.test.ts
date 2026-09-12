import type { Term, Vault } from "@ankiski/core";
import { createEmptyVault, createTerm, upsertTerm } from "@ankiski/core";
import { describe, expect, it, vi } from "vitest";
import { badgeText, updateBadge } from "./badge.ts";

function vaultWith(terms: Term[]): Vault {
  return terms.reduce((vault, term) => upsertTerm(vault, term), createEmptyVault());
}

function term(n: number, extra: Partial<Term> = {}): Term {
  return {
    ...createTerm({ term: `term-${n}`, meaningJa: "意味" }, { id: `id-${n}` }),
    ...extra,
  };
}

describe("badgeText", () => {
  it("is empty when nothing is pending", () => {
    expect(badgeText(createEmptyVault())).toBe("");
  });

  it("counts terms that were never exported", () => {
    expect(badgeText(vaultWith([term(1), term(2), term(3)]))).toBe("3");
  });

  it("ignores terms exported after their last edit", () => {
    const exported = term(1, {
      updatedAt: "2026-01-01T00:00:00.000Z",
      exportedAt: "2026-01-02T00:00:00.000Z",
    });
    expect(badgeText(vaultWith([exported, term(2)]))).toBe("1");
  });

  it("counts terms edited after their last export", () => {
    const stale = term(1, {
      updatedAt: "2026-01-03T00:00:00.000Z",
      exportedAt: "2026-01-02T00:00:00.000Z",
    });
    expect(badgeText(vaultWith([stale]))).toBe("1");
  });

  it("ignores soft-deleted terms", () => {
    const deleted = term(1, { deletedAt: "2026-01-02T00:00:00.000Z" });
    expect(badgeText(vaultWith([deleted, term(2)]))).toBe("1");
  });

  it("shows 99 at the boundary", () => {
    const terms = Array.from({ length: 99 }, (_, i) => term(i));
    expect(badgeText(vaultWith(terms))).toBe("99");
  });

  it("caps at 99+", () => {
    const terms = Array.from({ length: 140 }, (_, i) => term(i));
    expect(badgeText(vaultWith(terms))).toBe("99+");
  });
});

describe("updateBadge", () => {
  it("writes the badge text and background colour", async () => {
    const action = {
      setBadgeText: vi.fn(async () => {}),
      setBadgeBackgroundColor: vi.fn(async () => {}),
    };

    await updateBadge(vaultWith([term(1), term(2)]), action);

    expect(action.setBadgeText).toHaveBeenCalledWith({ text: "2" });
    expect(action.setBadgeBackgroundColor).toHaveBeenCalledTimes(1);
  });

  it("clears the badge when nothing is pending", async () => {
    const action = {
      setBadgeText: vi.fn(async () => {}),
      setBadgeBackgroundColor: vi.fn(async () => {}),
    };

    await updateBadge(createEmptyVault(), action);

    expect(action.setBadgeText).toHaveBeenCalledWith({ text: "" });
  });

  it("swallows errors from the action API", async () => {
    const action = {
      setBadgeText: vi.fn(async () => {
        throw new Error("no such window");
      }),
      setBadgeBackgroundColor: vi.fn(async () => {}),
    };

    await expect(updateBadge(createEmptyVault(), action)).resolves.toBeUndefined();
  });
});
