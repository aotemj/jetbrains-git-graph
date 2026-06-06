import { Tooltip } from "../../shared/components/Tooltip";
import { usePreventSelect } from "../../shared/hooks/usePreventSelect";
import { usePanelStore } from "../../shared/store/panel-store";
import type { Commit, LaneInfo, RefInfo } from "../../shared/types/git";

export const ROW_HEIGHT = 28;
const COLUMN_WIDTH = 10;
const GRAPH_PADDING = 6;
const NODE_TEXT_GAP = 14;

/** Tag icon colors matching IDEA */
const REF_ICON_COLORS: Record<string, string> = {
  branch: "#59a869",
  "remote-branch": "#b07cd8",
  tag: "#e5c07b",
  HEAD: "#e5c07b",
};

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function buildRefDisplayItems(refs: RefInfo[]): Array<{
  key: string;
  type: RefInfo["type"];
  label: string;
}> {
  return refs
    .filter(
      (ref) => !(ref.type === "remote-branch" && ref.name.endsWith("/HEAD")),
    )
    .map((ref, index) => ({
      key: `${ref.type}:${ref.name}:${index}`,
      type: ref.type,
      label: ref.type === "HEAD" ? "" : ref.name,
    }));
}

export interface ColumnWidths {
  author: number;
  date: number;
  hash: number;
}

export interface VisibleColumns {
  author: boolean;
  date: boolean;
  hash: boolean;
}

export function CommitRow({
  commit,
  lane,
  rowMaxColumn,
  columnWidths,
  visibleColumns,
  onCommitClick,
  onContextMenu,
}: {
  commit: Commit;
  lane: LaneInfo | undefined;
  rowMaxColumn: number;
  columnWidths: ColumnWidths;
  visibleColumns?: VisibleColumns;
  onCommitClick: (event: React.MouseEvent, hash: string) => void;
  onContextMenu?: (event: React.MouseEvent, commit: Commit) => void;
}) {
  const selectedCommitHashes = usePanelStore((s) => s.selectedCommitHashes);
  const setHoveredColumn = usePanelStore((s) => s.setHoveredColumn);
  const rowRef = usePreventSelect<HTMLDivElement>();

  const isSelected = selectedCommitHashes.includes(commit.hash);
  const col = lane?.column ?? 0;
  const refItems = buildRefDisplayItems(commit.refs);

  return (
    <div
      ref={rowRef}
      className={`selectable-row${isSelected ? " selected" : ""}`}
      onClick={(event) => onCommitClick(event, commit.hash)}
      onContextMenu={(e) => {
        if (onContextMenu) {
          e.preventDefault();
          e.stopPropagation();
          onContextMenu(e, commit);
        }
      }}
      onMouseEnter={() => setHoveredColumn(col)}
      onMouseLeave={() => setHoveredColumn(null)}
      style={{
        display: "flex",
        alignItems: "center",
        height: ROW_HEIGHT,
        paddingLeft:
          GRAPH_PADDING + (rowMaxColumn + 1) * COLUMN_WIDTH + NODE_TEXT_GAP,
        paddingRight: 8,
        color: isSelected ? "var(--selected-fg)" : "inherit",
      }}
    >
      {/* Subject + refs column (flex) */}
      <span
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
          paddingRight: 8,
          gap: 6,
        }}
      >
        <Tooltip text={commit.subject}>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              flexShrink: 1,
              minWidth: 0,
            }}
          >
            {commit.subject}
          </span>
        </Tooltip>
        {refItems.length > 0 && (
          <>
            <span style={{ flex: 1 }} />
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                flexShrink: 0,
              }}
            >
              {/* Overlapping outline tag icons */}
              <span
                style={{
                  display: "inline-flex",
                  position: "relative",
                  width: 16 + Math.max(0, (refItems.length - 1) * 5),
                  height: 16,
                }}
              >
                {refItems.map((item, idx) => {
                  const color =
                    REF_ICON_COLORS[item.type] ?? REF_ICON_COLORS.branch;
                  return (
                    <svg
                      key={item.key}
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      style={{ position: "absolute", left: idx * 5, top: 0 }}
                    >
                      <path
                        d="M2.5 3.5C2.5 2.95 2.95 2.5 3.5 2.5H7.09c.27 0 .52.1.71.3l5.41 5.41c.39.39.39 1.02 0 1.41l-3.59 3.59c-.39.39-1.02.39-1.41 0L2.79 7.8a1 1 0 01-.29-.71V3.5z"
                        fill="var(--app-bg, #fff)"
                        stroke={color}
                        strokeWidth="1.2"
                      />
                      <circle cx="5" cy="5" r="0.9" fill={color} />
                    </svg>
                  );
                })}
              </span>
              {/* Text labels (skip HEAD text) */}
              <Tooltip
                text={refItems
                  .filter((item) => item.type !== "HEAD")
                  .map((item) => item.label)
                  .join("  ")}
              >
                <span
                  style={{
                    fontSize: "0.8em",
                    whiteSpace: "nowrap",
                    opacity: 0.85,
                  }}
                >
                  {refItems
                    .filter((item) => item.type !== "HEAD")
                    .map((item) => item.label)
                    .join("  ")}
                </span>
              </Tooltip>
            </span>
          </>
        )}
      </span>

      {/* Author column */}
      {visibleColumns?.author !== false && (
        <span
          style={{
            flexShrink: 0,
            width: columnWidths.author,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            opacity: 0.7,
            paddingLeft: 8,
          }}
        >
          {commit.authorName}
        </span>
      )}

      {/* Date column */}
      {visibleColumns?.date !== false && (
        <span
          style={{
            flexShrink: 0,
            width: columnWidths.date,
            textAlign: "right",
            opacity: 0.5,
            paddingLeft: 8,
          }}
        >
          {formatDateTime(commit.authorDate)}
        </span>
      )}

      {/* Hash column */}
      {visibleColumns?.hash !== false && (
        <span
          style={{
            flexShrink: 0,
            width: columnWidths.hash,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            opacity: 0.5,
            paddingLeft: 8,
            fontFamily: "monospace",
            fontSize: "0.9em",
          }}
        >
          {commit.shortHash}
        </span>
      )}
    </div>
  );
}
