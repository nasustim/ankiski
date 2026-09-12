import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { speak, useEnglishVoices } from "./speech.ts";

type VoiceLike = { name: string; lang: string; voiceURI: string };

function voice(name: string, lang: string): VoiceLike {
  return { name, lang, voiceURI: `${name}:${lang}` };
}

function installSynthesis(voices: VoiceLike[]) {
  const synth = {
    getVoices: vi.fn(() => voices),
    speak: vi.fn(),
    cancel: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  class FakeUtterance {
    lang = "";
    voice: VoiceLike | null = null;
    constructor(public text: string) {}
  }
  Object.defineProperty(window, "SpeechSynthesisUtterance", {
    value: FakeUtterance,
    configurable: true,
  });
  return synth;
}

afterEach(() => {
  Reflect.deleteProperty(window, "speechSynthesis");
  Reflect.deleteProperty(window, "SpeechSynthesisUtterance");
  vi.restoreAllMocks();
});

describe("useEnglishVoices", () => {
  it("reports unsupported when the browser has no speechSynthesis", () => {
    const { result } = renderHook(() => useEnglishVoices());
    expect(result.current.supported).toBe(false);
    expect(result.current.voices).toEqual([]);
  });

  it("keeps only en-* voices", () => {
    installSynthesis([voice("Alex", "en-US"), voice("Kyoko", "ja-JP"), voice("Daniel", "en-GB")]);
    const { result } = renderHook(() => useEnglishVoices());
    expect(result.current.supported).toBe(true);
    expect(result.current.voices.map((v) => v.lang)).toEqual(["en-US", "en-GB"]);
  });
});

describe("speak", () => {
  it("does nothing when unsupported", () => {
    expect(() => {
      speak("hello");
    }).not.toThrow();
  });

  it("cancels any pending utterance and speaks with the chosen voice", () => {
    const chosen = voice("Daniel", "en-GB");
    const synth = installSynthesis([voice("Alex", "en-US"), chosen]);

    speak("hello", chosen.voiceURI);

    expect(synth.cancel).toHaveBeenCalled();
    expect(synth.speak).toHaveBeenCalledTimes(1);
    const utterance = synth.speak.mock.calls[0]?.[0] as { text: string; voice: VoiceLike | null };
    expect(utterance.text).toBe("hello");
    expect(utterance.voice).toBe(chosen);
  });

  it("falls back to the first en voice when the requested one is gone", () => {
    const synth = installSynthesis([voice("Alex", "en-US")]);
    speak("hello", "Missing:en-AU");
    const utterance = synth.speak.mock.calls[0]?.[0] as { voice: VoiceLike | null };
    expect(utterance.voice?.lang).toBe("en-US");
  });
});
