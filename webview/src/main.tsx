import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CommitApp } from "./commit/App";
import { ConflictsApp } from "./conflicts/App";
import { MergeStandaloneApp } from "./conflicts/MergeStandaloneApp";
import { PanelApp } from "./panel/App";
import { PushApp } from "./push/App";
import { RollbackApp } from "./rollback/App";
import { setLocale } from "./shared/i18n";
import "./shared/theme/variables.css";

// Fix Cmd+A/Ctrl+A not working in webview inputs (VS Code intercepts it)
document.addEventListener("keydown", (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === "a") {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
      e.stopPropagation();
      (target as HTMLInputElement).select();
    }
  }
});

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");
// Locale is injected by the extension host (data-locale); fall back to the
// browser locale when running the webview standalone (vite dev).
setLocale(root.dataset.locale ?? navigator.language);
const mode = root.dataset.mode as
  | "panel"
  | "merge"
  | "conflicts"
  | "commit"
  | "push"
  | "rollback"
  | undefined;

createRoot(root).render(
  <StrictMode>
    {mode === "merge" ? (
      <MergeStandaloneApp />
    ) : mode === "conflicts" ? (
      <ConflictsApp />
    ) : mode === "commit" ? (
      <CommitApp />
    ) : mode === "push" ? (
      <PushApp />
    ) : mode === "rollback" ? (
      <RollbackApp />
    ) : (
      <PanelApp />
    )}
  </StrictMode>,
);
