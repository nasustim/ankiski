import type { IsoDateTime, Term } from "./types.ts";

export type TagFilterMode = "any" | "all";
export type TermSortKey = "term" | "createdAt" | "updatedAt";
export type SortDirection = "asc" | "desc";
export type DateRange = { from?: IsoDateTime; to?: IsoDateTime };

const SEARCH_FIELDS = ["term", "reading", "meaningJa", "meaningEn", "example"] as const;

/** Case-insensitive substring match over term/reading/meanings/example. Blank query = all. */
export function searchTerms(terms: readonly Term[], query: string): Term[] {
  const needle = query.trim().toLowerCase();
  if (needle === "") return [...terms];
  return terms.filter((term) =>
    SEARCH_FIELDS.some((field) => term[field]?.toLowerCase().includes(needle) ?? false),
  );
}

export function filterByTags(
  terms: readonly Term[],
  tags: readonly string[],
  mode: TagFilterMode = "any",
): Term[] {
  if (tags.length === 0) return [...terms];
  return terms.filter((term) => {
    const own = new Set(term.tags);
    return mode === "all" ? tags.every((t) => own.has(t)) : tags.some((t) => own.has(t));
  });
}

/** Terms never exported, or edited after their last export. */
export function filterNotExported(terms: readonly Term[]): Term[] {
  return terms.filter((term) => term.exportedAt === undefined || term.exportedAt < term.updatedAt);
}

/** Inclusive filter on createdAt. */
export function filterByDateRange(terms: readonly Term[], range: DateRange): Term[] {
  return terms.filter((term) => {
    if (range.from !== undefined && term.createdAt < range.from) return false;
    if (range.to !== undefined && term.createdAt > range.to) return false;
    return true;
  });
}

/** Returns a sorted copy; the input array is left untouched. */
export function sortTerms(
  terms: readonly Term[],
  key: TermSortKey,
  dir: SortDirection = "asc",
): Term[] {
  const sign = dir === "asc" ? 1 : -1;
  const compare =
    key === "term"
      ? (x: Term, y: Term) => x.term.localeCompare(y.term, undefined, { sensitivity: "base" })
      : (x: Term, y: Term) => (x[key] === y[key] ? 0 : x[key] < y[key] ? -1 : 1);
  return [...terms].sort((x, y) => sign * compare(x, y));
}

export function collectTags(terms: readonly Term[]): string[] {
  const set = new Set<string>();
  for (const term of terms) for (const tag of term.tags) set.add(tag);
  return [...set].sort();
}
