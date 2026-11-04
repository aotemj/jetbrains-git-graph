import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../../shared/i18n";

export interface CreateBranchDialogProps {
  /** Title shown at top, e.g. "Create Branch from dev" */
  title: string;
  /** Default value for branch name input */
  defaultName?: string;
  /** Placeholder for the input */
  placeholder?: string;
  onClose: () => void;
  /** Return a string error message to keep the dialog open and show it */
  onConfirm: (params: {
    branchName: string;
    checkout: boolean;
    force: boolean;
  }) => Promise<string | undefined>;
}

/** Custom checkbox matching commit panel style */
function Checkbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <span
      onClick={() => onChange(!checked)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 16,
        height: 16,
        borderRadius: 3,
        border: checked ? "none" : "1.5px solid var(--description-fg, #999)",
        background: checked ? "#3574f0" : "transparent",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 0.1s, border 0.1s",
      }}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6L5 8.5L9.5 3.5"
            stroke="#fff"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

export function CreateBranchDialog({
  title,
  defaultName = "",
  placeholder = "branch-name",
  onClose,
  onConfirm,
}: CreateBranchDialogProps) {
  const [branchName, setBranchName] = useState(defaultName);
  const [checkout, setCheckout] = useState(true);
  const [force, setForce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus and select input on mount
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter" && !submitting) {
        handleSubmit();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  const handleSubmit = useCallback(async () => {
    const trimmed = branchName.trim();
    if (!trimmed) return;
    setError(null);
    setSubmitting(true);
    try {
      const errMsg = await onConfirm({ branchName: trimmed, checkout, force });
      if (errMsg) {
        setError(errMsg);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [branchName, checkout, force, onConfirm]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
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
          minWidth: 380,
          maxWidth: 500,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Title */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 12,
            color: "var(--app-fg)",
          }}
        >
          {title}
        </div>

        {/* Error Message */}
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
            }}
          >
            {error}
          </div>
        )}

        {/* Branch Name Input */}
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 4,
            }}
          >
            <label
              htmlFor="branch-name-input"
              style={{
                fontSize: 12,
                color: "var(--description-fg)",
                whiteSpace: "nowrap",
              }}
            >
              {t("Branch Name:")}
            </label>
            <input
              ref={inputRef}
              id="branch-name-input"
              type="text"
              value={branchName}
              onChange={(e) => {
                setBranchName(e.target.value);
                setError(null);
              }}
              placeholder={placeholder}
              style={{
                flex: 1,
                background: "var(--input-bg)",
                color: "var(--input-fg)",
                border: error
                  ? "1px solid var(--vscode-inputValidation-errorBorder, #be1100)"
                  : "1px solid var(--input-border)",
                borderRadius: 4,
                padding: "4px 8px",
                fontSize: "var(--font-size)",
                fontFamily: "var(--font-family)",
                outline: "none",
                height: 28,
              }}
            />
          </div>
        </div>

        {/* Checkboxes */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 16,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <Checkbox checked={checkout} onChange={(v) => setCheckout(v)} />
            {t("Checkout branch")}
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              cursor: "pointer",
              userSelect: "none",
            }}
          >
            <Checkbox
              checked={force}
              onChange={(v) => {
                setForce(v);
                setError(null);
              }}
            />
            {t("Overwrite existing branch")}
          </label>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "var(--vscode-button-secondaryBackground, #3a3d41)",
              color: "var(--vscode-button-secondaryForeground, var(--app-fg))",
              border: "none",
              borderRadius: 4,
              padding: "4px 14px",
              fontSize: 12,
              height: 28,
              cursor: "pointer",
            }}
          >
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!branchName.trim() || submitting}
            style={{
              background: "var(--button-bg)",
              color: "var(--button-fg)",
              border: "none",
              borderRadius: 4,
              padding: "4px 14px",
              fontSize: 12,
              height: 28,
              cursor: branchName.trim() && !submitting ? "pointer" : "default",
              opacity: branchName.trim() && !submitting ? 1 : 0.4,
            }}
          >
            {t("Create")}
          </button>
        </div>
      </div>
    </div>
  );
}
