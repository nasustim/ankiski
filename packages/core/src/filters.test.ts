import {
  collectTags,
  filterByDateRange,
  filterByTags,
  filterNotExported,
  searchTerms,
  sortTerms,
} from "./filters.ts";
import type { Term } from "./types.ts";

const d1 = "2026-09-01T00:00:00.000Z";
const d2 = "2026-09-02T00:00:00.000Z";
const d3 = "2026-09-03T00:00:00.000Z";

function term(overrides: Partial<Term> & { id: string }): Term {
  return {
    term: overrides.id,
    tags: [],
    createdAt: d1,
    updatedAt: d1,
    meaningEn: "x",
    ...overrides,
  };
}

const apple = term({
  id: "apple",
  reading: "æpl",
  meaningJa: "りんご",
  meaningEn: "a fruit",
  example: "I ate an Apple.",
  tags: ["fruit", "food"],
  createdAt: d1,
  updatedAt: d3,
});
const banana = term({
  id: "banana",
  meaningEn: "yellow fruit",
  tags: ["fruit"],
  createdAt: d2,
  updatedAt: d2,
  exportedAt: d2,
});
const carrot = term({
  id: "carrot",
  meaningJa: "にんじん",
  tags: ["vegetable", "food"],
  createdAt: d3,
  updatedAt: d1,
  exportedAt: d1,
});
const all = [apple, banana, carrot];

describe("searchTerms", () => {
  it("returns all when the query is blank", () => {
    expect(searchTerms(all, "")).toEqual(all);
    expect(searchTerms(all, "   ")).toEqual(all);
  });

  it("matches case-insensitively across term/reading/meanings/example", () => {
    expect(searchTerms(all, "APPLE").map((t) => t.id)).toEqual(["apple"]);
    expect(searchTerms(all, "æpl").map((t) => t.id)).toEqual(["apple"]);
    expect(searchTerms(all, "にんじん").map((t) => t.id)).toEqual(["carrot"]);
    expect(searchTerms(all, "fruit").map((t) => t.id)).toEqual(["apple", "banana"]);
    expect(searchTerms(all, "ate an").map((t) => t.id)).toEqual(["apple"]);
  });

  it("does not match on tags or id-only", () => {
    expect(searchTerms(all, "vegetable")).toEqual([]);
  });
});

describe("filterByTags", () => {
  it("defaults to any", () => {
    expect(filterByTags(all, ["vegetable", "fruit"]).map((t) => t.id)).toEqual([
      "apple",
      "banana",
      "carrot",
    ]);
  });

  it("supports all", () => {
    expect(filterByTags(all, ["fruit", "food"], "all").map((t) => t.id)).toEqual(["apple"]);
  });

  it("returns all terms when tags is empty", () => {
    expect(filterByTags(all, [])).toEqual(all);
    expect(filterByTags(all, [], "all")).toEqual(all);
  });
});

describe("filterNotExported", () => {
  it("keeps terms never exported or edited since export", () => {
    const stale = term({ id: "stale", updatedAt: d3, exportedAt: d2 });
    expect(filterNotExported([...all, stale]).map((t) => t.id)).toEqual(["apple", "stale"]);
  });
});

describe("filterByDateRange", () => {
  it("is inclusive on createdAt", () => {
    expect(filterByDateRange(all, { from: d2, to: d2 }).map((t) => t.id)).toEqual(["banana"]);
    expect(filterByDateRange(all, { from: d2 }).map((t) => t.id)).toEqual(["banana", "carrot"]);
    expect(filterByDateRange(all, { to: d2 }).map((t) => t.id)).toEqual(["apple", "banana"]);
    expect(filterByDateRange(all, {})).toEqual(all);
  });
});

describe("sortTerms", () => {
  it("sorts by term with locale-insensitive case", () => {
    const zed = term({ id: "Zed", term: "Zed" });
    const sorted = sortTerms([zed, banana, apple], "term", "asc");
    expect(sorted.map((t) => t.id)).toEqual(["apple", "banana", "Zed"]);
    expect(sortTerms([zed, banana, apple], "term", "desc").map((t) => t.id)).toEqual([
      "Zed",
      "banana",
      "apple",
    ]);
  });

  it("sorts by createdAt and updatedAt without mutating", () => {
    const input = [carrot, apple, banana];
    expect(sortTerms(input, "createdAt", "asc").map((t) => t.id)).toEqual([
      "apple",
      "banana",
      "carrot",
    ]);
    expect(sortTerms(input, "updatedAt", "desc").map((t) => t.id)).toEqual([
      "apple",
      "banana",
      "carrot",
    ]);
    expect(input.map((t) => t.id)).toEqual(["carrot", "apple", "banana"]);
  });
});

describe("collectTags", () => {
  it("returns sorted unique tags", () => {
    expect(collectTags(all)).toEqual(["food", "fruit", "vegetable"]);
    expect(collectTags([])).toEqual([]);
  });
});
