import { useEffect, useState } from "react";

/** Web Speech API is optional: Firefox on some platforms and older WebViews lack it. */
export function speechSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function englishVoices(): SpeechSynthesisVoice[] {
  if (!speechSupported()) return [];
  return window.speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith("en"));
}

/**
 * The en-* voices the browser offers. Voice lists load asynchronously in Chrome, so we also
 * listen for `voiceschanged`.
 */
export function useEnglishVoices(): { supported: boolean; voices: SpeechSynthesisVoice[] } {
  const supported = speechSupported();
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => englishVoices());

  useEffect(() => {
    if (!supported) return;
    const synth = window.speechSynthesis;
    const update = () => {
      setVoices(englishVoices());
    };
    update();
    synth.addEventListener?.("voiceschanged", update);
    return () => {
      synth.removeEventListener?.("voiceschanged", update);
    };
  }, [supported]);

  return { supported, voices };
}

/** Speaks `text` with the requested voice, falling back to the first available en-* voice. */
export function speak(text: string, voiceUri?: string): void {
  if (!speechSupported()) return;
  const available = englishVoices();
  const voice = available.find((candidate) => candidate.voiceURI === voiceUri) ?? available[0];

  const utterance = new window.SpeechSynthesisUtterance(text);
  utterance.lang = voice?.lang ?? "en-US";
  if (voice) utterance.voice = voice;

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
