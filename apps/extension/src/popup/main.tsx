import { ChromeStorageAdapter } from "@ankiski/storage";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { chromeStorage } from "../shared/storage-area.ts";
import "../index.css";
import { Popup } from "./Popup.tsx";

const container = document.getElementById("root");
if (!container) {
  throw new Error("#root not found");
}

createRoot(container).render(
  <StrictMode>
    <Popup adapter={new ChromeStorageAdapter()} storage={chromeStorage()} />
  </StrictMode>,
);
