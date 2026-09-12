import { ZodError } from "zod";
import { createEmptyVault, createTerm, upsertTerm } from "./vault.ts";
import { parseVaultJson, serializeVault, VAULT_JSON_FILE_NAME } from "./vault-json.ts";

const now = new Date("2026-09-10T12:00:00.000Z");

describe("serializeVault / parseVaultJson", () => {
  const vault = upsertTerm(
    createEmptyVault(now),
    createTerm({ term: "apple", meaningJa: "りんご", tags: ["fruit"] }, { now, id: "T1" }),
    now,
  );

  it("round-trips a vault", () => {
    const json = serializeVault(vault);
    expect(parseVaultJson(json)).toEqual(vault);
  });

  it("emits stable, pretty-printed JSON ending with a newline", () => {
    const json = serializeVault(vault);
    expect(json).toBe(`${JSON.stringify(vault, null, 2)}\n`);
    expect(serializeVault(vault)).toBe(json);
  });

  it("throws ZodError on structurally invalid JSON", () => {
    expect(() => parseVaultJson(JSON.stringify({ schemaVersion: 1 }))).toThrow(ZodError);
    expect(() => parseVaultJson(JSON.stringify({ ...vault, schemaVersion: 2 }))).toThrow(ZodError);
  });

  it("throws SyntaxError on malformed JSON text", () => {
    expect(() => parseVaultJson("{not json")).toThrow(SyntaxError);
  });

  it("exposes the canonical file name", () => {
    expect(VAULT_JSON_FILE_NAME).toBe("vault.json");
  });
});
