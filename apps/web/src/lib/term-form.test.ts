import { describe, expect, it } from "vitest";
import { makeTerm } from "../test-utils.tsx";
import { toTermFormValues, toTermInput } from "./term-form.ts";

describe("toTermFormValues", () => {
  it("maps undefined optional fields to empty strings", () => {
    const term = makeTerm({ term: "alpha", meaningJa: "最初", tags: ["toeic"] });
    expect(toTermFormValues(term)).toEqual({
      term: "alpha",
      reading: "",
      meaningJa: "最初",
      meaningEn: "",
      example: "",
      sourceUrl: "",
      tags: ["toeic"],
    });
  });
});

describe("toTermInput", () => {
  it("passes values straight through so blanks clear optional fields", () => {
    expect(
      toTermInput({
        term: " alpha ",
        reading: "",
        meaningJa: "最初",
        meaningEn: "",
        example: "",
        sourceUrl: "",
        tags: ["toeic"],
      }),
    ).toEqual({
      term: " alpha ",
      reading: "",
      meaningJa: "最初",
      meaningEn: "",
      example: "",
      sourceUrl: "",
      tags: ["toeic"],
    });
  });
});
