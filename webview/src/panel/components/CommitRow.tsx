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
  "remote-branch": "#9b7dd4",
  tag: "#c4a000",
  HEAD: "#e06c75",
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
  const branchRef = refs.find((ref) => ref.type === "branch");
  const hasHead = refs.some((ref) => ref.type === "HEAD");
  const result: Array<{ key: string; type: RefInfo["type"]; label: string }> =
    [];

  // Collect all branch names (local and remote)
  const localBranches: string[] = [];
  const remoteBranches: string[] = [];
  const tags: string[] = [];

  for (const ref of refs) {
    if (ref.type === "HEAD") continue;
    if (ref.type === "branch") {
      // Always collect local branches for merge logic
      localBranches.push(ref.name);
      continue;
    }
    if (ref.type === "remote-branch") {
      // Skip remote HEAD pointers (e.g. origin/HEAD)
      if (ref.name.endsWith("/HEAD")) continue;
      remoteBranches.push(ref.name);
      continue;
    }
    if (ref.type === "tag") {
      tags.push(ref.name);
    }
  }

  // Build merged branch display
  const displayNames: string[] = [];
  const usedRemotes = new Set<string>();
  const usedLocals = new Set<string>();

  for (const local of localBranches) {
    // Find matching remote (e.g. "origin/prod" matches local "prod")
    const matchingRemote = remoteBranches.find((rb) => {
      const baseName = rb.includes("/")
        ? rb.substring(rb.indexOf("/") + 1)
        : rb;
      return baseName === local;
    });
    if (matchingRemote) {
      // Merge: show "origin & branchName" style
      const remote = matchingRemote.substring(0, matchingRemote.indexOf("/"));
      displayNames.push(`${remote} & ${local}`);
      usedRemotes.add(matchingRemote);
      usedLocals.add(local);
    }
  }

  // Add local branches that weren't merged (skip if HEAD covers it)
  for (const local of localBranches) {
    if (usedLocals.has(local)) continue;
    if (hasHead && branchRef?.name === local) continue; // HEAD already represents this
    displayNames.push(local);
  }

  // Add remaining remote branches not merged with local
  for (const rb of remoteBranches) {
    if (!usedRemotes.has(rb)) {
      displayNames.push(rb);
    }
  }

  // HEAD: show icon only (no text label) in row display
  if (hasHead) {
    // HEAD adds one extra icon but no text
    result.push({ key: "HEAD", type: "HEAD", label: "" });
    // Ensure the branch name is shown if not already merged with remote
    if (branchRef && !usedLocals.has(branchRef.name)) {
      displayNames.unshift(branchRef.name);
    }
  }

  // Render branch/remote tags
  for (const name of displayNames) {
    const isRemote = name.includes("/") || name.includes(" & ");
    result.push({
      key: `branch:${name}`,
      type: isRemote ? "remote-branch" : "branch",
      label: name,
    });
  }

  // Tags
  for (const tag of tags) {
    result.push({ key: `tag:${tag}`, type: "tag", label: tag });
  }

  return result;
}

export interface ColumnWidths {
  author: number;
  date: number;
  hash: number;
}

export function CommitRow({
  commit,
  lane,
  rowMaxColumn,
  columnWidths,
  onCommitClick,
  onContextMenu,
}: {
  commit: Commit;
  lane: LaneInfo | undefined;
  rowMaxColumn: number;
  columnWidths: ColumnWidths;
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
        {refItems.length > 0 && (
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
                width: 14 + Math.max(0, (refItems.length - 1) * 6),
                height: 14,
              }}
            >
              {refItems.map((item, idx) => {
                const color =
                  REF_ICON_COLORS[item.type] ?? REF_ICON_COLORS.branch;
                return (
                  <svg
                    key={item.key}
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    style={{ position: "absolute", left: idx * 6, top: 0 }}
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
            <span
              style={{ fontSize: "0.8em", whiteSpace: "nowrap", opacity: 0.85 }}
            >
              {refItems
                .filter((item) => item.type !== "HEAD")
                .map((item) => item.label)
                .join("  ")}
            </span>
          </span>
        )}
      </span>

      {/* Author column */}
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

      {/* Date column */}
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

      {/* Hash column */}
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
    </div>
  );
}
