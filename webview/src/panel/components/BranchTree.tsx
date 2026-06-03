import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { bridge, bridgeWithProgress } from "../../shared/bridge";
import { useModifierClickSelection } from "../../shared/hooks/useModifierClickSelection";
import { usePreventSelect } from "../../shared/hooks/usePreventSelect";
import { usePanelStore } from "../../shared/store/panel-store";
import type { BranchInfo, TagInfo } from "../../shared/types/git";
import { BranchSidebar as BranchSidebarComponent } from "./BranchSidebar";

// ---------------------------------------------------------------------------
// Inline SVG Icons (stroke-based, IDEA style)
// ---------------------------------------------------------------------------

function IconChevronDown({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      style={{ verticalAlign: "middle", ...style }}
    >
      <polyline points="4,6 8,10 12,6" />
    </svg>
  );
}

function IconChevronRight({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      style={{ verticalAlign: "middle", ...style }}
    >
      <polyline points="6,4 10,8 6,12" />
    </svg>
  );
}

function IconFolder({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ verticalAlign: "middle", ...style }}
    >
      <path
        d="M8.10584 4.34613L8.25344 4.5H8.46667H13C13.8284 4.5 14.5 5.17157 14.5 6V12.1333C14.5 12.9529 13.932 13.5 13.3667 13.5H2.63333C2.06804 13.5 1.5 12.9529 1.5 12.1333V3.86667C1.5 3.04707 2.06804 2.5 2.63333 2.5H6.1217C6.25792 2.5 6.38824 2.55557 6.48253 2.65387L8.10584 4.34613Z"
        fill="currentColor"
        fillOpacity={0.15}
        stroke="currentColor"
      />
    </svg>
  );
}

function IconBranch({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ verticalAlign: "middle", ...style }}
    >
      <circle cx="4.5" cy="4" r="2" stroke="currentColor" />
      <path
        d="M4.5 11.5H8.5C9.60457 11.5 10.5 10.6046 10.5 9.5V9.5V8"
        stroke="currentColor"
      />
      <path
        d="M4.5 6.5L4.5 14.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10.5" cy="6" r="2" stroke="currentColor" />
    </svg>
  );
}

function IconTag({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ verticalAlign: "middle", ...style }}
    >
      <path d="M3 2.5h4.5l6 6-4.5 4.5-6-6V2.5z" stroke="currentColor" />
      <circle cx="5.5" cy="5" r="1" fill="currentColor" />
    </svg>
  );
}

function IconTagOutline({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ verticalAlign: "middle", ...style }}
    >
      <path
        d="M3 2.5h4.5l6 6-4.5 4.5-6-6V2.5z"
        stroke="currentColor"
        strokeDasharray="2 1.5"
      />
      <circle cx="5.5" cy="5" r="1" fill="currentColor" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Tree data structure
// ---------------------------------------------------------------------------

interface TreeNode {
  name: string; // segment name, e.g. "feature"
  fullPath: string; // full joined path, e.g. "feature/auth"
  children: TreeNode[];
  branch?: BranchInfo; // only on leaf nodes
  tag?: TagInfo; // only on leaf nodes (for tag trees)
  isLeaf: boolean;
}

function buildTree(
  items: { segments: string[]; branch?: BranchInfo; tag?: TagInfo }[],
): TreeNode[] {
  const roots: TreeNode[] = [];

  for (const item of items) {
    const { segments } = item;
    let siblings = roots;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isLast = i === segments.length - 1;
      const fullPath = segments.slice(0, i + 1).join("/");

      let existing = siblings.find(
        (n) => n.name === seg && n.isLeaf === isLast,
      );
      // For intermediate nodes, match any non-leaf with the same name
      if (!existing && !isLast) {
        existing = siblings.find((n) => n.name === seg && !n.isLeaf);
      }

      if (existing) {
        siblings = existing.children;
      } else {
        const node: TreeNode = {
          name: seg,
          fullPath,
          children: [],
          isLeaf: isLast,
          branch: isLast ? item.branch : undefined,
          tag: isLast ? item.tag : undefined,
        };
        siblings.push(node);
        siblings = node.children;
      }
    }
  }

  sortTreeNodes(roots);
  return roots;
}

function containsCurrentBranch(node: TreeNode): boolean {
  if (node.isLeaf) {
    return !!node.branch?.isCurrent;
  }
  return node.children.some(containsCurrentBranch);
}

function sortTreeNodes(nodes: TreeNode[]): void {
  nodes.sort((a, b) => {
    // Current branch (or folder containing it) always comes first.
    const aCurrent = a.isLeaf
      ? !!a.branch?.isCurrent
      : containsCurrentBranch(a);
    const bCurrent = b.isLeaf
      ? !!b.branch?.isCurrent
      : containsCurrentBranch(b);
    if (aCurrent !== bCurrent) {
      return aCurrent ? -1 : 1;
    }
    // Folders first, leaves after.
    if (a.isLeaf !== b.isLeaf) {
      return a.isLeaf ? 1 : -1;
    }
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });

  for (const node of nodes) {
    if (!node.isLeaf && node.children.length > 0) {
      sortTreeNodes(node.children);
    }
  }
}

function branchesToTree(branches: BranchInfo[]): TreeNode[] {
  return buildTree(
    branches.map((b) => ({
      segments: b.name.split("/"),
      branch: b,
    })),
  );
}

function branchesToFlatTree(branches: BranchInfo[]): TreeNode[] {
  const nodes: TreeNode[] = branches.map((b) => ({
    name: b.name,
    fullPath: b.name,
    children: [],
    branch: b,
    isLeaf: true,
  }));
  // Sort: current branch first, then alphabetical
  nodes.sort((a, b) => {
    const aCurrent = !!a.branch?.isCurrent;
    const bCurrent = !!b.branch?.isCurrent;
    if (aCurrent !== bCurrent) return aCurrent ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
  return nodes;
}

function tagsToTree(tags: TagInfo[]): TreeNode[] {
  return buildTree(
    tags.map((t) => ({
      segments: t.name.split("/"),
      tag: t,
    })),
  );
}

function tagsToFlatTree(tags: TagInfo[]): TreeNode[] {
  return tags.map((t) => ({
    name: t.name,
    fullPath: t.name,
    children: [],
    tag: t,
    isLeaf: true,
  }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function collectVisibleLeaves(
  nodes: TreeNode[],
  collapsed: Record<string, boolean>,
  groupPrefix: string,
): string[] {
  const result: string[] = [];
  for (const node of nodes) {
    if (node.isLeaf && node.branch) {
      result.push(node.branch.name);
    } else {
      const collapseKey = `${groupPrefix}:${node.fullPath}`;
      if (!collapsed[collapseKey]) {
        result.push(
          ...collectVisibleLeaves(node.children, collapsed, groupPrefix),
        );
      }
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

export function BranchTree({
  onTogglePanel,
}: {
  headerAction?: React.ReactNode;
  onTogglePanel?: () => void;
} = {}) {
  const branches = usePanelStore((s) => s.branches);
  const tags = usePanelStore((s) => s.tags);
  const commits = usePanelStore((s) => s.commits);
  const currentBranch = usePanelStore((s) => s.currentBranch);
  const filter = usePanelStore((s) => s.filter);
  const setFilter = usePanelStore((s) => s.setFilter);
  const selectedBranches = usePanelStore((s) => s.selectedBranches);
  const selectBranch = usePanelStore((s) => s.selectBranch);
  const branchGroupByDirectory = usePanelStore((s) => s.branchGroupByDirectory);

  const containerRef = usePreventSelect();

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [currentBranchRowSelected, setCurrentBranchRowSelected] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    branch: BranchInfo;
  } | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, branch: BranchInfo) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, branch });
    },
    [],
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Listen for expand-all / collapse-all events from sidebar
  useEffect(() => {
    const handleExpandAll = () => {
      setCollapsed({});
    };
    const handleCollapseAll = () => {
      setCollapsed((prev) => ({
        ...prev,
        local: true,
        remote: true,
        tags: true,
      }));
    };
    window.addEventListener("branch-tree-expand-all", handleExpandAll);
    window.addEventListener("branch-tree-collapse-all", handleCollapseAll);
    return () => {
      window.removeEventListener("branch-tree-expand-all", handleExpandAll);
      window.removeEventListener("branch-tree-collapse-all", handleCollapseAll);
    };
  }, []);

  const toggle = (key: string) => {
    setCurrentBranchRowSelected(false);
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const localBranches = branches.filter(
    (b) =>
      !b.isRemote &&
      (!searchQuery ||
        b.name.toLowerCase().includes(searchQuery.toLowerCase())),
  );
  const remoteBranches = branches.filter(
    (b) =>
      b.isRemote &&
      (!searchQuery ||
        b.name.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const headBranch = localBranches.find((b) => b.isCurrent);
  const headCommit = commits.find((c) => c.refs.some((r) => r.type === "HEAD"));

  const localTreeRaw = branchGroupByDirectory
    ? branchesToTree(localBranches)
    : branchesToFlatTree(localBranches);
  // Move the current branch (or folder containing it) to the top
  const localTree = (() => {
    const idx = localTreeRaw.findIndex((node) =>
      node.isLeaf ? node.branch?.isCurrent : containsCurrentBranch(node),
    );
    if (idx > 0) {
      const [current] = localTreeRaw.splice(idx, 1);
      localTreeRaw.unshift(current);
    }
    return localTreeRaw;
  })();
  const remoteTree = branchGroupByDirectory
    ? branchesToTree(remoteBranches)
    : branchesToFlatTree(remoteBranches);
  const filteredTags = tags.filter(
    (t) =>
      !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const tagTree = branchGroupByDirectory
    ? tagsToTree(filteredTags)
    : tagsToFlatTree(filteredTags);

  const allVisibleBranches: string[] = [
    ...(!collapsed.local
      ? collectVisibleLeaves(localTree, collapsed, "local")
      : []),
    ...(!collapsed.remote
      ? collectVisibleLeaves(remoteTree, collapsed, "remote")
      : []),
  ];

  const handleClick = useModifierClickSelection<string>(
    (branchName, mode) => {
      selectBranch(branchName, mode, allVisibleBranches);
    },
    () => setCurrentBranchRowSelected(false),
  );

  const handleBranchDoubleClick = (name: string) => {
    setCurrentBranchRowSelected(false);
    if (filter.branch === name) {
      setFilter({ branch: "" });
    } else {
      setFilter({ branch: name });
    }
  };

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
      }}
    >
      <BranchSidebarComponent onTogglePanel={onTogglePanel} />
      <div
        ref={containerRef}
        style={{
          flex: 1,
          height: "100%",
          overflow: "auto",
        }}
      >
        <div
          style={{
            padding: "4px 8px",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              flex: 1,
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              style={{
                position: "absolute",
                left: 7,
                opacity: 0.5,
                pointerEvents: "none",
              }}
            >
              <circle cx="7" cy="7" r="4.5" />
              <line x1="10.5" y1="10.5" x2="14" y2="14" />
            </svg>
            <input
              type="text"
              placeholder="Branch or tag"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "4px 24px",
                fontSize: "12px",
                border: "1px solid var(--vscode-input-border, #c4c4c4)",
                background: "var(--vscode-input-background, #1e1e1e)",
                color: "var(--vscode-input-foreground, #ccc)",
                borderRadius: 3,
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => {
                (e.target as HTMLElement).style.borderColor = "#3574f0";
              }}
              onBlur={(e) => {
                (e.target as HTMLElement).style.borderColor =
                  "var(--vscode-input-border, #c4c4c4)";
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.borderColor = "#3574f0";
              }}
              onMouseLeave={(e) => {
                if (document.activeElement !== e.target) {
                  (e.target as HTMLElement).style.borderColor =
                    "var(--vscode-input-border, #c4c4c4)";
                }
              }}
            />
            {searchQuery && (
              <div
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: 4,
                  cursor: "pointer",
                  opacity: 0.6,
                  display: "flex",
                  alignItems: "center",
                  padding: 2,
                  borderRadius: 3,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.opacity = "0.6";
                }}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                >
                  <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* HEAD – unified "Current Branch" entry */}
        {(headBranch || headCommit) && (
          <div
            onClick={() => {
              setCurrentBranchRowSelected(true);
            }}
            onDoubleClick={() => {
              if (headBranch) {
                handleBranchDoubleClick(headBranch.name);
              }
            }}
            style={{
              padding: "4px 8px 4px 20px",
              cursor: "pointer",
              fontWeight: 600,
              background: currentBranchRowSelected
                ? "var(--selected-bg)"
                : "transparent",
              color: currentBranchRowSelected
                ? "var(--selected-fg)"
                : "var(--description-fg)",
            }}
          >
            Current Branch: {headBranch?.name ?? "detached"}
          </div>
        )}

        {/* Local */}
        <GroupSection
          title="Local"
          collapsed={collapsed.local}
          onToggle={() => toggle("local")}
        >
          {localTree.map((node) => (
            <TreeNodeView
              key={node.fullPath}
              node={node}
              depth={0}
              groupPrefix="local"
              currentBranch={currentBranch}
              selectedBranches={selectedBranches}
              filteredBranch={filter.branch}
              onBranchClick={handleClick}
              onBranchDoubleClick={handleBranchDoubleClick}
              onBranchContextMenu={handleContextMenu}
              collapsed={collapsed}
              onToggle={toggle}
            />
          ))}
        </GroupSection>

        {/* Remote */}
        <GroupSection
          title="Remote"
          collapsed={collapsed.remote}
          onToggle={() => toggle("remote")}
        >
          {remoteTree.map((node) => (
            <TreeNodeView
              key={node.fullPath}
              node={node}
              depth={0}
              groupPrefix="remote"
              currentBranch={currentBranch}
              selectedBranches={selectedBranches}
              filteredBranch={filter.branch}
              onBranchClick={handleClick}
              onBranchDoubleClick={handleBranchDoubleClick}
              onBranchContextMenu={handleContextMenu}
              collapsed={collapsed}
              onToggle={toggle}
            />
          ))}
        </GroupSection>

        {/* Tags */}
        <GroupSection
          title="Tags"
          collapsed={collapsed.tags}
          onToggle={() => toggle("tags")}
        >
          {tagTree.map((node) => (
            <TagTreeNodeView
              key={node.fullPath}
              node={node}
              depth={0}
              groupPrefix="tags"
              collapsed={collapsed}
              onToggle={toggle}
            />
          ))}
        </GroupSection>

        {/* Context Menu */}
        {contextMenu &&
          createPortal(
            <BranchContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              branch={contextMenu.branch}
              currentBranch={currentBranch}
              onClose={closeContextMenu}
            />,
            document.body,
          )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TreeNodeView – recursive renderer for branch nodes
// ---------------------------------------------------------------------------

function TreeNodeView({
  node,
  depth,
  groupPrefix,
  currentBranch,
  selectedBranches,
  filteredBranch,
  onBranchClick,
  onBranchDoubleClick,
  onBranchContextMenu,
  collapsed,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  groupPrefix: string;
  currentBranch: string;
  selectedBranches: string[];
  filteredBranch: string;
  onBranchClick: (e: React.MouseEvent, name: string) => void;
  onBranchDoubleClick: (name: string) => void;
  onBranchContextMenu: (e: React.MouseEvent, branch: BranchInfo) => void;
  collapsed: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const collapseKey = `${groupPrefix}:${node.fullPath}`;

  const branch = node.branch;
  if (node.isLeaf && branch) {
    const isCurrent = branch.name === currentBranch;
    return (
      <BranchItem
        icon={
          isCurrent ? (
            <IconTag style={{ color: "#d4a017" }} />
          ) : (
            <IconBranch
              style={{
                color: "var(--description-fg)",
              }}
            />
          )
        }
        name={node.name}
        isCurrent={isCurrent}
        isSelected={selectedBranches.includes(branch.name)}
        isFiltered={filteredBranch === branch.name}
        onClick={(e) => onBranchClick(e, branch.name)}
        onDoubleClick={() => onBranchDoubleClick(branch.name)}
        onContextMenu={(e) => onBranchContextMenu(e, branch)}
        depth={depth}
        behind={branch.behind}
      />
    );
  }

  // Directory node
  const isCollapsed = collapsed[collapseKey] ?? false;

  return (
    <div>
      <div
        onClick={() => onToggle(collapseKey)}
        style={{
          padding: `4px 8px 4px ${20 + depth * 12}px`,
          cursor: "pointer",
          userSelect: "none",
          opacity: 0.8,
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        {isCollapsed ? <IconChevronRight /> : <IconChevronDown />}
        <IconFolder style={{ color: "var(--description-fg)" }} />
        <span style={{ marginLeft: 2 }}>{node.name}</span>
      </div>
      {!isCollapsed &&
        node.children.map((child) => (
          <TreeNodeView
            key={child.fullPath}
            node={child}
            depth={depth + 1}
            groupPrefix={groupPrefix}
            currentBranch={currentBranch}
            selectedBranches={selectedBranches}
            filteredBranch={filteredBranch}
            onBranchClick={onBranchClick}
            onBranchDoubleClick={onBranchDoubleClick}
            onBranchContextMenu={onBranchContextMenu}
            collapsed={collapsed}
            onToggle={onToggle}
          />
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TagTreeNodeView – recursive renderer for tag nodes
// ---------------------------------------------------------------------------

function TagTreeNodeView({
  node,
  depth,
  groupPrefix,
  collapsed,
  onToggle,
}: {
  node: TreeNode;
  depth: number;
  groupPrefix: string;
  collapsed: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const collapseKey = `${groupPrefix}:${node.fullPath}`;

  if (node.isLeaf) {
    return (
      <div
        style={{
          padding: `4px 8px 4px ${20 + depth * 12}px`,
          cursor: "default",
          color: "var(--description-fg)",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <IconTagOutline style={{ color: "var(--description-fg)" }} />
        {node.name}
      </div>
    );
  }

  const isCollapsed = collapsed[collapseKey] ?? false;

  return (
    <div>
      <div
        onClick={() => onToggle(collapseKey)}
        style={{
          padding: `4px 8px 4px ${20 + depth * 12}px`,
          cursor: "pointer",
          userSelect: "none",
          opacity: 0.8,
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        {isCollapsed ? <IconChevronRight /> : <IconChevronDown />}
        <IconFolder style={{ color: "var(--description-fg)" }} />
        <span style={{ marginLeft: 2 }}>{node.name}</span>
      </div>
      {!isCollapsed &&
        node.children.map((child) => (
          <TagTreeNodeView
            key={child.fullPath}
            node={child}
            depth={depth + 1}
            groupPrefix={groupPrefix}
            collapsed={collapsed}
            onToggle={onToggle}
          />
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function GroupSection({
  title,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  collapsed?: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        onClick={onToggle}
        style={{
          padding: "4px 8px",
          cursor: "pointer",
          userSelect: "none",
          opacity: 0.8,
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        {collapsed ? <IconChevronRight /> : <IconChevronDown />} {title}
      </div>
      {!collapsed && children}
    </div>
  );
}

function BranchItem({
  icon,
  name,
  isCurrent,
  isSelected,
  isFiltered,
  onClick,
  onDoubleClick,
  onContextMenu,
  depth,
  behind = 0,
}: {
  icon: React.ReactNode;
  name: string;
  isCurrent: boolean;
  isSelected: boolean;
  isFiltered: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  depth: number;
  behind?: number;
}) {
  return (
    <div
      className={`selectable-row${isSelected ? " selected" : ""}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      style={{
        padding: `4px 8px 4px ${20 + depth * 12 + 16}px`,
        fontWeight: isCurrent || isFiltered ? 600 : 400,
        background:
          isCurrent && !isSelected
            ? "var(--list-hoverBackground, rgba(0,0,0,0.04))"
            : undefined,
        color: isSelected ? "var(--selected-fg)" : "inherit",
        outline: isFiltered ? "1px solid var(--focus-border, #3574f0)" : "none",
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span
        style={{
          flex: 1,
          minWidth: 0,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {name}
      </span>
      {behind > 0 && (
        <span
          style={{
            color: "var(--link-fg, #1a73e8)",
            marginLeft: 4,
            flexShrink: 0,
            whiteSpace: "nowrap",
            fontSize: "0.85em",
          }}
        >
          ↙ {behind}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// BranchContextMenu – right-click context menu for branches
// ---------------------------------------------------------------------------

function BranchContextMenu({
  x,
  y,
  branch,
  currentBranch,
  onClose,
}: {
  x: number;
  y: number;
  branch: BranchInfo;
  currentBranch: string;
  onClose: () => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  // Adjust position after first render to keep menu within viewport
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    // Use requestAnimationFrame to ensure the menu is rendered and measurable
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const viewportW = window.innerWidth;

      let top = y;
      let left = x;

      // If menu overflows bottom, show above cursor or clamp to bottom
      if (top + rect.height > viewportH) {
        // Try showing above the click point
        const above = y - rect.height;
        if (above >= 4) {
          top = above;
        } else {
          top = Math.max(4, viewportH - rect.height - 4);
        }
      }
      // If menu overflows right
      if (left + rect.width > viewportW) {
        left = Math.max(4, viewportW - rect.width - 4);
      }

      setPosition({ top, left });
    });
  }, [x, y]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const handleBlur = () => {
      onClose();
    };
    const handleScroll = (e: Event) => {
      // Only close if scroll happens outside the menu itself
      if (
        menuRef.current &&
        e.target instanceof Node &&
        !menuRef.current.contains(e.target)
      ) {
        onClose();
      }
    };
    const handleContextMenu = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Use capture phase to intercept clicks before any other handler
    document.addEventListener("mousedown", handleClickOutside, true);
    document.addEventListener("contextmenu", handleContextMenu, true);
    document.addEventListener("keydown", handleEscape);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleBlur);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
      document.removeEventListener("contextmenu", handleContextMenu, true);
      document.removeEventListener("keydown", handleEscape);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleBlur);
    };
  }, [onClose]);

  const isCurrent = branch.name === currentBranch;

  const handleCheckout = async () => {
    onClose();
    try {
      await bridgeWithProgress("checkoutBranch", { branchName: branch.name });
    } catch (err) {
      console.error("Checkout failed:", err);
    }
  };

  const handleNewBranch = async () => {
    onClose();
    const result = (await bridge.request("showInputBox", {
      prompt: `New branch name (from '${branch.name}'):`,
      placeHolder: "branch-name",
      value: branch.name,
    })) as { value: string | null };
    if (!result.value || !result.value.trim()) return;
    try {
      await bridge.request("createBranch", {
        newBranchName: result.value.trim(),
        startPoint: branch.name,
      });
    } catch (err) {
      console.error("Create branch failed:", err);
    }
  };

  const handleDelete = async () => {
    onClose();
    const result = (await bridge.request("showConfirmMessage", {
      message: `Delete branch '${branch.name}'?`,
      confirmLabel: "Delete",
    })) as { confirmed: boolean };
    if (!result.confirmed) return;
    try {
      await bridgeWithProgress("deleteBranch", {
        branchName: branch.name,
        isRemote: branch.isRemote,
        force: false,
      });
    } catch (_err) {
      // If normal delete fails (unmerged), ask for force delete
      const forceResult = (await bridge.request("showConfirmMessage", {
        message: `Branch '${branch.name}' is not fully merged. Force delete?`,
        confirmLabel: "Force Delete",
      })) as { confirmed: boolean };
      if (forceResult.confirmed) {
        try {
          await bridgeWithProgress("deleteBranch", {
            branchName: branch.name,
            isRemote: branch.isRemote,
            force: true,
          });
        } catch (err2) {
          console.error("Force delete failed:", err2);
        }
      }
    }
  };

  const handleRename = async () => {
    onClose();
    const result = (await bridge.request("showInputBox", {
      prompt: `Rename branch '${branch.name}' to:`,
      value: branch.name,
    })) as { value: string | null };
    if (
      !result.value ||
      !result.value.trim() ||
      result.value.trim() === branch.name
    )
      return;
    try {
      await bridge.request("renameBranch", {
        oldName: branch.name,
        newName: result.value.trim(),
      });
    } catch (err) {
      console.error("Rename failed:", err);
    }
  };

  const handlePush = async () => {
    onClose();
    try {
      await bridgeWithProgress("pushBranch", {
        branchName: branch.name,
        force: false,
      });
    } catch (err) {
      console.error("Push failed:", err);
    }
  };

  const handleUpdate = async () => {
    onClose();
    try {
      await bridgeWithProgress("pullBranch", { branchName: branch.name });
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  const handleMerge = async () => {
    onClose();
    const result = (await bridge.request("showConfirmMessage", {
      message: `Merge '${branch.name}' into '${currentBranch}'?`,
      confirmLabel: "Merge",
    })) as { confirmed: boolean };
    if (!result.confirmed) return;
    try {
      await bridgeWithProgress("mergeBranch", { branchName: branch.name });
    } catch (err) {
      console.error("Merge failed:", err);
    }
  };

  const handleRebase = async () => {
    onClose();
    const result = (await bridge.request("showConfirmMessage", {
      message: `Rebase '${currentBranch}' onto '${branch.name}'?`,
      confirmLabel: "Rebase",
    })) as { confirmed: boolean };
    if (!result.confirmed) return;
    try {
      await bridgeWithProgress("rebaseBranch", { onto: branch.name });
    } catch (err) {
      console.error("Rebase failed:", err);
    }
  };

  const handleCheckoutAndRebase = async () => {
    onClose();
    try {
      await bridgeWithProgress("checkoutAndRebase", {
        branchToCheckout: branch.name,
        rebaseOnto: currentBranch,
      });
    } catch (err) {
      console.error("Checkout and rebase failed:", err);
    }
  };

  const items: {
    label: string;
    action: () => void;
    disabled?: boolean;
    separator?: boolean;
  }[] = [];

  if (!isCurrent) {
    items.push({ label: "Checkout", action: handleCheckout });
  }
  items.push({
    label: `New Branch from '${branch.name}'...`,
    action: handleNewBranch,
  });
  if (!isCurrent) {
    items.push({
      label: `Checkout and Rebase onto '${currentBranch}'`,
      action: handleCheckoutAndRebase,
    });
  }

  if (!isCurrent) {
    items.push({ label: "", action: () => {}, separator: true });
    items.push({
      label: `Rebase '${currentBranch}' onto '${branch.name}'`,
      action: handleRebase,
    });
    items.push({
      label: `Merge '${branch.name}' into '${currentBranch}'`,
      action: handleMerge,
    });
  }

  if (!isCurrent) {
    items.push({ label: "", action: () => {}, separator: true });
    if (!branch.isRemote) {
      items.push({ label: "Rename...", action: handleRename });
    }
    items.push({ label: "Delete", action: handleDelete });
  }

  if (!branch.isRemote) {
    items.push({ label: "", action: () => {}, separator: true });
    items.push({ label: "Update", action: handleUpdate });
    items.push({ label: "Push...", action: handlePush });
  }

  if (items.length === 0) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: position ? position.top : -9999,
        left: position ? position.left : -9999,
        zIndex: 9999,
        background: "var(--vscode-menu-background, #fff)",
        border: "1px solid var(--vscode-menu-border, #e0e0e0)",
        borderRadius: 4,
        padding: "4px 0",
        minWidth: 160,
        maxHeight: "calc(100vh - 8px)",
        overflowY: "auto",
        boxShadow: "0 3px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)",
        visibility: position ? "visible" : "hidden",
      }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div
            key={`sep-${i}`}
            style={{
              height: 1,
              background: "var(--vscode-menu-separatorBackground, #e8e8e8)",
              margin: "4px 0",
            }}
          />
        ) : (
          <div
            key={item.label}
            onClick={item.disabled ? undefined : item.action}
            style={{
              padding: "6px 16px",
              cursor: item.disabled ? "default" : "pointer",
              opacity: item.disabled ? 0.5 : 1,
              color: "var(--vscode-menu-foreground, #333)",
              fontSize: "13px",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                (e.currentTarget as HTMLElement).style.background =
                  "var(--vscode-menu-selectionBackground, #e8f0fe)";
                (e.currentTarget as HTMLElement).style.color =
                  "var(--vscode-menu-selectionForeground, #333)";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "transparent";
              (e.currentTarget as HTMLElement).style.color =
                "var(--vscode-menu-foreground, #ccc)";
            }}
          >
            {item.label}
          </div>
        ),
      )}
    </div>
  );
}
