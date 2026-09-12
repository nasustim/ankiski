import { createEmptyVault, createTerm, upsertTerm } from "@ankiski/core";
import { describe, expect, it } from "vitest";
import {
  importVaultJson,
  parseVaultJson,
  serializeVault,
  VaultJsonError,
  vaultFileName,
} from "./vault-json.ts";

describe("serializeVault / parseVaultJson", () => {
  it("roundtrips", () => {
    const now = new Date("2024-01-01T00:00:00.000Z");
    const vault = upsertTerm(
      createEmptyVault(now),
      createTerm({ term: "hello", meaningJa: "こんにちは" }, { now }),
      now,
    );

    const json = serializeVault(vault);
    expect(json.endsWith("\n")).toBe(true);
    expect(parseVaultJson(json)).toEqual(vault);
  });

  it("throws VaultJsonError for invalid JSON", () => {
    expect(() => parseVaultJson("{not json")).toThrow(VaultJsonError);
  });

  it("throws VaultJsonError with a readable message for schema violations", () => {
    expect(() => parseVaultJson(JSON.stringify({ foo: "bar" }))).toThrow(VaultJsonError);
    try {
      parseVaultJson(JSON.stringify({ foo: "bar" }));
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(VaultJsonError);
      expect((error as VaultJsonError).message.length).toBeGreaterThan(0);
    }
  });
});

describe("importVaultJson", () => {
  it("merges the imported vault into the current one and counts imported terms", () => {
    const now = new Date("2024-01-01T00:00:00.000Z");
    const current = createEmptyVault(now);
    const incoming = upsertTerm(
      createEmptyVault(now),
      createTerm({ term: "hello", meaningJa: "こんにちは" }, { now }),
      now,
    );
    const text = serializeVault(incoming);

    const { merged, imported } = importVaultJson(current, text);

    expect(imported).toBe(1);
    expect(merged.terms).toHaveLength(1);
    expect(merged.terms[0]?.term).toBe("hello");
  });

  it("throws VaultJsonError when the text is invalid", () => {
    const current = createEmptyVault();
    expect(() => importVaultJson(current, "not json")).toThrow(VaultJsonError);
  });
});

describe("vaultFileName", () => {
  it("formats as ankiski-vault-YYYYMMDD-HHmm.json", () => {
    const now = new Date("2024-03-05T09:07:00.000Z");
    expect(vaultFileName(now)).toBe(`ankiski-vault-${formatExpected(now)}.json`);
  });
});

function formatExpected(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}${m}${d}-${hh}${mm}`;
}
