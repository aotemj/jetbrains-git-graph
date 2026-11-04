import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { bridge } from "../../shared/bridge";
import { useModifierClickSelection } from "../../shared/hooks/useModifierClickSelection";
import { t } from "../../shared/i18n";
import { usePanelStore } from "../../shared/store/panel-store";
import type { Commit } from "../../shared/types/git";
import { CommitContextMenu } from "./CommitContextMenu";
import {
  type ColumnWidths,
  CommitRow,
  ROW_HEIGHT,
  type VisibleColumns,
} from "./CommitRow";
import { CreateBranchDialog } from "./CreateBranchDialog";

const COLUMN_WIDTH = 16;
const GRAPH_PADDING = 8;

const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
  author: 100,
  date: 130,
  hash: 70,
};

export function CommitList({
  onScroll,
  onHeaderHeight,
}: {
  onScroll?: (scrollTop: number) => void;
  onHeaderHeight?: (height: number) => void;
}) {
  const visibleCommits = usePanelStore((s) => s.visibleCommits);
  const graphLayout = usePanelStore((s) => s.graphLayout);
  const hasMore = usePanelStore((s) => s.hasMore);
  const loadMore = usePanelStore((s) => s.loadMore);
  const loading = usePanelStore((s) => s.loading);
  const selectCommit = usePanelStore((s) => s.selectCommit);

  const parentRef = useRef<HTMLDivElement>(null);
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(
    DEFAULT_COLUMN_WIDTHS,
  );
  const visibleColumns = usePanelStore((s) => s.visibleColumns);
  const [headerMenu, setHeaderMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const columnWidthsRef = useRef(columnWidths);
  columnWidthsRef.current = columnWidths;

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    commit: Commit;
  } | null>(null);

  // Create branch dialog state (triggered from commit context menu)
  const [createBranchDialog, setCreateBranchDialog] = useState<{
    hash: string;
    shortHash: string;
  } | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, commit: Commit) => {
      setContextMenu({ x: e.clientX, y: e.clientY, commit });
    },
    [],
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const maxColumn = Math.max(
    0,
    ...Object.values(graphLayout).map((l) => l.column),
  );
  const graphWidth = (maxColumn + 1) * COLUMN_WIDTH + GRAPH_PADDING * 2;

  // Compute per-row max column considering ALL lanes passing through each row
  const rowMaxColumns = useMemo(() => {
    const result: Record<string, number> = {};
    // Initialize with each commit's own column
    for (const commit of visibleCommits) {
      const lane = graphLayout[commit.hash];
      result[commit.hash] = lane?.column ?? 0;
    }

    // Build row index map
    const rowIndex: Record<string, number> = {};
    for (let i = 0; i < visibleCommits.length; i++) {
      rowIndex[visibleCommits[i].hash] = i;
    }

    // For each commit's lines, mark all rows between source and target
    for (const commit of visibleCommits) {
      const lane = graphLayout[commit.hash];
      if (!lane) continue;
      const fromRow = rowIndex[commit.hash];
      if (fromRow == null) continue;

      for (const line of lane.lines) {
        const toRow = rowIndex[line.toCommit];
        const maxCol = Math.max(lane.column, line.toColumn, line.fromColumn);

        if (toRow == null) {
          // Stub line: mark the source row itself (already done in init)
          // No additional rows to mark since stub only extends slightly
          continue;
        }

        const startRow = Math.min(fromRow, toRow);
        const endRow = Math.max(fromRow, toRow);

        // Mark all rows this line passes through
        for (let r = startRow; r <= endRow; r++) {
          const hash = visibleCommits[r]?.hash;
          if (hash && (result[hash] ?? 0) < maxCol) {
            result[hash] = maxCol;
          }
        }
      }
    }

    // Second pass: ensure each row's maxColumn is at least as large as
    // any lane that is still "active" (passing through) at that row.
    // We do this by propagating: if row N has a commit in column C whose
    // parent is beyond visible range, and there's no line to mark below,
    // the next row should still account for that lane passing through.
    // Simple approach: scan top-to-bottom, track active columns.
    const activeColumns = new Set<number>();
    for (let i = 0; i < visibleCommits.length; i++) {
      const hash = visibleCommits[i].hash;
      const lane = graphLayout[hash];
      if (!lane) continue;

      // This commit occupies its column
      activeColumns.add(lane.column);

      // If any of its lines connect to a visible target, that lane
      // ends (for the purpose of passing through) at the target row.
      // Lines going to non-visible targets keep the lane "active" indefinitely
      // within our loaded range — but we already handle that via the stub.
      // The key fix: ensure this row accounts for all active columns.
      const maxActive = activeColumns.size > 0 ? Math.max(...activeColumns) : 0;
      if ((result[hash] ?? 0) < maxActive) {
        result[hash] = maxActive;
      }

      // Remove columns whose lines terminate at this row
      // (this commit is the target of a line from above)
      // We detect this: if this commit's hash appears as toCommit
      // for a lane in the row above it, and the column differs, then
      // the fork/merge lane ends here.
      // Simplified: just remove this commit's column if it has no
      // lines going further down (i.e., no parents in visible range and
      // no stub needed because it's a root)
      if (lane.lines.length === 0) {
        activeColumns.delete(lane.column);
      }
    }

    return result;
  }, [visibleCommits, graphLayout]);

  const virtualizer = useVirtualizer({
    count: visibleCommits.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 20,
  });
  const allVisibleCommitHashes = visibleCommits.map((commit) => commit.hash);

  const handleCommitClick = useModifierClickSelection<string>((hash, mode) => {
    void selectCommit(hash, mode, allVisibleCommitHashes);
  });

  // Keyboard navigation (Arrow Up/Down)
  const selectedCommitHashes = usePanelStore((s) => s.selectedCommitHashes);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      if (!visibleCommits.length) return;

      // Only handle when no input is focused
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement
      )
        return;

      e.preventDefault();

      const currentHash =
        selectedCommitHashes.length > 0
          ? selectedCommitHashes[selectedCommitHashes.length - 1]
          : null;
      const currentIdx = currentHash
        ? visibleCommits.findIndex((c) => c.hash === currentHash)
        : -1;

      let nextIdx: number;
      if (e.key === "ArrowUp") {
        nextIdx = currentIdx <= 0 ? 0 : currentIdx - 1;
      } else {
        nextIdx =
          currentIdx >= visibleCommits.length - 1
            ? visibleCommits.length - 1
            : currentIdx + 1;
      }

      const nextHash = visibleCommits[nextIdx].hash;
      void selectCommit(nextHash, "single", allVisibleCommitHashes);

      // Scroll the selected row into view with some padding
      // Show 3 rows ahead so user can see upcoming items
      const scrollIdx =
        e.key === "ArrowDown"
          ? Math.min(nextIdx + 3, visibleCommits.length - 1)
          : Math.max(nextIdx - 3, 0);
      virtualizer.scrollToIndex(scrollIdx, { align: "auto" });
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    visibleCommits,
    selectedCommitHashes,
    selectCommit,
    allVisibleCommitHashes,
    virtualizer,
  ]);

  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    onScroll?.(el.scrollTop);
    if (
      !loading &&
      hasMore &&
      el.scrollTop + el.clientHeight >= el.scrollHeight - ROW_HEIGHT * 5
    ) {
      loadMore();
    }
  }, [onScroll, loading, hasMore, loadMore]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    // Report header height = offset of scroll area from container top
    if (onHeaderHeight && el.parentElement) {
      onHeaderHeight(el.offsetTop);
    }
  }, [onHeaderHeight]);

  // Resize handlers using startX approach for stable dragging
  const [resizing, setResizing] = useState<string | null>(null);

  const startResize = useCallback(
    (column: "author" | "date" | "hash", e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startWidth = columnWidthsRef.current[column];
      setResizing(column);

      // Prevent text selection during drag
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const onMouseMove = (ev: MouseEvent) => {
        const diff = startX - ev.clientX;
        const newWidth = Math.max(
          column === "author" ? 40 : column === "date" ? 60 : 50,
          startWidth + diff,
        );
        setColumnWidths((prev) => ({ ...prev, [column]: newWidth }));
      };

      const onMouseUp = () => {
        setResizing(null);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [],
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
      }}
    >
      {/* Column header with resize handles */}
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          setHeaderMenu({ x: e.clientX, y: e.clientY });
        }}
        style={{
          display: "flex",
          alignItems: "center",
          height: 24,
          paddingLeft: Math.min(graphWidth, 60),
          paddingRight: 8,
          borderBottom: "1px solid var(--border, #333)",
          fontSize: "11px",
          opacity: 0.6,
          flexShrink: 0,
          userSelect: "none",
          position: "relative",
          zIndex: 3,
          background: "var(--app-bg, #1e1e1e)",
        }}
      >
        <span style={{ flex: 1, paddingRight: 4 }}>{t("Message")}</span>
        {visibleColumns.author && (
          <>
            <ColumnResizeHandle
              active={resizing === "author"}
              onMouseDown={(e) => startResize("author", e)}
            />
            <span
              style={{
                flexShrink: 0,
                width: columnWidths.author,
                paddingLeft: 8,
              }}
            >
              {t("Author")}
            </span>
          </>
        )}
        {visibleColumns.date && (
          <>
            <ColumnResizeHandle
              active={resizing === "date"}
              onMouseDown={(e) => startResize("date", e)}
            />
            <span
              style={{
                flexShrink: 0,
                width: columnWidths.date,
                textAlign: "right",
                paddingLeft: 8,
              }}
            >
              {t("Date")}
            </span>
          </>
        )}
        {visibleColumns.hash && (
          <>
            <ColumnResizeHandle
              active={resizing === "hash"}
              onMouseDown={(e) => startResize("hash", e)}
            />
            <span
              style={{
                flexShrink: 0,
                width: columnWidths.hash,
                paddingLeft: 8,
              }}
            >
              {t("Hash")}
            </span>
          </>
        )}
      </div>

      {/* Column header context menu */}
      {headerMenu && (
        <HeaderColumnMenu
          x={headerMenu.x}
          y={headerMenu.y}
          visibleColumns={visibleColumns}
          onToggle={(col) =>
            usePanelStore.getState().toggleColumnVisibility(col)
          }
          onClose={() => setHeaderMenu(null)}
        />
      )}

      {/* Scrollable commit list */}
      <div
        ref={parentRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          position: "relative",
        }}
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((item) => {
            const commit = visibleCommits[item.index];
            const lane = graphLayout[commit.hash];
            return (
              <div
                key={commit.hash}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: ROW_HEIGHT,
                  transform: `translateY(${item.start}px)`,
                }}
              >
                <CommitRow
                  commit={commit}
                  lane={lane}
                  rowMaxColumn={rowMaxColumns[commit.hash] ?? 0}
                  columnWidths={columnWidths}
                  visibleColumns={visibleColumns}
                  onCommitClick={handleCommitClick}
                  onContextMenu={handleContextMenu}
                />
              </div>
            );
          })}
        </div>
        {contextMenu && (
          <CommitContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            commit={contextMenu.commit}
            onClose={closeContextMenu}
            onCreateBranch={(hash, _defaultName) => {
              closeContextMenu();
              const shortHash = hash.slice(0, 8);
              setCreateBranchDialog({ hash, shortHash });
            }}
          />
        )}
        {createBranchDialog &&
          createPortal(
            <CreateBranchDialog
              title={t("Create Branch from {hash}", {
                hash: createBranchDialog.shortHash,
              })}
              defaultName=""
              placeholder="branch-name"
              onClose={() => setCreateBranchDialog(null)}
              onConfirm={async ({ branchName, checkout, force }) => {
                const hash = createBranchDialog.hash;
                try {
                  await bridge.request("createBranchFromCommit", {
                    branchName,
                    hash,
                    checkout,
                    force,
                  });
                  setCreateBranchDialog(null);
                  return undefined;
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err);
                  const match = msg.match(/fatal:\s*(.+)/);
                  return match
                    ? match[1]
                    : t(
                        "Branch '{branch}' already exists.\nChange the name or overwrite existing branch.",
                        { branch: branchName },
                      );
                }
              }}
            />,
            document.body,
          )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ColumnResizeHandle
// ---------------------------------------------------------------------------

function ColumnResizeHandle({
  active,
  onMouseDown,
}: {
  active: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const highlight = active || hovered;

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: 9,
        cursor: "col-resize",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        padding: "0 3px",
      }}
    >
      <div
        style={{
          width: highlight ? 2 : 1,
          height: "70%",
          background: highlight
            ? "var(--vscode-focusBorder, #007fd4)"
            : "var(--border, #444)",
          borderRadius: 1,
          transition: "width 0.1s, background 0.1s",
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// HeaderColumnMenu – right-click context menu for toggling column visibility
// ---------------------------------------------------------------------------

function HeaderColumnMenu({
  x,
  y,
  visibleColumns,
  onToggle,
  onClose,
}: {
  x: number;
  y: number;
  visibleColumns: VisibleColumns;
  onToggle: (col: keyof VisibleColumns) => void;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick, true);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick, true);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const columns: { key: keyof VisibleColumns; label: string }[] = [
    { key: "author", label: t("Author") },
    { key: "date", label: t("Date") },
    { key: "hash", label: t("Hash") },
  ];

  return (
    <div
      ref={menuRef}
      className="commit-context-menu"
      style={{
        position: "fixed",
        left: x,
        top: y,
        zIndex: 10000,
      }}
    >
      <div className="commit-context-menu-header">{t("Columns")}</div>
      {columns.map((col) => (
        <button
          key={col.key}
          type="button"
          className="commit-context-menu-item"
          onClick={() => onToggle(col.key)}
        >
          <span style={{ width: 16, display: "inline-block" }}>
            {visibleColumns[col.key] ? "✓" : ""}
          </span>
          <span>{col.label}</span>
        </button>
      ))}
    </div>
  );
}
