import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "ankiski",
  version: "0.0.0",
  description:
    "Capture English terms while browsing and export them to Anki. Browser storage only.",
  action: {
    default_popup: "src/popup/index.html",
    default_title: "ankiski",
  },
  options_page: "src/options/index.html",
  background: {
    service_worker: "src/background/index.ts",
    type: "module",
  },
  permissions: ["contextMenus", "storage", "unlimitedStorage", "activeTab", "scripting"],
  commands: {
    _execute_action: {
      suggested_key: { default: "Alt+Shift+A" },
      description: "Open the ankiski popup",
    },
  },
  externally_connectable: {
    matches: ["https://nasustim.github.io/*", "http://localhost/*"],
  },
});
