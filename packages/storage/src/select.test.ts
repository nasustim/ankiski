import { describe, expect, it, vi } from "vitest";

vi.mock("./bridge.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./bridge.ts")>();
  return {
    ...actual,
    detectExtension: vi.fn(),
  };
});
vi.mock("./indexeddb.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./indexeddb.ts")>();
  return {
    ...actual,
    IndexedDbAdapter: vi.fn(),
  };
});

import { detectExtension } from "./bridge.ts";
import { IndexedDbAdapter } from "./indexeddb.ts";
import { selectStorage } from "./select.ts";

const mockDetectExtension = vi.mocked(detectExtension);
const MockIndexedDbAdapter = vi.mocked(IndexedDbAdapter);

describe("selectStorage", () => {
  it("uses the extension bridge when extensionId is given and detected", async () => {
    const fakeAdapter = { kind: "extension-bridge" } as never;
    mockDetectExtension.mockResolvedValue(fakeAdapter);

    const result = await selectStorage({ extensionId: "ext-id" });

    expect(result.mode).toBe("extension-bridge");
    expect(result.adapter).toBe(fakeAdapter);
    expect(mockDetectExtension).toHaveBeenCalledWith("ext-id");
  });

  function mockIndexedDbConstructor(available: boolean) {
    MockIndexedDbAdapter.mockImplementation(function FakeIndexedDbAdapter(this: unknown) {
      Object.assign(this as object, {
        kind: "indexeddb",
        isAvailable: () => Promise.resolve(available),
      });
    } as never);
  }

  it("falls back to IndexedDB when no extensionId is given and it's available", async () => {
    mockIndexedDbConstructor(true);

    const result = await selectStorage({});

    expect(result.mode).toBe("indexeddb");
    expect(mockDetectExtension).not.toHaveBeenCalled();
  });

  it("falls back to IndexedDB when extension detection returns null", async () => {
    mockDetectExtension.mockResolvedValue(null);
    mockIndexedDbConstructor(true);

    const result = await selectStorage({ extensionId: "ext-id" });

    expect(result.mode).toBe("indexeddb");
  });

  it("falls back to memory when IndexedDB is unavailable", async () => {
    mockIndexedDbConstructor(false);

    const result = await selectStorage({});

    expect(result.mode).toBe("memory");
    expect(result.adapter.kind).toBe("memory");
  });
});
