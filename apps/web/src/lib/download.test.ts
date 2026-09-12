import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadBlob, downloadText } from "./download.ts";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("downloadBlob", () => {
  it("clicks a temporary anchor and revokes the object URL", () => {
    const createObjectURL = vi.fn(() => "blob:fake");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", Object.assign(Object.create(URL), { createObjectURL, revokeObjectURL }));

    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadBlob(new Blob(["x"]), "deck.apkg");

    expect(createObjectURL).toHaveBeenCalled();
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:fake");
    expect(document.body.querySelector("a")).toBeNull();
    vi.unstubAllGlobals();
  });
});

describe("downloadText", () => {
  it("wraps text in a blob of the requested type", () => {
    const createObjectURL = vi.fn(() => "blob:fake");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", Object.assign(Object.create(URL), { createObjectURL, revokeObjectURL }));
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    downloadText("a\tb\n", "terms.txt", "text/tab-separated-values");

    const blob = createObjectURL.mock.calls[0]?.[0] as unknown as Blob;
    expect(blob.type).toBe("text/tab-separated-values;charset=utf-8");
    vi.unstubAllGlobals();
  });
});
