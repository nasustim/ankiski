import type { Term } from "./types.ts";
import {
  createEmptyVault,
  createTerm,
  liveTerms,
  softDeleteTerm,
  updateTerm,
  upsertTerm,
} from "./vault.ts";

const now = new Date("2026-09-10T12:00:00.000Z");
const later = new Date("2026-09-11T12:00:00.000Z");

describe("createEmptyVault", () => {
  it("creates a vault with schemaVersion 1 and no terms", () => {
    const vault = createEmptyVault(now);
    expect(vault).toEqual({
      schemaVersion: 1,
      updatedAt: now.toISOString(),
      terms: [],
      tags: [],
    });
  });
});

describe("createTerm", () => {
  it("creates a term with ulid id and timestamps", () => {
    const term = createTerm({ term: "apple", meaningJa: "りんご" }, { now });
    expect(term.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(term.term).toBe("apple");
    expect(term.meaningJa).toBe("りんご");
    expect(term.tags).toEqual([]);
    expect(term.createdAt).toBe(now.toISOString());
    expect(term.updatedAt).toBe(now.toISOString());
    expect(term.deletedAt).toBeUndefined();
  });

  it("uses the supplied id when given", () => {
    const term = createTerm({ term: "a", meaningEn: "b" }, { now, id: "FIXED" });
    expect(term.id).toBe("FIXED");
  });

  it("trims strings and drops empty optionals", () => {
    const term = createTerm(
      {
        term: "  apple ",
        reading: "  ",
        meaningJa: " りんご ",
        meaningEn: "",
        example: " I ate an apple. ",
        sourceUrl: "",
      },
      { now },
    );
    expect(term.term).toBe("apple");
    expect(term.meaningJa).toBe("りんご");
    expect(term.example).toBe("I ate an apple.");
    expect(Object.hasOwn(term, "reading")).toBe(false);
    expect(Object.hasOwn(term, "meaningEn")).toBe(false);
    expect(Object.hasOwn(term, "sourceUrl")).toBe(false);
  });

  it("dedupes and trims tags, dropping blanks", () => {
    const term = createTerm(
      { term: "a", meaningEn: "b", tags: [" fruit", "fruit ", "", "food", "  "] },
      { now },
    );
    expect(term.tags).toEqual(["fruit", "food"]);
  });

  it("throws when term is blank", () => {
    expect(() => createTerm({ term: "  ", meaningJa: "x" }, { now })).toThrow();
  });

  it("throws when no meaning is given", () => {
    expect(() => createTerm({ term: "apple" }, { now })).toThrow();
    expect(() => createTerm({ term: "apple", meaningJa: " ", meaningEn: "" }, { now })).toThrow();
  });
});

describe("updateTerm", () => {
  const base = createTerm({ term: "apple", meaningJa: "りんご", tags: ["a"] }, { now });

  it("applies the patch and bumps updatedAt without mutating", () => {
    const updated = updateTerm(base, { meaningEn: " an apple " }, later);
    expect(updated.meaningEn).toBe("an apple");
    expect(updated.updatedAt).toBe(later.toISOString());
    expect(updated.createdAt).toBe(base.createdAt);
    expect(updated.id).toBe(base.id);
    expect(base.meaningEn).toBeUndefined();
    expect(base.updatedAt).toBe(now.toISOString());
  });

  it("clears an optional field when patched to blank", () => {
    const withReading = updateTerm(base, { reading: "ap-ple" }, later);
    const cleared = updateTerm(withReading, { reading: "" }, later);
    expect(Object.hasOwn(cleared, "reading")).toBe(false);
  });

  it("throws when the patch removes all meanings", () => {
    expect(() => updateTerm(base, { meaningJa: "" }, later)).toThrow();
  });

  it("throws when the patch blanks the term", () => {
    expect(() => updateTerm(base, { term: " " }, later)).toThrow();
  });

  it("normalizes tags in the patch", () => {
    const updated = updateTerm(base, { tags: [" x", "x", "y "] }, later);
    expect(updated.tags).toEqual(["x", "y"]);
  });
});

describe("softDeleteTerm", () => {
  it("sets deletedAt and updatedAt, immutably", () => {
    const base = createTerm({ term: "a", meaningEn: "b" }, { now });
    const deleted = softDeleteTerm(base, later);
    expect(deleted.deletedAt).toBe(later.toISOString());
    expect(deleted.updatedAt).toBe(later.toISOString());
    expect(base.deletedAt).toBeUndefined();
  });
});

describe("upsertTerm / liveTerms", () => {
  it("inserts a new term into a new vault and unions tags", () => {
    const vault = createEmptyVault(now);
    const term = createTerm({ term: "a", meaningEn: "b", tags: ["z", "m"] }, { now });
    const next = upsertTerm(vault, term, later);
    expect(next).not.toBe(vault);
    expect(vault.terms).toHaveLength(0);
    expect(next.terms).toEqual([term]);
    expect(next.tags).toEqual(["m", "z"]);
    expect(next.updatedAt).toBe(later.toISOString());
  });

  it("replaces an existing term by id, keeping position", () => {
    const t1 = createTerm({ term: "a", meaningEn: "1" }, { now, id: "T1" });
    const t2 = createTerm({ term: "b", meaningEn: "2" }, { now, id: "T2" });
    let vault = upsertTerm(createEmptyVault(now), t1, now);
    vault = upsertTerm(vault, t2, now);
    const t1b = updateTerm(t1, { meaningEn: "one", tags: ["n"] }, later);
    const next = upsertTerm(vault, t1b, later);
    expect(next.terms.map((t) => t.id)).toEqual(["T1", "T2"]);
    expect(next.terms[0]?.meaningEn).toBe("one");
    expect(next.tags).toEqual(["n"]);
    expect(vault.terms[0]?.meaningEn).toBe("1");
  });

  it("keeps existing vault tags (sorted, unique)", () => {
    const vault = { ...createEmptyVault(now), tags: ["b", "a"] };
    const term = createTerm({ term: "a", meaningEn: "b", tags: ["a", "c"] }, { now });
    expect(upsertTerm(vault, term, now).tags).toEqual(["a", "b", "c"]);
  });

  it("liveTerms excludes tombstones", () => {
    const alive: Term = createTerm({ term: "a", meaningEn: "b" }, { now });
    const dead = softDeleteTerm(createTerm({ term: "c", meaningEn: "d" }, { now }), later);
    const vault = upsertTerm(upsertTerm(createEmptyVault(now), alive), dead);
    expect(liveTerms(vault)).toEqual([alive]);
  });
});
