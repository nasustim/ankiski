import { SCHEMA_VERSION, type Term, type Vault } from "./types.ts";

function maxIso(a: string, b: string): string {
  return a >= b ? a : b;
}

/**
 * Resolves two versions of the same term. Last-writer-wins on `updatedAt`, which also
 * covers tombstones: a deletion is just an edit that sets `deletedAt`, so a later edit
 * (newer `updatedAt`) resurrects and an older edit loses to the tombstone.
 * `exportedAt` is merged as the max of both so re-export tracking survives either side.
 */
function resolveTerm(a: Term, b: Term): Term {
  const winner = b.updatedAt > a.updatedAt ? b : a;
  const loser = winner === a ? b : a;
  const result: Term = { ...winner };
  if (winner.exportedAt !== undefined && loser.exportedAt !== undefined) {
    result.exportedAt = maxIso(winner.exportedAt, loser.exportedAt);
  } else if (loser.exportedAt !== undefined) {
    result.exportedAt = loser.exportedAt;
  }
  return result;
}

function compareTerms(x: Term, y: Term): number {
  if (x.createdAt !== y.createdAt) return x.createdAt < y.createdAt ? -1 : 1;
  if (x.id === y.id) return 0;
  return x.id < y.id ? -1 : 1;
}

/** Pure three-way-free merge of two vaults. Neither input is mutated. */
export function mergeVaults(a: Vault, b: Vault): Vault {
  const byId = new Map<string, Term>();
  for (const term of a.terms) byId.set(term.id, { ...term });
  for (const term of b.terms) {
    const existing = byId.get(term.id);
    byId.set(term.id, existing === undefined ? { ...term } : resolveTerm(existing, term));
  }
  const terms = [...byId.values()].sort(compareTerms);

  const tags = new Set<string>([...a.tags, ...b.tags]);
  for (const term of terms) {
    if (term.deletedAt !== undefined) continue;
    for (const tag of term.tags) tags.add(tag);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    updatedAt: maxIso(a.updatedAt, b.updatedAt),
    terms,
    tags: [...tags].sort(),
  };
}
