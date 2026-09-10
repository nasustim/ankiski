import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";

function Popup() {
  return (
    <main className="p-4 w-80">
      <h1 className="text-std-20B-150">ankiski</h1>
    </main>
  );
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("#root not found");
}

createRoot(container).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
