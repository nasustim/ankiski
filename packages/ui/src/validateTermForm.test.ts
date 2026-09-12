import { describe, expect, it } from "vitest";
import { validateTermForm } from "./TermForm.tsx";

const base = {
  term: "apple",
  reading: "",
  meaningJa: "りんご",
  meaningEn: "",
  example: "",
  sourceUrl: "",
  tags: [],
};

describe("validateTermForm", () => {
  it("returns no errors for a minimally valid form", () => {
    expect(validateTermForm(base)).toEqual({});
  });

  it("requires term", () => {
    const errors = validateTermForm({ ...base, term: "  " });
    expect(errors.term).toBe("単語を入力してください");
  });

  it("requires at least one of meaningJa or meaningEn", () => {
    const errors = validateTermForm({ ...base, meaningJa: "  ", meaningEn: "  " });
    expect(errors.meaningJa).toBe("日本語または英語の意味を入力してください");
    expect(errors.meaningEn).toBe("日本語または英語の意味を入力してください");
  });

  it("accepts meaningEn alone", () => {
    const errors = validateTermForm({ ...base, meaningJa: "", meaningEn: "apple" });
    expect(errors.meaningJa).toBeUndefined();
    expect(errors.meaningEn).toBeUndefined();
  });

  it("rejects a non-http(s) source URL", () => {
    const errors = validateTermForm({ ...base, sourceUrl: "not-a-url" });
    expect(errors.sourceUrl).toBeDefined();
  });

  it("rejects a non-http(s) protocol", () => {
    const errors = validateTermForm({ ...base, sourceUrl: "ftp://example.com" });
    expect(errors.sourceUrl).toBeDefined();
  });

  it("accepts a valid https source URL", () => {
    const errors = validateTermForm({ ...base, sourceUrl: "https://example.com/word" });
    expect(errors.sourceUrl).toBeUndefined();
  });

  it("allows an empty source URL", () => {
    const errors = validateTermForm({ ...base, sourceUrl: "" });
    expect(errors.sourceUrl).toBeUndefined();
  });
});
