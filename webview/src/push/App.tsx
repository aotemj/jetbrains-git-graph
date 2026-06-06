import { useCallback, useEffect, useRef, useState } from "react";
import { bridge } from "../shared/bridge";
import { RemoteBranchSelector } from "./components/RemoteBranchSelector";
import { useDraggableDivider } from "./hooks/useDraggableDivider";
import { formatRemoteBranchLabel } from "./utils/branchUtils";
import "./push.css";

interface CommitInfo {
  hash: string;
  shortHash: string;
  subject: string;
  authorName: string;
  authorEmail: string;
  authorDate: string;
}

interface DiffFile {
  oldPath: string;
  newPath: string;
  status: string;
}

type ToastState =
  | { type: "success"; message: string }
  | { type: "error"; message: string }
  | null;

export function PushApp() {
  const root = document.getElementById("root");
  const branchName = root?.dataset.branch ?? "";
  const remoteName = root?.dataset.remote ?? "origin";

  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [selectedHash, setSelectedHash] = useState<string | null>(null);
  const [files, setFiles] = useState<DiffFile[]>([]);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPushMenu, setShowPushMenu] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);

  // Editable remote branch target state
  const [targetRemote, setTargetRemote] = useState(remoteName);
  const [targetBranch, setTargetBranch] = useState(branchName);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const { leftWidthPercent, isDragging, dividerProps } =
    useDraggableDivider(bodyRef);

  useEffect(() => {
    async function load() {
      try {
        const result = (await bridge.request("getAheadCommits", {
          branchName,
        })) as { commits: CommitInfo[] } | null;
        const list = result?.commits ?? [];
        setCommits(list);
        if (list.length > 0) {
          setSelectedHash(list[0].hash);
        }
      } catch (err) {
        console.error("Failed to load ahead commits:", err);
      }
    }
    load();
  }, [branchName]);

  useEffect(() => {
    if (!selectedHash) {
      setFiles([]);
      return;
    }
    async function load() {
      try {
        const result = (await bridge.request("getCommitRangeFiles", {
          hashes: [selectedHash],
        })) as DiffFile[] | null;
        setFiles(result ?? []);
      } catch (err) {
        console.error("Failed to load commit files:", err);
      }
    }
    load();
  }, [selectedHash]);

  const handlePush = useCallback(
    async (force = false) => {
      setPushing(true);
      setError(null);
      setToast(null);
      try {
        const result = (await bridge.request("executePush", {
          branchName,
          remote: targetRemote,
          targetBranch: targetBranch,
          force,
        })) as { data?: { output?: string; isUpToDate?: boolean } };
        setPushing(false);
        const isUpToDate = result?.data?.isUpToDate;
        const message = isUpToDate
          ? "Everything is up to date"
          : `Pushed ${commits.length} commit${commits.length !== 1 ? "s" : ""} to ${targetRemote}/${targetBranch}`;
        setToast({ type: "success", message });
        // Auto-close panel after showing toast
        setTimeout(() => {
          bridge.request("closePushPanel");
        }, 2500);
      } catch (err) {
        setPushing(false);
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        setToast({ type: "error", message: msg });
        // Auto-dismiss error toast after 5 seconds
        setTimeout(() => setToast(null), 5000);
      }
    },
    [branchName, targetRemote, targetBranch, commits.length],
  );

  const handleBranchSelect = useCallback((remote: string, branch: string) => {
    setTargetRemote(remote);
    setTargetBranch(branch);
    setSelectorOpen(false);
  }, []);

  const handleSelectorClose = useCallback(() => {
    setSelectorOpen(false);
  }, []);

  const handleLabelClick = useCallback(() => {
    setSelectorOpen((prev) => !prev);
  }, []);

  const selectedCommit = commits.find((c) => c.hash === selectedHash);

  function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${mm}/${dd}/${d.getFullYear().toString().slice(2)} at ${hh}:${min}`;
  }

  return (
    <div className="push-container">
      {/* Header */}
      <div className="push-header" ref={headerRef}>
        <span className="push-route">
          {branchName} →{" "}
          <span
            className="push-route-target push-route-target--interactive"
            onClick={handleLabelClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleLabelClick();
              }
            }}
          >
            {formatRemoteBranchLabel(targetRemote, targetBranch)}
            <svg
              className="push-route-target__indicator"
              width="10"
              height="10"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="4,6 8,10 12,6" />
            </svg>
          </span>
        </span>
        {selectorOpen && (
          <RemoteBranchSelector
            currentRemote={targetRemote}
            currentBranch={targetBranch}
            onSelect={handleBranchSelect}
            onClose={handleSelectorClose}
          />
        )}
      </div>

      {/* Main content */}
      <div className="push-body" ref={bodyRef}>
        {/* Left: commit list */}
        <div className="push-commits" style={{ width: `${leftWidthPercent}%` }}>
          {commits.length === 0 ? (
            <div className="push-empty">No commits to push</div>
          ) : (
            commits.map((c) => (
              <div
                key={c.hash}
                className={`push-commit-item${selectedHash === c.hash ? " selected" : ""}`}
                onClick={() => setSelectedHash(c.hash)}
              >
                <span className="push-commit-subject">{c.subject}</span>
              </div>
            ))
          )}
        </div>

        {/* Draggable divider */}
        <div
          className={`push-divider${isDragging ? " push-divider--dragging" : ""}`}
          {...dividerProps}
        />

        {/* Right: file list + commit detail */}
        <div className="push-detail">
          {selectedCommit && (
            <>
              {/* Files */}
              <div className="push-files">
                <div className="push-files-header">
                  {files.length} file{files.length !== 1 ? "s" : ""}
                </div>
                {files.map((f) => (
                  <div
                    key={f.newPath || f.oldPath}
                    className="push-file-item"
                    onClick={() => {
                      if (selectedHash) {
                        bridge.request("openDiffEditor", {
                          commit: selectedHash,
                          filePath: f.newPath || f.oldPath,
                          file: f,
                        });
                      }
                    }}
                  >
                    <span className="push-file-name">
                      {(f.newPath || f.oldPath).split("/").pop()}
                    </span>
                    <span className="push-file-path">
                      {(f.newPath || f.oldPath)
                        .split("/")
                        .slice(0, -1)
                        .join("/")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Commit info */}
              <div className="push-commit-info">
                <div className="push-commit-message">
                  {selectedCommit.subject}
                </div>
                <div className="push-commit-meta">
                  {selectedCommit.shortHash} {selectedCommit.authorName}
                  {" <"}
                  {selectedCommit.authorEmail}
                  {">"} on {formatDate(selectedCommit.authorDate)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="push-footer">
        {error && <span className="push-error">{error}</span>}
        <span style={{ flex: 1 }} />
        <button
          type="button"
          className="push-btn push-btn-secondary"
          onClick={() => bridge.request("closePushPanel")}
          disabled={pushing}
        >
          Cancel
        </button>
        <div className="push-split-btn">
          <button
            type="button"
            className="push-btn push-btn-primary push-split-main"
            onClick={() => handlePush(false)}
            disabled={pushing || commits.length === 0}
          >
            {pushing ? "Pushing..." : "Push"}
          </button>
          <button
            type="button"
            className="push-btn push-btn-primary push-split-arrow"
            onClick={() => setShowPushMenu(!showPushMenu)}
            disabled={pushing || commits.length === 0}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="4,6 8,10 12,6" />
            </svg>
          </button>
          {showPushMenu && (
            <>
              <div
                className="push-menu-backdrop"
                onClick={() => setShowPushMenu(false)}
              />
              <div className="push-menu">
                <button
                  type="button"
                  className="push-menu-item"
                  onClick={() => {
                    setShowPushMenu(false);
                    handlePush(true);
                  }}
                >
                  Force Push
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {pushing && (
        <div className="push-progress-bar">
          <div className="push-progress-bar__track" />
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`push-toast push-toast--${toast.type}`}>
          <span className="push-toast__icon">
            {toast.type === "success" ? "ℹ️" : "❌"}
          </span>
          <span className="push-toast__message">{toast.message}</span>
          <button
            type="button"
            className="push-toast__close"
            onClick={() => setToast(null)}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
