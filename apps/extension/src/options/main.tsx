import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "../index.css";

function Options() {
  return (
    <main className="p-6">
      <h1 className="text-std-24B-150">ankiski options</h1>
    </main>
  );
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("#root not found");
}

createRoot(container).render(
  <StrictMode>
    <Options />
  </StrictMode>,
);
