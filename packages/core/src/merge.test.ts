import { mergeVaults } from "./merge.ts";
import type { Term, Vault } from "./types.ts";

const t0 = "2026-09-01T00:00:00.000Z";
const t1 = "2026-09-02T00:00:00.000Z";
const t2 = "2026-09-03T00:00:00.000Z";
const t3 = "2026-09-04T00:00:00.000Z";

function term(overrides: Partial<Term> & { id: string }): Term {
  return {
    term: overrides.id.toLowerCase(),
    meaningEn: "meaning",
    tags: [],
    createdAt: t0,
    updatedAt: t0,
    ...overrides,
  };
}

function vault(terms: Term[], overrides: Partial<Vault> = {}): Vault {
  return { schemaVersion: 1, updatedAt: t0, terms, tags: [], ...overrides };
}

describe("mergeVaults", () => {
  it("unions terms by id", () => {
    const a = vault([term({ id: "A" })]);
    const b = vault([term({ id: "B" })]);
    const merged = mergeVaults(a, b);
    expect(merged.terms.map((t) => t.id).sort()).toEqual(["A", "B"]);
  });

  it("keeps the term with the newer updatedAt on conflict", () => {
    const a = vault([term({ id: "A", meaningEn: "old", updatedAt: t1 })]);
    const b = vault([term({ id: "A", meaningEn: "new", updatedAt: t2 })]);
    expect(mergeVaults(a, b).terms[0]?.meaningEn).toBe("new");
    expect(mergeVaults(b, a).terms[0]?.meaningEn).toBe("new");
  });

  it("lets a tombstone beat an older edit", () => {
    const edit = term({ id: "A", meaningEn: "edited", updatedAt: t1 });
    const tomb = term({ id: "A", updatedAt: t2, deletedAt: t2 });
    const merged = mergeVaults(vault([edit]), vault([tomb]));
    expect(merged.terms[0]?.deletedAt).toBe(t2);
    expect(merged.terms[0]?.meaningEn).toBe("meaning");
  });

  it("lets a newer edit resurrect a tombstone", () => {
    const tomb = term({ id: "A", updatedAt: t1, deletedAt: t1 });
    const edit = term({ id: "A", meaningEn: "back", updatedAt: t2 });
    const merged = mergeVaults(vault([tomb]), vault([edit]));
    expect(merged.terms[0]?.deletedAt).toBeUndefined();
    expect(merged.terms[0]?.meaningEn).toBe("back");
  });

  it("uses the max exportedAt when both are present, and keeps the only one otherwise", () => {
    const a = vault([term({ id: "A", updatedAt: t2, exportedAt: t1 })]);
    const b = vault([term({ id: "A", updatedAt: t1, exportedAt: t3 })]);
    expect(mergeVaults(a, b).terms[0]?.exportedAt).toBe(t3);

    const c = vault([term({ id: "A", updatedAt: t1 })]);
    const d = vault([term({ id: "A", updatedAt: t2, exportedAt: t1 })]);
    expect(mergeVaults(c, d).terms[0]?.exportedAt).toBe(t1);
    expect(mergeVaults(d, c).terms[0]?.exportedAt).toBe(t1);
  });

  it("unions vault tags with live terms' tags, sorted", () => {
    const a = vault([term({ id: "A", tags: ["z"] })], { tags: ["b"] });
    const dead = term({ id: "D", tags: ["dead"], deletedAt: t1, updatedAt: t1 });
    const b = vault([term({ id: "B", tags: ["m"] }), dead], { tags: ["a"] });
    expect(mergeVaults(a, b).tags).toEqual(["a", "b", "m", "z"]);
  });

  it("uses the max updatedAt of both vaults", () => {
    const a = vault([], { updatedAt: t1 });
    const b = vault([], { updatedAt: t3 });
    expect(mergeVaults(a, b).updatedAt).toBe(t3);
    expect(mergeVaults(b, a).updatedAt).toBe(t3);
  });

  it("sorts terms by createdAt then id for determinism", () => {
    const a = vault([term({ id: "B", createdAt: t1 }), term({ id: "Z", createdAt: t0 })]);
    const b = vault([term({ id: "A", createdAt: t1 })]);
    expect(mergeVaults(a, b).terms.map((t) => t.id)).toEqual(["Z", "A", "B"]);
    expect(mergeVaults(b, a).terms.map((t) => t.id)).toEqual(["Z", "A", "B"]);
  });

  it("does not mutate its inputs", () => {
    const a = vault([term({ id: "A", tags: ["x"] })], { tags: ["q"], updatedAt: t1 });
    const b = vault([term({ id: "A", updatedAt: t2, tags: ["y"] })], { updatedAt: t2 });
    const aSnapshot = structuredClone(a);
    const bSnapshot = structuredClone(b);
    mergeVaults(a, b);
    expect(a).toEqual(aSnapshot);
    expect(b).toEqual(bSnapshot);
  });

  it("returns schemaVersion 1", () => {
    expect(mergeVaults(vault([]), vault([])).schemaVersion).toBe(1);
  });
});
