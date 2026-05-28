import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useModifierClickSelection } from "../../shared/hooks/useModifierClickSelection";
import { usePanelStore } from "../../shared/store/panel-store";
import type { Commit } from "../../shared/types/git";
import { CommitContextMenu } from "./CommitContextMenu";
import { type ColumnWidths, CommitRow, ROW_HEIGHT } from "./CommitRow";

const COLUMN_WIDTH = 16;
const GRAPH_PADDING = 8;

const DEFAULT_COLUMN_WIDTHS: ColumnWidths = {
  author: 100,
  date: 130,
  hash: 70,
};

export function CommitList({
  onScroll,
}: {
  onScroll?: (scrollTop: number) => void;
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
  const columnWidthsRef = useRef(columnWidths);
  columnWidthsRef.current = columnWidths;

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    commit: Commit;
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
        if (toRow == null) continue;

        const maxCol = Math.max(lane.column, line.toColumn, line.fromColumn);
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
        }}
      >
        <span style={{ flex: 1, paddingRight: 4 }}>Message</span>
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
          Author
        </span>
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
          Date
        </span>
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
          Hash
        </span>
      </div>

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
          />
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
