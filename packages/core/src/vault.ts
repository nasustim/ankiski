import { ulid } from "ulid";
import { hasMeaning } from "./schema.ts";
import { SCHEMA_VERSION, type Term, type Vault } from "./types.ts";

export type TermInput = {
  term: string;
  reading?: string;
  meaningJa?: string;
  meaningEn?: string;
  example?: string;
  sourceUrl?: string;
  tags?: string[];
};

export type TermPatch = Partial<TermInput>;

export type CreateTermOptions = {
  now?: Date;
  id?: string;
};

const OPTIONAL_TEXT_KEYS = ["reading", "meaningJa", "meaningEn", "example", "sourceUrl"] as const;

/** Trims and de-duplicates tags, dropping blanks. Preserves first-seen order. */
export function normalizeTags(tags: readonly string[] | undefined): string[] {
  const seen = new Set<string>();
  for (const raw of tags ?? []) {
    const tag = raw.trim();
    if (tag !== "") seen.add(tag);
  }
  return [...seen];
}

function sortedUnion(...lists: readonly (readonly string[])[]): string[] {
  const set = new Set<string>();
  for (const list of lists) for (const item of list) set.add(item);
  return [...set].sort();
}

function trimmedOrUndefined(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function assertValid(term: Pick<Term, "term" | "meaningJa" | "meaningEn">): void {
  if (term.term.trim() === "") throw new Error("term must not be blank");
  if (!hasMeaning(term)) throw new Error("at least one of meaningJa / meaningEn is required");
}

export function createEmptyVault(now: Date = new Date()): Vault {
  return { schemaVersion: SCHEMA_VERSION, updatedAt: now.toISOString(), terms: [], tags: [] };
}

export function createTerm(input: TermInput, opts: CreateTermOptions = {}): Term {
  const now = opts.now ?? new Date();
  const iso = now.toISOString();
  const term: Term = {
    id: opts.id ?? ulid(now.getTime()),
    term: input.term.trim(),
    tags: normalizeTags(input.tags),
    createdAt: iso,
    updatedAt: iso,
  };
  for (const key of OPTIONAL_TEXT_KEYS) {
    const value = trimmedOrUndefined(input[key]);
    if (value !== undefined) term[key] = value;
  }
  assertValid(term);
  return term;
}

/** Returns a new Term with the patch applied. Blank strings clear optional fields. */
export function updateTerm(term: Term, patch: TermPatch, now: Date = new Date()): Term {
  const next: Term = { ...term, updatedAt: now.toISOString() };
  if (patch.term !== undefined) next.term = patch.term.trim();
  if (patch.tags !== undefined) next.tags = normalizeTags(patch.tags);
  for (const key of OPTIONAL_TEXT_KEYS) {
    if (!(key in patch)) continue;
    const value = trimmedOrUndefined(patch[key]);
    if (value === undefined) delete next[key];
    else next[key] = value;
  }
  assertValid(next);
  return next;
}

export function softDeleteTerm(term: Term, now: Date = new Date()): Term {
  const iso = now.toISOString();
  return { ...term, deletedAt: iso, updatedAt: iso };
}

/** Inserts or replaces `term` by id. Returns a new Vault; the input is not mutated. */
export function upsertTerm(vault: Vault, term: Term, now: Date = new Date()): Vault {
  const index = vault.terms.findIndex((t) => t.id === term.id);
  const terms =
    index === -1 ? [...vault.terms, term] : vault.terms.map((t, i) => (i === index ? term : t));
  return {
    ...vault,
    updatedAt: now.toISOString(),
    terms,
    tags: sortedUnion(vault.tags, term.tags),
  };
}

export function liveTerms(vault: Vault): Term[] {
  return vault.terms.filter((t) => t.deletedAt === undefined);
}
