import { describe, expect, it } from "vitest";
import { extractSentence } from "./sentence.ts";

describe("extractSentence", () => {
  it("returns the sentence containing the selection", () => {
    const context =
      "The first sentence is here. The word ubiquitous appears in the second one. And a third.";
    expect(extractSentence(context, "ubiquitous")).toBe(
      "The word ubiquitous appears in the second one.",
    );
  });

  it("keeps the leading sentence when the selection is in it", () => {
    const context = "Serendipity is a nice word. Another sentence follows.";
    expect(extractSentence(context, "Serendipity")).toBe("Serendipity is a nice word.");
  });

  it("keeps the trailing sentence even without terminating punctuation", () => {
    const context = "One done. A dangling tail with ubiquitous in it";
    expect(extractSentence(context, "ubiquitous")).toBe("A dangling tail with ubiquitous in it");
  });

  it("handles Japanese sentence terminators", () => {
    const context = "これは最初の文です。ここに単語があります。最後の文。";
    expect(extractSentence(context, "単語")).toBe("ここに単語があります。");
  });

  it("spans from the first to the last sentence the selection touches", () => {
    const context = "Alpha one. Beta two. Gamma three.";
    expect(extractSentence(context, "one. Beta")).toBe("Alpha one. Beta two.");
  });

  it("collapses whitespace and newlines", () => {
    const context = "Some   padded\n  text with ubiquitous\tinside. Next.";
    expect(extractSentence(context, "ubiquitous")).toBe("Some padded text with ubiquitous inside.");
  });

  it("does not treat a decimal point as a sentence boundary", () => {
    const context = "The value is 3.14 for pi. Done.";
    expect(extractSentence(context, "pi")).toBe("The value is 3.14 for pi.");
  });

  it("falls back to the selection when it is absent from the context", () => {
    expect(extractSentence("Unrelated context.", "ubiquitous")).toBe("ubiquitous");
  });

  it("falls back to the selection when the context is empty", () => {
    expect(extractSentence("", "ubiquitous")).toBe("ubiquitous");
  });

  it("returns an empty string for a blank selection", () => {
    expect(extractSentence("Anything at all.", "   ")).toBe("");
  });

  it("matches the selection ignoring surrounding whitespace differences", () => {
    const context = "Leading text. A  spaced   phrase ends here. Trailing.";
    expect(extractSentence(context, " A spaced phrase ")).toBe("A spaced phrase ends here.");
  });

  it("truncates a very long sentence around the selection", () => {
    const filler = "word ".repeat(200);
    const context = `${filler}ubiquitous ${filler}`;
    const result = extractSentence(context, "ubiquitous");
    expect(result.length).toBeLessThanOrEqual(400);
    expect(result).toContain("ubiquitous");
  });
});
