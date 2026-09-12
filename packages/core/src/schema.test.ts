import { ZodError } from "zod";
import { hasMeaning, parseVault, safeParseVault, TermSchema, VaultSchema } from "./schema.ts";

const now = "2026-09-10T00:00:00.000Z";

const validTerm = {
  id: "01J7ABCDEFGHJKMNPQRSTVWXYZ",
  term: "serendipity",
  meaningJa: "偶然の幸運",
  tags: ["noun"],
  createdAt: now,
  updatedAt: now,
};

describe("TermSchema", () => {
  it("accepts a minimal valid term", () => {
    const result = TermSchema.safeParse(validTerm);
    expect(result.success).toBe(true);
  });

  it("rejects a term with neither meaningJa nor meaningEn", () => {
    const result = TermSchema.safeParse({ ...validTerm, meaningJa: undefined });
    expect(result.success).toBe(false);
  });

  it("rejects a term whose meanings are whitespace only", () => {
    const result = TermSchema.safeParse({ ...validTerm, meaningJa: "   ", meaningEn: "" });
    expect(result.success).toBe(false);
  });

  it("normalizes blank optional strings to absent", () => {
    const parsed = TermSchema.parse({
      ...validTerm,
      reading: "",
      meaningEn: "   ",
      example: "",
      sourceUrl: "",
    });
    expect(parsed.reading).toBeUndefined();
    expect(parsed.meaningEn).toBeUndefined();
    expect(parsed.example).toBeUndefined();
    expect(parsed.sourceUrl).toBeUndefined();
    expect(Object.hasOwn(parsed, "reading")).toBe(false);
  });

  it("rejects an empty id or blank term", () => {
    expect(TermSchema.safeParse({ ...validTerm, id: "" }).success).toBe(false);
    expect(TermSchema.safeParse({ ...validTerm, term: "  " }).success).toBe(false);
  });

  it("rejects non-ISO datetimes", () => {
    expect(TermSchema.safeParse({ ...validTerm, createdAt: "yesterday" }).success).toBe(false);
    expect(TermSchema.safeParse({ ...validTerm, deletedAt: "2026-09-10" }).success).toBe(false);
  });

  it("rejects empty tags", () => {
    expect(TermSchema.safeParse({ ...validTerm, tags: [""] }).success).toBe(false);
    expect(TermSchema.safeParse({ ...validTerm, tags: "noun" }).success).toBe(false);
  });

  it("accepts optional tombstone and exportedAt", () => {
    const parsed = TermSchema.parse({ ...validTerm, deletedAt: now, exportedAt: now });
    expect(parsed.deletedAt).toBe(now);
    expect(parsed.exportedAt).toBe(now);
  });
});

describe("VaultSchema / parseVault", () => {
  const validVault = {
    schemaVersion: 1,
    updatedAt: now,
    terms: [validTerm],
    tags: ["noun"],
  };

  it("accepts a valid vault", () => {
    expect(VaultSchema.safeParse(validVault).success).toBe(true);
    expect(parseVault(validVault).terms).toHaveLength(1);
  });

  it("rejects unknown schemaVersion", () => {
    expect(VaultSchema.safeParse({ ...validVault, schemaVersion: 2 }).success).toBe(false);
  });

  it("parseVault throws ZodError on invalid input", () => {
    expect(() => parseVault({})).toThrow(ZodError);
    expect(() => parseVault(null)).toThrow(ZodError);
  });

  it("safeParseVault returns a discriminated result", () => {
    const ok = safeParseVault(validVault);
    expect(ok.success).toBe(true);
    const bad = safeParseVault({ schemaVersion: 1 });
    expect(bad.success).toBe(false);
  });

  it("rejects a vault containing an invalid term", () => {
    const bad = { ...validVault, terms: [{ ...validTerm, meaningJa: "" }] };
    expect(safeParseVault(bad).success).toBe(false);
  });
});

describe("hasMeaning", () => {
  it("is true when either meaning is non-blank", () => {
    expect(hasMeaning({ meaningJa: "a" })).toBe(true);
    expect(hasMeaning({ meaningEn: "b" })).toBe(true);
    expect(hasMeaning({ meaningJa: " ", meaningEn: "b" })).toBe(true);
  });

  it("is false when both are blank or missing", () => {
    expect(hasMeaning({})).toBe(false);
    expect(hasMeaning({ meaningJa: "", meaningEn: "  " })).toBe(false);
  });
});
