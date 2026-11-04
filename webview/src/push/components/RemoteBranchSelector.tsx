import { useEffect, useRef, useState } from "react";
import { bridge } from "../../shared/bridge";
import { t } from "../../shared/i18n";

interface RemoteBranchGroup {
  remote: string;
  branches: string[];
}

interface RemoteBranchSelectorProps {
  currentRemote: string;
  currentBranch: string;
  onRemoteChange: (remote: string) => void;
  onBranchChange: (branch: string) => void;
  onClose: () => void;
}

/**
 * A panel with two parts:
 * - Left: dropdown to select the remote (origin, fork, etc.)
 * - Right: text input to type the branch name
 */
export function RemoteBranchSelector({
  currentRemote,
  currentBranch,
  onRemoteChange,
  onBranchChange,
  onClose,
}: RemoteBranchSelectorProps) {
  const [remotes, setRemotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [branchValue, setBranchValue] = useState(currentBranch);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch remote list on mount
  useEffect(() => {
    async function fetchRemotes() {
      try {
        const result = (await bridge.request(
          "getRemoteBranches",
          {},
        )) as RemoteBranchGroup[];
        const remoteNames = (result ?? []).map((g) => g.remote);
        setRemotes(remoteNames);
      } catch (err) {
        console.error("Failed to fetch remotes:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchRemotes();
  }, []);

  // Auto-focus branch input on mount
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        // Commit branch value before closing
        const trimmed = branchValue.trim();
        if (trimmed && trimmed !== currentBranch) {
          onBranchChange(trimmed);
        }
        onClose();
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose, branchValue, currentBranch, onBranchChange]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleBranchConfirm = () => {
    const trimmed = branchValue.trim();
    if (trimmed && trimmed !== currentBranch) {
      onBranchChange(trimmed);
    }
    onClose();
  };

  return (
    <div className="remote-branch-selector" ref={containerRef}>
      {/* Remote list */}
      <div className="remote-branch-selector__remotes">
        <div className="remote-branch-selector__section-label">
          {t("Remote")}
        </div>
        {loading && (
          <div className="remote-branch-selector__loading">
            {t("Loading...")}
          </div>
        )}
        {!loading &&
          remotes.map((remote) => (
            <div
              key={remote}
              className={`remote-branch-selector__remote-item selectable-row${remote === currentRemote ? " selected" : ""}`}
              onClick={() => onRemoteChange(remote)}
            >
              {remote}
            </div>
          ))}
        {!loading && remotes.length === 0 && (
          <div className="remote-branch-selector__loading">
            {t("No remotes found")}
          </div>
        )}
      </div>

      {/* Branch input */}
      <div className="remote-branch-selector__branch">
        <div className="remote-branch-selector__section-label">
          {t("Branch")}
        </div>
        <input
          ref={inputRef}
          type="text"
          className="remote-branch-selector__input"
          value={branchValue}
          onChange={(e) => setBranchValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleBranchConfirm();
            }
          }}
          placeholder={t("branch name")}
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
