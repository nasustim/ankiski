import { z } from "zod";
import { SCHEMA_VERSION, type Term, type Vault } from "./types.ts";

/**
 * Blank-string policy: optional string fields accept `""` / whitespace-only input
 * (older clients and HTML forms produce it freely) but the parsed output drops the
 * key entirely, so downstream code only ever sees `undefined` or a non-blank string.
 */
const optionalText = z
  .string()
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    return trimmed === "" ? undefined : value;
  });

const isoDateTime = z.iso.datetime({ offset: true });

const nonBlank = z.string().refine((value) => value.trim() !== "", {
  message: "must not be blank",
});

/** True when at least one of meaningJa / meaningEn contains non-whitespace text. */
export function hasMeaning(term: Pick<Term, "meaningJa" | "meaningEn">): boolean {
  return (term.meaningJa?.trim() ?? "") !== "" || (term.meaningEn?.trim() ?? "") !== "";
}

const TermShape = z.object({
  id: nonBlank,
  term: nonBlank,
  reading: optionalText,
  meaningJa: optionalText,
  meaningEn: optionalText,
  example: optionalText,
  sourceUrl: optionalText,
  tags: z.array(nonBlank),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
  deletedAt: isoDateTime.optional(),
  exportedAt: isoDateTime.optional(),
});

function stripUndefined<T extends object>(value: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (v !== undefined) out[key] = v;
  }
  return out as T;
}

export const TermSchema = TermShape.transform((value) => stripUndefined(value) as Term).refine(
  hasMeaning,
  {
    message: "at least one of meaningJa / meaningEn is required",
    path: ["meaningJa"],
  },
);

export const VaultSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  updatedAt: isoDateTime,
  terms: z.array(TermSchema),
  tags: z.array(nonBlank),
});

/** Parses an unknown value into a Vault. Throws ZodError on failure. */
export function parseVault(input: unknown): Vault {
  return VaultSchema.parse(input);
}

export function safeParseVault(input: unknown): z.ZodSafeParseResult<Vault> {
  return VaultSchema.safeParse(input);
}
