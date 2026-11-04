import { useCallback, useEffect, useState } from "react";
import { bridge } from "../shared/bridge";
import { Tooltip } from "../shared/components/Tooltip";
import "../shared/components/Tooltip.css";
import { t } from "../shared/i18n";
import { useCommitStore } from "../shared/store/commit-store";
import { CommitTab } from "./components/CommitTab";
import { IdeaShelfTab } from "./components/IdeaShelfTab";
import { ShelfTab } from "./components/ShelfTab";
import "./commit.css";

function ProgressBar({ visible }: { visible: boolean }) {
  return (
    <div className={`commit-progress-bar ${visible ? "" : "hidden"}`}>
      {visible && <div className="commit-progress-bar-inner" />}
    </div>
  );
}

interface RebaseState {
  isRebasing: boolean;
  branchName?: string;
  step?: number;
  totalSteps?: number;
}

function RebaseBanner() {
  const [state, setState] = useState<RebaseState>({ isRebasing: false });
  const [loading, setLoading] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const result = (await bridge.request("getRebaseState")) as RebaseState;
      setState(result);
    } catch {
      setState({ isRebasing: false });
    }
  }, []);

  useEffect(() => {
    fetchState();
    const unsub = bridge.onEvent((event) => {
      if (event === "gitStateChanged" || event === "commitStateChanged") {
        fetchState();
      }
    });
    return unsub;
  }, [fetchState]);

  const handleAction = useCallback(
    async (action: "continue" | "abort" | "skip") => {
      setLoading(true);
      try {
        await bridge.request("rebaseAction", { action });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        bridge
          .request("showErrorNotification", { message: msg })
          .catch(() => {});
      } finally {
        setLoading(false);
        fetchState();
      }
    },
    [fetchState],
  );

  if (!state.isRebasing) return null;

  const label = state.branchName
    ? t("Rebasing {branch}", { branch: state.branchName })
    : t("Rebasing");
  const progress =
    state.step && state.totalSteps
      ? ` (${state.step}/${state.totalSteps})`
      : "";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        background: "#e8f5e9",
        borderBottom: "1px solid #c8e6c9",
        fontSize: 12,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 14 }}>⚠️</span>
      <span style={{ fontWeight: 600, flex: 1, color: "var(--app-fg, #ccc)" }}>
        {label}
        {progress}
      </span>
      <Tooltip text={t("Continue Rebase (git rebase --continue)")}>
        <div
          role="button"
          tabIndex={0}
          aria-disabled={loading}
          onClick={() => !loading && handleAction("continue")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!loading) handleAction("continue");
            }
          }}
          className="rebase-action-btn rebase-continue"
        >
          {/* JetBrains official expui double chevron >> icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2.5 11.5L6 8L2.5 4.5"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8.5 11.5L12 8L8.5 4.5"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </Tooltip>
      <Tooltip text={t("Abort Rebase (git rebase --abort)")}>
        <div
          role="button"
          tabIndex={0}
          aria-disabled={loading}
          onClick={() => !loading && handleAction("abort")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!loading) handleAction("abort");
            }
          }}
          className="rebase-action-btn rebase-abort"
        >
          {/* JetBrains official expui/vcs/abort × icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 12L12 4M12 12L4 4"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </Tooltip>
    </div>
  );
}

interface MergeStateInfo {
  isMerging: boolean;
  mergeHead?: string;
  mergeMsg?: string;
}

interface CherryPickStateInfo {
  isCherryPicking: boolean;
  cherryPickHead?: string;
}

function CherryPickBanner() {
  const [state, setState] = useState<CherryPickStateInfo>({
    isCherryPicking: false,
  });
  const [loading, setLoading] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const result = (await bridge.request(
        "getCherryPickState",
      )) as CherryPickStateInfo;
      setState(result);
    } catch {
      setState({ isCherryPicking: false });
    }
  }, []);

  useEffect(() => {
    fetchState();
    const unsub = bridge.onEvent((event) => {
      if (event === "gitStateChanged" || event === "commitStateChanged") {
        fetchState();
      }
    });
    return unsub;
  }, [fetchState]);

  const handleAction = useCallback(
    async (action: "continue" | "abort" | "skip") => {
      setLoading(true);
      try {
        await bridge.request("cherryPickAction", { action });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        bridge
          .request("showErrorNotification", { message: msg })
          .catch(() => {});
      } finally {
        setLoading(false);
        fetchState();
      }
    },
    [fetchState],
  );

  if (!state.isCherryPicking) return null;

  const shortHash = state.cherryPickHead
    ? state.cherryPickHead.substring(0, 7)
    : "";
  const label = shortHash
    ? t("Cherry-picking {hash}", { hash: shortHash })
    : t("Cherry-picking");

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        background: "var(--vscode-inputValidation-warningBackground, #352a05)",
        borderBottom:
          "1px solid var(--vscode-inputValidation-warningBorder, #665500)",
        fontSize: 12,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 14 }}>🍒</span>
      <span style={{ fontWeight: 600, flex: 1, color: "var(--app-fg, #ccc)" }}>
        {label}
      </span>
      <Tooltip text={t("Continue Cherry-pick (git cherry-pick --continue)")}>
        <div
          role="button"
          tabIndex={0}
          aria-disabled={loading}
          onClick={() => !loading && handleAction("continue")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!loading) handleAction("continue");
            }
          }}
          className="rebase-action-btn rebase-continue"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2.5 11.5L6 8L2.5 4.5"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8.5 11.5L12 8L8.5 4.5"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </Tooltip>
      <Tooltip text={t("Skip Cherry-pick (git cherry-pick --skip)")}>
        <div
          role="button"
          tabIndex={0}
          aria-disabled={loading}
          onClick={() => !loading && handleAction("skip")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!loading) handleAction("skip");
            }
          }}
          className="rebase-action-btn rebase-continue"
          style={{ background: "#fb8c00" }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 4L11 8L5 12"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </Tooltip>
      <Tooltip text={t("Abort Cherry-pick (git cherry-pick --abort)")}>
        <div
          role="button"
          tabIndex={0}
          aria-disabled={loading}
          onClick={() => !loading && handleAction("abort")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!loading) handleAction("abort");
            }
          }}
          className="rebase-action-btn rebase-abort"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 12L12 4M12 12L4 4"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </Tooltip>
    </div>
  );
}

function MergeBanner() {
  const [state, setState] = useState<MergeStateInfo>({ isMerging: false });
  const [loading, setLoading] = useState(false);

  const fetchState = useCallback(async () => {
    try {
      const result = (await bridge.request("getMergeState")) as MergeStateInfo;
      setState(result);
    } catch {
      setState({ isMerging: false });
    }
  }, []);

  useEffect(() => {
    fetchState();
    const unsub = bridge.onEvent((event) => {
      if (event === "gitStateChanged" || event === "commitStateChanged") {
        fetchState();
      }
    });
    return unsub;
  }, [fetchState]);

  const handleContinue = useCallback(async () => {
    setLoading(true);
    try {
      // Check if there are unresolved conflicts
      const conflicts = (await bridge.request("getConflictFiles")) as string[];
      if (conflicts && conflicts.length > 0) {
        // Open conflicts panel to let user resolve
        await bridge.request("openConflictsPanel");
      } else {
        // All conflicts resolved, commit
        await bridge.request("mergeAction", { action: "continue" });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      bridge.request("showErrorNotification", { message: msg }).catch(() => {});
    } finally {
      setLoading(false);
      fetchState();
    }
  }, [fetchState]);

  const handleAbort = useCallback(async () => {
    setLoading(true);
    try {
      await bridge.request("mergeAction", { action: "abort" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      bridge.request("showErrorNotification", { message: msg }).catch(() => {});
    } finally {
      setLoading(false);
      fetchState();
    }
  }, [fetchState]);

  if (!state.isMerging) return null;

  // Parse branch name from merge message like "Merge branch 'feature' into main"
  let label = t("Merging");
  if (state.mergeMsg) {
    const match = state.mergeMsg.match(
      /Merge (?:branch '([^']+)'|remote-tracking branch '([^']+)')/,
    );
    if (match) {
      label = t("Merging {branch}", { branch: match[1] || match[2] });
    }
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        background: "#e8f5e9",
        borderBottom: "1px solid #c8e6c9",
        fontSize: 12,
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 14 }}>⚠️</span>
      <span style={{ fontWeight: 600, flex: 1, color: "var(--app-fg, #ccc)" }}>
        {label}
      </span>
      <Tooltip text={t("Resolve Conflicts")} position="top">
        <div
          role="button"
          tabIndex={0}
          aria-disabled={loading}
          onClick={() => !loading && handleContinue()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!loading) handleContinue();
            }
          }}
          className="rebase-action-btn rebase-continue"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2.5 11.5L6 8L2.5 4.5"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M8.5 11.5L12 8L8.5 4.5"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </Tooltip>
      <Tooltip text={t("Abort Merge (git merge --abort)")} position="top">
        <div
          role="button"
          tabIndex={0}
          aria-disabled={loading}
          onClick={() => !loading && handleAbort()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (!loading) handleAbort();
            }
          }}
          className="rebase-action-btn rebase-abort"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 12L12 4M12 12L4 4"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </Tooltip>
    </div>
  );
}

export function CommitApp() {
  const {
    activeTab,
    setActiveTab,
    loading,
    fetchChanges,
    fetchShelves,
    fetchIdeaShelves,
  } = useCommitStore();

  useEffect(() => {
    fetchChanges();
    fetchShelves();
    fetchIdeaShelves();
  }, [fetchChanges, fetchShelves, fetchIdeaShelves]);

  return (
    <div className="commit-app">
      <div className="commit-tabs">
        <button
          type="button"
          className={`commit-tab ${activeTab === "commit" ? "active" : ""}`}
          onClick={() => setActiveTab("commit")}
        >
          {t("Commit")}
        </button>
        <button
          type="button"
          className={`commit-tab ${activeTab === "shelf" ? "active" : ""}`}
          onClick={() => setActiveTab("shelf")}
        >
          {t("Shelf")}
        </button>
        <button
          type="button"
          className={`commit-tab ${activeTab === "stash" ? "active" : ""}`}
          onClick={() => setActiveTab("stash")}
        >
          {t("Stash")}
        </button>
      </div>
      <RebaseBanner />
      <CherryPickBanner />
      <MergeBanner />
      <ProgressBar visible={loading} />
      <div className="commit-content">
        {activeTab === "commit" && <CommitTab />}
        {activeTab === "shelf" && <IdeaShelfTab />}
        {activeTab === "stash" && <ShelfTab />}
      </div>
    </div>
  );
}
