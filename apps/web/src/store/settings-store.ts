import { create, type StoreApi, type UseBoundStore } from "zustand";

export const DEFAULT_DECK_NAME = "English::Vocabulary";
export const SETTINGS_STORAGE_KEY = "ankiski/settings";

export type Settings = {
  deckName: string;
  voiceUri: string;
};

export type SettingsState = Settings & {
  setDeckName: (deckName: string) => void;
  setVoiceUri: (voiceUri: string) => void;
};

const defaults: Settings = { deckName: DEFAULT_DECK_NAME, voiceUri: "" };

function readSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw === null) return defaults;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      deckName: typeof parsed.deckName === "string" ? parsed.deckName : defaults.deckName,
      voiceUri: typeof parsed.voiceUri === "string" ? parsed.voiceUri : defaults.voiceUri,
    };
  } catch {
    // Private mode, disabled storage, or a corrupt value: settings are a convenience only.
    return defaults;
  }
}

function writeSettings(settings: Settings): void {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore: losing a preference is not worth failing the interaction.
  }
}

export function createSettingsStore(): UseBoundStore<StoreApi<SettingsState>> {
  return create<SettingsState>()((set, get) => ({
    ...readSettings(),
    setDeckName(deckName) {
      set({ deckName });
      writeSettings({ deckName, voiceUri: get().voiceUri });
    },
    setVoiceUri(voiceUri) {
      set({ voiceUri });
      writeSettings({ deckName: get().deckName, voiceUri });
    },
  }));
}

export const useSettingsStore = createSettingsStore();
