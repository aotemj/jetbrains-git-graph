import { useCallback, useRef, useState } from "react";
import { bridge } from "../../shared/bridge";
import { Tooltip } from "../../shared/components/Tooltip";
import "../../shared/components/Tooltip.css";
import { usePanelStore } from "../../shared/store/panel-store";

export function BranchSidebar({
  onTogglePanel,
}: {
  onTogglePanel?: () => void;
} = {}) {
  const selectedBranches = usePanelStore((s) => s.selectedBranches);
  const selectedBranch =
    selectedBranches.length === 1 ? selectedBranches[0] : null;
  const branchGroupByDirectory = usePanelStore((s) => s.branchGroupByDirectory);
  const toggleBranchGroupByDirectory = usePanelStore(
    (s) => s.toggleBranchGroupByDirectory,
  );

  const handleNewBranch = useCallback(() => {
    bridge.request("createBranchPrompt");
  }, []);

  const handleUpdateSelected = useCallback(() => {
    if (selectedBranch) {
      bridge.request("pullBranch", { branchName: selectedBranch });
    }
  }, [selectedBranch]);

  const handleDeleteBranch = useCallback(() => {
    if (selectedBranch) {
      bridge.request("deleteBranchPrompt", { branchName: selectedBranch });
    }
  }, [selectedBranch]);

  const handleCompareWithCurrent = useCallback(() => {
    if (selectedBranch) {
      bridge.request("compareWithCurrent", { branchName: selectedBranch });
    }
  }, [selectedBranch]);

  const handleShowMyBranches = useCallback(() => {
    bridge.request("showMyBranches");
  }, []);

  const handleFetch = useCallback(() => {
    bridge.request("fetchAll");
  }, []);

  const handleToggleFavorite = useCallback(() => {
    if (selectedBranch) {
      bridge.request("toggleFavorite", { branchName: selectedBranch });
    }
  }, [selectedBranch]);

  const handleNavigateToHead = useCallback(() => {
    if (selectedBranch) {
      bridge.request("navigateToHead", { branchName: selectedBranch });
    }
  }, [selectedBranch]);

  const handleExpandAll = useCallback(() => {
    window.dispatchEvent(new CustomEvent("branch-tree-expand-all"));
  }, []);

  const handleCollapseAll = useCallback(() => {
    window.dispatchEvent(new CustomEvent("branch-tree-collapse-all"));
  }, []);

  return (
    <div className="branch-sidebar">
      {onTogglePanel && (
        <Tooltip text="Hide Branches">
          <button
            type="button"
            className="branch-sidebar-btn"
            onClick={onTogglePanel}
          >
            <IconCollapsePanel />
          </button>
        </Tooltip>
      )}
      <Tooltip text="New Branch">
        <button
          type="button"
          className="branch-sidebar-btn"
          onClick={handleNewBranch}
        >
          <IconAdd />
        </button>
      </Tooltip>
      <Tooltip text="Update Selected">
        <button
          type="button"
          className="branch-sidebar-btn"
          onClick={handleUpdateSelected}
          disabled={!selectedBranch}
        >
          <IconUpdate />
        </button>
      </Tooltip>
      <Tooltip text="Delete Branch">
        <button
          type="button"
          className="branch-sidebar-btn"
          onClick={handleDeleteBranch}
          disabled={!selectedBranch}
        >
          <IconDelete />
        </button>
      </Tooltip>
      <Tooltip text="Compare with Current">
        <button
          type="button"
          className="branch-sidebar-btn"
          onClick={handleCompareWithCurrent}
          disabled={!selectedBranch}
        >
          <IconCompare />
        </button>
      </Tooltip>
      <Tooltip text="Show My Branches">
        <button
          type="button"
          className="branch-sidebar-btn"
          onClick={handleShowMyBranches}
        >
          <IconSearch />
        </button>
      </Tooltip>
      <Tooltip text="Fetch">
        <button
          type="button"
          className="branch-sidebar-btn"
          onClick={handleFetch}
        >
          <IconFetch />
        </button>
      </Tooltip>
      <Tooltip text="Mark/Unmark As Favorite">
        <button
          type="button"
          className="branch-sidebar-btn"
          onClick={handleToggleFavorite}
          disabled={!selectedBranch}
        >
          <IconStar />
        </button>
      </Tooltip>
      <Tooltip text="Navigate Log to Selected Branch Head">
        <button
          type="button"
          className="branch-sidebar-btn"
          onClick={handleNavigateToHead}
          disabled={!selectedBranch}
        >
          <IconLocate />
        </button>
      </Tooltip>
      <SettingsButton />
      <Tooltip
        text={branchGroupByDirectory ? "Flatten List" : "Group By Directory"}
      >
        <button
          type="button"
          className={`branch-sidebar-btn${branchGroupByDirectory ? " active" : ""}`}
          onClick={toggleBranchGroupByDirectory}
        >
          <IconListFiles />
        </button>
      </Tooltip>

      <div className="branch-sidebar-spacer" />

      <Tooltip text="Expand All">
        <button
          type="button"
          className="branch-sidebar-btn"
          onClick={handleExpandAll}
        >
          <IconExpandAll />
        </button>
      </Tooltip>
      <Tooltip text="Collapse All">
        <button
          type="button"
          className="branch-sidebar-btn"
          onClick={handleCollapseAll}
        >
          <IconCollapseAll />
        </button>
      </Tooltip>
    </div>
  );
}

/* ─── Settings Button with Dropdown ──────────────────────────────── */

function SettingsButton() {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Tooltip text="Settings">
        <button
          type="button"
          className="branch-sidebar-btn"
          ref={btnRef}
          onClick={() => setOpen(!open)}
        >
          <IconSettings />
        </button>
      </Tooltip>
      {open && <SettingsMenu onClose={() => setOpen(false)} />}
    </>
  );
}

function SettingsMenu({ onClose }: { onClose: () => void }) {
  const menuRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const handleClick = (e: MouseEvent) => {
        if (!node.contains(e.target as Node)) onClose();
      };
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") onClose();
      };
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKey);
      return () => {
        document.removeEventListener("mousedown", handleClick);
        document.removeEventListener("keydown", handleKey);
      };
    },
    [onClose],
  );

  return (
    <div
      ref={menuRef}
      className="commit-context-menu"
      style={{
        position: "fixed",
        left: 40,
        top: "50%",
        zIndex: 1000,
      }}
    >
      <div className="commit-context-menu-header">On Single Click</div>
      <button
        type="button"
        className="commit-context-menu-item"
        onClick={() => {
          bridge.request("setSingleClickAction", {
            action: "updateBranchFilter",
          });
          onClose();
        }}
      >
        <span>Update Branch Filter</span>
      </button>
      <button
        type="button"
        className="commit-context-menu-item"
        onClick={() => {
          bridge.request("setSingleClickAction", {
            action: "navigateToHead",
          });
          onClose();
        }}
      >
        <span>Navigate Log to Branch Head</span>
      </button>
      <div className="commit-context-menu-separator" />
      <button
        type="button"
        className="commit-context-menu-item"
        onClick={() => {
          bridge.request("toggleShowTags");
          onClose();
        }}
      >
        <span>✓ Show Tags</span>
      </button>
    </div>
  );
}

/* ─── JetBrains Official Icons (Apache 2.0) ──────────────────────── */

/** expui/general/add.svg */
function IconAdd() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.5 1C7.77614 1 8 1.22386 8 1.5V7H13.5C13.7761 7 14 7.22386 14 7.5C14 7.77614 13.7761 8 13.5 8H8V13.5C8 13.7761 7.77614 14 7.5 14C7.22386 14 7 13.7761 7 13.5V8H1.5C1.22386 8 1 7.77614 1 7.5C1 7.22386 1.22386 7 1.5 7H7V1.5C7 1.22386 7.22386 1 7.5 1Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** expui/vcs/update.svg */
function IconUpdate() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12.8536 3.85355C13.0488 3.65829 13.0488 3.34171 12.8536 3.14645C12.6583 2.95118 12.3417 2.95118 12.1464 3.14645L4 11.2929V5.5C4 5.22386 3.77614 5 3.5 5C3.22386 5 3 5.22386 3 5.5V12.5C3 12.7761 3.22386 13 3.5 13H10.5C10.7761 13 11 12.7761 11 12.5C11 12.2239 10.7761 12 10.5 12H4.70711L12.8536 3.85355Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** expui/general/delete.svg */
function IconDelete() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 2H9C9.55228 2 10 2.44772 10 3H6C6 2.44772 6.44772 2 7 2ZM5 3C5 1.89543 5.89543 1 7 1H9C10.1046 1 11 1.89543 11 3H13C13.5523 3 14 3.44772 14 4V5V6H13V13C13 14.1046 12.1046 15 11 15H5C3.89543 15 3 14.1046 3 13V6H2V5V4C2 3.44772 2.44772 3 3 3H5ZM11 4H10H6H5H3V5H4H12H13V4H11ZM4 6H12V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V6ZM6.5 7C6.22386 7 6 7.22386 6 7.5V11.5C6 11.7761 6.22386 12 6.5 12C6.77614 12 7 11.7761 7 11.5V7.5C7 7.22386 6.77614 7 6.5 7ZM9 7.5C9 7.22386 9.22386 7 9.5 7C9.77614 7 10 7.22386 10 7.5V11.5C10 11.7761 9.77614 12 9.5 12C9.22386 12 9 11.7761 9 11.5V7.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** expui/vcs/diff.svg (compare with current = diff) */
function IconCompare() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.85355 8.14645C5.65829 7.95118 5.34171 7.95118 5.14645 8.14645C4.95118 8.34171 4.95118 8.65829 5.14645 8.85355L7.29289 11H0.5C0.223858 11 0 11.2239 0 11.5C0 11.7761 0.223858 12 0.5 12H7.29289L5.14645 14.1464C4.95118 14.3417 4.95118 14.6583 5.14645 14.8536C5.34171 15.0488 5.65829 15.0488 5.85355 14.8536L8.85355 11.8536L9.20711 11.5L8.85355 11.1464L5.85355 8.14645Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10.1464 1.14645C10.3417 0.951185 10.6583 0.951185 10.8536 1.14645C11.0488 1.34171 11.0488 1.65829 10.8536 1.85355L8.70711 4H15.5C15.7761 4 16 4.22386 16 4.5C16 4.77614 15.7761 5 15.5 5H8.70711L10.8536 7.14645C11.0488 7.34171 11.0488 7.65829 10.8536 7.85355C10.6583 8.04882 10.3417 8.04882 10.1464 7.85355L7.14645 4.85355L6.79289 4.5L7.14645 4.14645L10.1464 1.14645Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** expui/general/search.svg */
function IconSearch() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="4.5" stroke="currentColor" />
      <path
        d="M10.1992 10.2002L13.4992 13.4961"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** expui/vcs/fetch.svg */
function IconFetch() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M12.8536 3.14645C13.0488 3.34171 13.0488 3.65829 12.8536 3.85355L11.4393 5.26777C11.2441 5.46303 10.9275 5.46303 10.7322 5.26777C10.537 5.0725 10.537 4.75592 10.7322 4.56066L12.1464 3.14645C12.3417 2.95118 12.6583 2.95118 12.8536 3.14645Z"
        fill="currentColor"
      />
      <path
        d="M10.0251 5.97487C10.2204 6.17014 10.2204 6.48672 10.0251 6.68198L8.61091 8.09619C8.41565 8.29146 8.09907 8.29146 7.90381 8.09619C7.70854 7.90093 7.70854 7.58435 7.90381 7.38909L9.31802 5.97487C9.51328 5.77961 9.82986 5.77961 10.0251 5.97487Z"
        fill="currentColor"
      />
      <path
        d="M7.1967 8.8033C7.39196 8.99856 7.39196 9.31515 7.1967 9.51041L5.78249 10.9246C5.58722 11.1199 5.27064 11.1199 5.07538 10.9246C4.88012 10.7294 4.88012 10.4128 5.07538 10.2175L6.48959 8.8033C6.68485 8.60804 7.00144 8.60804 7.1967 8.8033Z"
        fill="currentColor"
      />
      <path
        d="M3.5 5C3.77614 5 4 5.22386 4 5.5V7.5C4 7.77614 3.77614 8 3.5 8C3.22386 8 3 7.77614 3 7.5V5.5C3 5.22386 3.22386 5 3.5 5Z"
        fill="currentColor"
      />
      <path
        d="M3.5 9C3.77614 9 4 9.22386 4 9.5V12H6.5C6.77614 12 7 12.2239 7 12.5C7 12.7761 6.77614 13 6.5 13H3.5C3.22386 13 3 12.7761 3 12.5V9.5C3 9.22386 3.22386 9 3.5 9Z"
        fill="currentColor"
      />
      <path
        d="M8 12.5C8 12.2239 8.22386 12 8.5 12H10.5C10.7761 12 11 12.2239 11 12.5C11 12.7761 10.7761 13 10.5 13H8.5C8.22386 13 8 12.7761 8 12.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** expui/nodes/star.svg (outline version) */
function IconStar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 2.5L9.3 5.7L12.8 6L10 8.4L10.8 12L8 10.2L5.2 12L6 8.4L3.2 6L6.7 5.7L8 2.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** expui/general/locate.svg */
function IconLocate() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.5 5V2.02054C11.4149 2.26101 13.739 4.5851 13.9795 7.5H11C10.7239 7.5 10.5 7.72386 10.5 8C10.5 8.27614 10.7239 8.5 11 8.5H13.9795C13.739 11.4149 11.4149 13.739 8.5 13.9795V11C8.5 10.7239 8.27614 10.5 8 10.5C7.72386 10.5 7.5 10.7239 7.5 11V13.9795C4.5851 13.739 2.26101 11.4149 2.02054 8.5H5C5.27614 8.5 5.5 8.27614 5.5 8C5.5 7.72386 5.27614 7.5 5 7.5H2.02054C2.26101 4.5851 4.5851 2.26101 7.5 2.02054V5C7.5 5.27614 7.72386 5.5 8 5.5C8.27614 5.5 8.5 5.27614 8.5 5ZM1 8C1 4.13401 4.13401 1 8 1C11.866 1 15 4.13401 15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** expui/general/settings.svg – stroke-based gear */
function IconSettings() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M6.5 1.5H9.5L10 3.5L12 4.5L14 3.5L15 6L13.5 7.5V8.5L15 10L14 12.5L12 11.5L10 12.5L9.5 14.5H6.5L6 12.5L4 11.5L2 12.5L1 10L2.5 8.5V7.5L1 6L2 3.5L4 4.5L6 3.5L6.5 1.5Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" />
    </svg>
  );
}

/** expui/actions/groupByPackage.svg – folder inside brackets */
function IconListFiles() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 3.5V12.5M2 3.5H3.5M2 12.5H3.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 3.5V12.5M14 3.5H12.5M14 12.5H12.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 6H7L8 7H10.5V10.5H5.5V6Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Based on expui/general/chevronUp.svg (doubled for expand all) */
function IconExpandAll() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M4.5 9L8 5.5L11.5 9"
        stroke="currentColor"
        strokeLinecap="round"
      />
      <path
        d="M4.5 13L8 9.5L11.5 13"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Based on expui/general/chevronDown.svg (doubled for collapse all) */
function IconCollapseAll() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M11.5 7L8 10.5L4.5 7"
        stroke="currentColor"
        strokeLinecap="round"
      />
      <path
        d="M11.5 3L8 6.5L4.5 3"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Collapse panel – left-pointing chevron */
function IconCollapsePanel() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M10 4.5L6.5 8L10 11.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
