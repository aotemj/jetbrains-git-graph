import { useCallback, useState } from "react";

export interface CheckoutConflictDialogProps {
  /** Local branch that is about to be checked out */
  targetBranch: string;
  onCancel: () => void;
  /** Resolve the conflict, then close on success */
  onResolve: (mode: "smart" | "force") => Promise<void>;
}

export function CheckoutConflictDialog({
  targetBranch,
  onCancel,
  onResolve,
}: CheckoutConflictDialogProps) {
  const [busy, setBusy] = useState<"smart" | "force" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handle = useCallback(
    async (mode: "smart" | "force") => {
      setError(null);
      setBusy(mode);
      try {
        await onResolve(mode);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(null);
      }
    },
    [onResolve],
  );

  const buttonStyle: React.CSSProperties = {
    border: "none",
    borderRadius: 4,
    padding: "4px 14px",
    fontSize: 12,
    height: 28,
    cursor: busy ? "default" : "pointer",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.4)",
      }}
    >
      <div
        style={{
          background: "var(--vscode-editorWidget-background, #252526)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "16px 20px",
          width: 460,
          maxWidth: "calc(100vw - 32px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 10,
            color: "var(--app-fg)",
          }}
        >
          Local changes would be overwritten
        </div>

        <div
          style={{
            fontSize: 12,
            lineHeight: 1.6,
            color: "var(--description-fg)",
            marginBottom: 14,
          }}
        >
          Switching to{" "}
          <strong style={{ color: "var(--app-fg)" }}>{targetBranch}</strong>{" "}
          would discard the uncommitted changes in your working tree. Choose how
          to proceed.
        </div>

        {error && (
          <div
            style={{
              background:
                "var(--vscode-inputValidation-errorBackground, #5a1d1d)",
              border:
                "1px solid var(--vscode-inputValidation-errorBorder, #be1100)",
              borderRadius: 4,
              padding: "8px 10px",
              marginBottom: 12,
              fontSize: 12,
              color: "var(--vscode-errorForeground, #f48771)",
              lineHeight: 1.4,
              whiteSpace: "pre-wrap",
              maxHeight: 160,
              overflowY: "auto",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={busy !== null}
            style={{
              ...buttonStyle,
              background: "transparent",
              color: "var(--description-fg)",
              border: "1px solid var(--border)",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handle("force")}
            disabled={busy !== null}
            title="Discard local changes and switch"
            style={{
              ...buttonStyle,
              background: "var(--vscode-button-secondaryBackground, #3a3d41)",
              color: "var(--vscode-button-secondaryForeground, var(--app-fg))",
              opacity: busy && busy !== "force" ? 0.5 : 1,
            }}
          >
            {busy === "force" ? "Switching…" : "Force Checkout"}
          </button>
          <button
            type="button"
            onClick={() => handle("smart")}
            disabled={busy !== null}
            title="Stash local changes, switch, then restore them"
            style={{
              ...buttonStyle,
              background: "var(--button-bg)",
              color: "var(--button-fg)",
              opacity: busy && busy !== "smart" ? 0.5 : 1,
            }}
          >
            {busy === "smart" ? "Switching…" : "Smart Checkout"}
          </button>
        </div>
      </div>
    </div>
  );
}
