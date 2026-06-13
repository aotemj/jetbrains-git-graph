import { useCallback, useEffect, useMemo, useState } from "react";
import { bridge } from "../shared/bridge";
import { FileTree } from "../shared/components/FileTree";
import { Tooltip } from "../shared/components/Tooltip";
import "../shared/components/Tooltip.css";
import type { DiffFile } from "../shared/types/git";

// ─── Icons (same paths as commit Toolbar) ──────────────────────────────

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M2.5 9V8C2.5 4.96243 4.96243 2.5 8 2.5C9.10679 2.5 10.1372 2.82692 11 3.38947"
        stroke="currentColor"
        strokeLinecap="round"
      />
      <path
        d="M5 12.6105C5.86278 13.1731 6.89321 13.5 8 13.5C11.0376 13.5 13.5 11.0376 13.5 8V7"
        stroke="currentColor"
        strokeLinecap="round"
      />
      <path
        d="M0.49997 7.50027L2.5 9.5L4.49998 7.50023"
        stroke="currentColor"
        strokeLinecap="round"
      />
      <path
        d="M11.5 8.49982L13.5 6.5L15.5 8.49982"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ViewOptionsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 4C4.5 4 2 8 2 8C2 8 4.5 12 8 12C11.5 12 14 8 14 8C14 8 11.5 4 8 4Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" />
    </svg>
  );
}

function ExpandAllIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M4.5 5.5L8 2L11.5 5.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 10.5L8 14L11.5 10.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CollapseAllIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M4.5 2.5L8 6L11.5 2.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 13.5L8 10L11.5 13.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{
        transform: collapsed ? "rotate(0deg)" : "rotate(90deg)",
        transition: "transform 0.15s",
      }}
    >
      <path
        d="M6 11.5L9.5 8L6 4.5"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M3.5 8.5L6.5 11.5L12.5 4.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Status constants ──────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  added: "A",
  deleted: "D",
  modified: "M",
  renamed: "R",
  copied: "C",
};

const STATUS_COLORS: Record<string, string> = {
  added: "var(--vscode-gitDecoration-addedResourceForeground, #587c0c)",
  deleted: "var(--vscode-gitDecoration-deletedResourceForeground, #c74e39)",
  modified: "var(--vscode-gitDecoration-modifiedResourceForeground, #3b8eea)",
  renamed: "var(--vscode-gitDecoration-submoduleResourceForeground, #c09553)",
  copied: "var(--vscode-gitDecoration-submoduleResourceForeground, #c09553)",
};

function groupByStatus(files: DiffFile[]) {
  const modified: DiffFile[] = [];
  const added: DiffFile[] = [];
  const deleted: DiffFile[] = [];
  const renamed: DiffFile[] = [];
  for (const f of files) {
    switch (f.status) {
      case "added":
        added.push(f);
        break;
      case "deleted":
        deleted.push(f);
        break;
      case "renamed":
      case "copied":
        renamed.push(f);
        break;
      default:
        modified.push(f);
        break;
    }
  }
  return { modified, added, deleted, renamed };
}

function collectAllDirPaths(
  files: DiffFile[],
  collapsed: Record<string, boolean>,
): string[] {
  const allDirs = new Set<string>();
  for (const file of files) {
    const parts = (file.newPath || file.oldPath).split("/");
    for (let i = 1; i < parts.length; i++) {
      allDirs.add(parts.slice(0, i).join("/"));
    }
  }
  for (const d of Object.keys(collapsed)) allDirs.add(d);
  return [...allDirs];
}

// ─── View Options Menu ─────────────────────────────────────────────────

function ViewOptionsMenu({
  groupByDir,
  onToggleGroupBy,
  onClose,
}: {
  groupByDir: boolean;
  onToggleGroupBy: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, zIndex: 999 }}
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      />
      <div
        className="commit-context-menu"
        style={{
          position: "absolute",
          top: "100%",
          right: 0,
          marginTop: 4,
          zIndex: 1000,
        }}
      >
        <div className="commit-context-menu-header">Group By</div>
        <button
          type="button"
          className="commit-context-menu-item"
          onClick={() => {
            onToggleGroupBy();
            onClose();
          }}
        >
          <span className="commit-context-menu-icon">
            {groupByDir && <CheckIcon />}
          </span>
          <span>Directory</span>
          <span className="commit-context-menu-shortcut">^P</span>
        </button>
      </div>
    </>
  );
}

// ─── CompareApp ───────────────────────────────────────────────────────

export function CompareApp() {
  const [compareHash, setCompareHash] = useState("");
  const [compareFiles, setCompareFiles] = useState<DiffFile[]>([]);
  const [untrackedFiles, setUntrackedFiles] = useState<DiffFile[]>([]);
  const [viewMode, setViewMode] = useState<"tree" | "flat">("tree");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["modified", "added", "deleted", "renamed"]),
  );

  const applyCompareData = useCallback(
    (data: {
      hash: string;
      files: DiffFile[];
      untrackedFiles?: DiffFile[];
    }) => {
      if (!data?.hash) return;
      setCompareHash(data.hash);
      setCompareFiles(data.files ?? []);
      setUntrackedFiles(data.untrackedFiles ?? []);
    },
    [],
  );

  // On mount: fetch any previously-stored compare state
  useEffect(() => {
    bridge
      .request("getCompareWithLocalState")
      .then((result) => {
        applyCompareData(
          result as {
            hash: string;
            files: DiffFile[];
            untrackedFiles?: DiffFile[];
          },
        );
      })
      .catch(() => {});
  }, [applyCompareData]);

  // Listen for live compareWithLocalChanged events (subsequent comparisons)
  useEffect(() => {
    const unsub = bridge.onEvent((event, data) => {
      if (event === "compareWithLocalChanged") {
        applyCompareData(
          data as {
            hash: string;
            files: DiffFile[];
            untrackedFiles?: DiffFile[];
          },
        );
      }
    });
    return unsub;
  }, [applyCompareData]);

  const shortHash = compareHash.substring(0, 7);

  const grouped = useMemo(() => groupByStatus(compareFiles), [compareFiles]);

  const handleFileClick = (_e: React.MouseEvent, file: DiffFile) => {
    bridge.request("showCompareWithLocalDiff", {
      hash: compareHash,
      filePath: file.newPath || file.oldPath,
      status: file.status,
    });
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleCollapse = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const expandAll = () => {
    setCollapsed({});
    setExpandedGroups(new Set(["modified", "deleted", "renamed", "added"]));
  };

  const collapseAll = () => {
    setCollapsed(
      Object.fromEntries(
        collectAllDirPaths(compareFiles, collapsed).map((d) => [d, true]),
      ),
    );
    setExpandedGroups(new Set());
  };

  const handleRefresh = () => {
    // Re-request compare data for the same commit
    if (compareHash) {
      bridge.request("compareWithLocal", { hash: compareHash });
    }
  };

  const handleClose = () => {
    bridge.request("compareWithLocalClear");
    setCompareHash("");
    setCompareFiles([]);
  };

  // Merge added-status diff files + untracked files into "Added"
  const addedAll = useMemo(
    () => [...grouped.added, ...untrackedFiles],
    [grouped.added, untrackedFiles],
  );

  const groups = [
    { key: "modified", label: "Modified", files: grouped.modified },
    ...(addedAll.length > 0
      ? [{ key: "added" as string, label: "Added", files: addedAll }]
      : []),
    { key: "deleted", label: "Deleted", files: grouped.deleted },
    { key: "renamed", label: "Renamed / Copied", files: grouped.renamed },
  ];

  const totalFiles = compareFiles.length + untrackedFiles.length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--vscode-sideBar-background)",
      }}
    >
      {/* Toolbar */}
      <div className="commit-toolbar">
        <Tooltip text="Refresh">
          <button
            type="button"
            className="commit-toolbar-btn"
            onClick={handleRefresh}
          >
            <RefreshIcon />
          </button>
        </Tooltip>
        <Tooltip text="Close">
          <button
            type="button"
            className="commit-toolbar-btn"
            onClick={handleClose}
          >
            <CloseIcon />
          </button>
        </Tooltip>

        <div className="commit-toolbar-spacer" />

        <div style={{ position: "relative" }}>
          <Tooltip text="View Options">
            <button
              type="button"
              className="commit-toolbar-btn"
              onClick={() => setShowViewMenu(!showViewMenu)}
            >
              <ViewOptionsIcon />
            </button>
          </Tooltip>
          {showViewMenu && (
            <ViewOptionsMenu
              groupByDir={viewMode === "tree"}
              onToggleGroupBy={() =>
                setViewMode((v) => (v === "tree" ? "flat" : "tree"))
              }
              onClose={() => setShowViewMenu(false)}
            />
          )}
        </div>
        <Tooltip text="Expand All">
          <button
            type="button"
            className="commit-toolbar-btn"
            onClick={expandAll}
          >
            <ExpandAllIcon />
          </button>
        </Tooltip>
        <Tooltip text="Collapse All">
          <button
            type="button"
            className="commit-toolbar-btn"
            onClick={collapseAll}
          >
            <CollapseAllIcon />
          </button>
        </Tooltip>
      </div>

      {/* Header */}
      <div
        style={{
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          borderBottom: "1px solid var(--vscode-sideBarSectionHeader-border)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: 600, fontSize: "13px" }}>
          Changes between
        </span>
        <span
          style={{
            fontFamily: "var(--vscode-editor-font-family, monospace)",
            fontSize: "12px",
            background: "var(--vscode-badge-background)",
            color: "var(--vscode-badge-foreground)",
            padding: "1px 6px",
            borderRadius: 3,
          }}
        >
          {shortHash}
        </span>
        <span style={{ fontSize: "13px" }}>and local</span>
      </div>

      {/* File groups */}
      <div style={{ flex: 1, overflow: "auto", overflowX: "hidden" }}>
        {groups.map((group) => {
          if (group.files.length === 0) return null;
          const isExpanded = expandedGroups.has(group.key);
          return (
            <div key={group.key}>
              <div
                onClick={() => toggleGroup(group.key)}
                style={{
                  padding: "6px 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  cursor: "pointer",
                  userSelect: "none",
                  borderTop:
                    "1px solid var(--vscode-sideBarSectionHeader-border)",
                  fontWeight: 600,
                  fontSize: "12px",
                  color: STATUS_COLORS[group.key] ?? "var(--vscode-foreground)",
                }}
              >
                <ChevronIcon collapsed={!isExpanded} />
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 18,
                    height: 18,
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 3,
                    color: "#fff",
                    background: STATUS_COLORS[group.key] ?? "#888",
                    flexShrink: 0,
                  }}
                >
                  {STATUS_LABELS[group.key] ?? "M"}
                </span>
                <span>{group.label}</span>
                <span
                  style={{
                    opacity: 0.5,
                    fontSize: "11px",
                    fontWeight: 400,
                  }}
                >
                  ({group.files.length}{" "}
                  {group.files.length === 1 ? "file" : "files"})
                </span>
              </div>
              {isExpanded && (
                <div style={{ paddingLeft: 20 }}>
                  <FileTree
                    files={group.files}
                    viewMode={viewMode}
                    selectedFiles={[]}
                    onFileClick={handleFileClick}
                    collapsed={collapsed}
                    onToggle={toggleCollapse}
                  />
                </div>
              )}
            </div>
          );
        })}
        {totalFiles === 0 && (
          <div style={{ padding: 24, textAlign: "center", opacity: 0.5 }}>
            {compareHash
              ? `No differences — working tree matches commit ${shortHash}`
              : 'Select a commit and use "Compare with Local" to see changes'}
          </div>
        )}
      </div>
    </div>
  );
}
