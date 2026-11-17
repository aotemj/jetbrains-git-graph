import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface CommitTemplateDialogProps {
  onClose: () => void;
  /** Called with the generated commit message when the user confirms */
  onApply: (message: string) => void;
}

interface CommitTypeOption {
  value: string;
  label: string;
}

const COMMIT_TYPES: CommitTypeOption[] = [
  { value: "feat", label: "feat - A new feature" },
  { value: "fix", label: "fix - A bug fix" },
  {
    value: "docs",
    label: "docs - Documentation only changes",
  },
  {
    value: "style",
    label: "style - Changes that do not affect the meaning of the code",
  },
  {
    value: "refactor",
    label:
      "refactor - A code change that neither fixes a bug nor adds a feature",
  },
  {
    value: "perf",
    label: "perf - A code change that improves performance",
  },
  {
    value: "test",
    label: "test - Adding missing tests or correcting existing tests",
  },
  {
    value: "build",
    label:
      "build - Changes that affect the build system or external dependencies",
  },
  {
    value: "ci",
    label: "ci - Changes to CI configuration files and scripts",
  },
  {
    value: "chore",
    label: "chore - Other changes that don't modify src or test files",
  },
  { value: "revert", label: "revert - Reverts a previous commit" },
];

interface TemplateForm {
  type: string;
  scope: string;
  short: string;
  long: string;
  breaking: string;
  issues: string;
}

const EMPTY_FORM: TemplateForm = {
  type: "feat",
  scope: "",
  short: "",
  long: "",
  breaking: "",
  issues: "",
};

/** Normalise "123, #456 789" into "#123, #456, #789" */
function normalizeIssues(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((s) => s.replace(/^#/, "").trim())
    .filter(Boolean)
    .map((n) => `#${n}`);
}

export function buildCommitMessage(form: TemplateForm): string {
  const scope = form.scope.trim();
  const short = form.short.trim();
  const header = scope
    ? `${form.type}(${scope}): ${short}`
    : `${form.type}: ${short}`;

  const parts: string[] = [header];

  const long = form.long.trim();
  if (long) parts.push(long);

  const breaking = form.breaking.trim();
  if (breaking) parts.push(`BREAKING CHANGE: ${breaking}`);

  const issues = normalizeIssues(form.issues);
  if (issues.length > 0) parts.push(`Closes ${issues.join(", ")}`);

  return parts.join("\n\n");
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  color: "var(--description-fg)",
  textAlign: "right",
  paddingTop: 6,
  whiteSpace: "nowrap",
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "var(--input-bg)",
  color: "var(--input-fg)",
  border: "1px solid var(--input-border)",
  borderRadius: 4,
  padding: "4px 8px",
  fontSize: "var(--font-size)",
  fontFamily: "var(--font-family)",
  outline: "none",
};

export function CommitTemplateDialog({
  onClose,
  onApply,
}: CommitTemplateDialogProps) {
  const [form, setForm] = useState<TemplateForm>(EMPTY_FORM);
  const shortRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const set = useCallback(
    <K extends keyof TemplateForm>(key: K, value: TemplateForm[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const message = useMemo(() => buildCommitMessage(form), [form]);
  const canApply = form.short.trim().length > 0;

  const handleApply = useCallback(() => {
    if (!canApply) return;
    onApply(message);
    onClose();
  }, [canApply, message, onApply, onClose]);

  useEffect(() => {
    shortRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleApply();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleApply, onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === backdropRef.current) onClose();
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
          width: 560,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "calc(100vh - 32px)",
          overflowY: "auto",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 14,
            color: "var(--app-fg)",
          }}
        >
          Commit Message Template
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "110px 1fr",
            gap: "8px 10px",
            alignItems: "start",
          }}
        >
          <label htmlFor="ct-type" style={labelStyle}>
            Type of Change:
          </label>
          <select
            id="ct-type"
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            style={{ ...fieldStyle, height: 28, cursor: "pointer" }}
          >
            {COMMIT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <label htmlFor="ct-scope" style={labelStyle}>
            Scope:
          </label>
          <input
            id="ct-scope"
            type="text"
            value={form.scope}
            onChange={(e) => set("scope", e.target.value)}
            placeholder="optional, e.g. commit-panel"
            style={{ ...fieldStyle, height: 28 }}
          />

          <label htmlFor="ct-short" style={labelStyle}>
            Short Description:
          </label>
          <input
            ref={shortRef}
            id="ct-short"
            type="text"
            value={form.short}
            onChange={(e) => set("short", e.target.value)}
            placeholder="required — imperative mood, no trailing period"
            style={{ ...fieldStyle, height: 28 }}
          />

          <label htmlFor="ct-long" style={labelStyle}>
            Long Description:
          </label>
          <textarea
            id="ct-long"
            value={form.long}
            onChange={(e) => set("long", e.target.value)}
            placeholder="optional — what changed and why"
            rows={4}
            style={{ ...fieldStyle, padding: "6px 8px", resize: "vertical" }}
          />

          <label htmlFor="ct-breaking" style={labelStyle}>
            Breaking Changes:
          </label>
          <textarea
            id="ct-breaking"
            value={form.breaking}
            onChange={(e) => set("breaking", e.target.value)}
            placeholder="optional — describe the breaking change"
            rows={2}
            style={{ ...fieldStyle, padding: "6px 8px", resize: "vertical" }}
          />

          <label htmlFor="ct-issues" style={labelStyle}>
            Closed Issues:
          </label>
          <input
            id="ct-issues"
            type="text"
            value={form.issues}
            onChange={(e) => set("issues", e.target.value)}
            placeholder="optional — 12, #34"
            style={{ ...fieldStyle, height: 28 }}
          />
        </div>

        <div style={{ marginTop: 14 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--description-fg)",
              marginBottom: 4,
            }}
          >
            Preview
          </div>
          <pre
            style={{
              margin: 0,
              padding: "8px 10px",
              background:
                "var(--vscode-textCodeBlock-background, rgba(0,0,0,0.2))",
              border: "1px solid var(--border)",
              borderRadius: 4,
              fontSize: 12,
              fontFamily: "var(--font-family)",
              color: "var(--app-fg)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 140,
              overflowY: "auto",
              opacity: canApply ? 1 : 0.5,
            }}
          >
            {canApply ? message : "Short Description is required"}
          </pre>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 16,
          }}
        >
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
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!canApply}
            style={{
              background: "var(--button-bg)",
              color: "var(--button-fg)",
              border: "none",
              borderRadius: 4,
              padding: "4px 14px",
              fontSize: 12,
              height: 28,
              cursor: canApply ? "pointer" : "default",
              opacity: canApply ? 1 : 0.4,
            }}
          >
            Insert
          </button>
        </div>
      </div>
    </div>
  );
}
