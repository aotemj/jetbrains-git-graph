import { useState, useCallback, useEffect, useRef } from "react";
import MdiChevronDown from "~icons/mdi/chevron-down";
import MdiChevronRight from "~icons/mdi/chevron-right";
import MdiFolder from "~icons/mdi/folder";
import MdiFolderOpen from "~icons/mdi/folder-open";
import MdiSourceBranch from "~icons/mdi/source-branch";
import MdiTag from "~icons/mdi/tag";
import MdiTagOutline from "~icons/mdi/tag-outline";
import { bridge } from "../../shared/bridge";
import { useModifierClickSelection } from "../../shared/hooks/useModifierClickSelection";
import { usePreventSelect } from "../../shared/hooks/usePreventSelect";
import { usePanelStore } from "../../shared/store/panel-store";
import type { BranchInfo, TagInfo } from "../../shared/types/git";

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

function sortTreeNodes(nodes: TreeNode[]): void {
  nodes.sort((a, b) => {
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

function tagsToTree(tags: TagInfo[]): TreeNode[] {
  return buildTree(
    tags.map((t) => ({
      segments: t.name.split("/"),
      tag: t,
    })),
  );
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

export function BranchTree() {
  const branches = usePanelStore((s) => s.branches);
  const tags = usePanelStore((s) => s.tags);
  const commits = usePanelStore((s) => s.commits);
  const currentBranch = usePanelStore((s) => s.currentBranch);
  const filter = usePanelStore((s) => s.filter);
  const setFilter = usePanelStore((s) => s.setFilter);
  const selectedBranches = usePanelStore((s) => s.selectedBranches);
  const selectBranch = usePanelStore((s) => s.selectBranch);

  const containerRef = usePreventSelect();

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [currentBranchRowSelected, setCurrentBranchRowSelected] =
    useState(false);

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

  const toggle = (key: string) => {
    setCurrentBranchRowSelected(false);
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const localBranches = branches.filter((b) => !b.isRemote);
  const remoteBranches = branches.filter((b) => b.isRemote);

  const headBranch = localBranches.find((b) => b.isCurrent);
  const headCommit = commits.find((c) => c.refs.some((r) => r.type === "HEAD"));

  const localTree = branchesToTree(localBranches);
  const remoteTree = branchesToTree(remoteBranches);
  const tagTree = tagsToTree(tags);

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
      ref={containerRef}
      style={{
        height: "100%",
        overflow: "auto",
        padding: "4px 0",
      }}
    >
      <div
        style={{
          padding: "0 8px",
          fontWeight: 600,
          opacity: 0.6,
          fontSize: "0.8em",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        Branches
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
          Current Branch
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
      {contextMenu && (
        <BranchContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          branch={contextMenu.branch}
          currentBranch={currentBranch}
          onClose={closeContextMenu}
        />
      )}
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
            <MdiTag style={{ verticalAlign: "middle", color: "#d4a017" }} />
          ) : (
            <MdiSourceBranch
              style={{
                verticalAlign: "middle",
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
          gap: 4,
        }}
      >
        {isCollapsed ? (
          <MdiFolder style={{ verticalAlign: "middle", color: "#90794e" }} />
        ) : (
          <MdiFolderOpen
            style={{ verticalAlign: "middle", color: "#90794e" }}
          />
        )}{" "}
        {node.name}
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
        <MdiTagOutline
          style={{ verticalAlign: "middle", color: "var(--description-fg)" }}
        />
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
          gap: 4,
        }}
      >
        {isCollapsed ? (
          <MdiFolder style={{ verticalAlign: "middle", color: "#90794e" }} />
        ) : (
          <MdiFolderOpen
            style={{ verticalAlign: "middle", color: "#90794e" }}
          />
        )}{" "}
        {node.name}
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
        {collapsed ? (
          <MdiChevronRight style={{ verticalAlign: "middle" }} />
        ) : (
          <MdiChevronDown style={{ verticalAlign: "middle" }} />
        )}{" "}
        {title}
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
        padding: `4px 8px 4px ${20 + depth * 12}px`,
        fontWeight: isCurrent || isFiltered ? 600 : 400,
        background:
          isCurrent && !isSelected
            ? "var(--list-hoverBackground, rgba(0,0,0,0.04))"
            : undefined,
        color: isSelected ? "var(--selected-fg)" : "inherit",
        outline: isFiltered ? "1px solid var(--focus-border, #007fd4)" : "none",
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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const isCurrent = branch.name === currentBranch;

  const handleCheckout = async () => {
    onClose();
    try {
      await bridge.request("checkoutBranch", { branchName: branch.name });
    } catch (err) {
      console.error("Checkout failed:", err);
    }
  };

  const handleNewBranch = async () => {
    onClose();
    const newName = prompt(`New branch name (from '${branch.name}'):`);
    if (!newName || !newName.trim()) return;
    try {
      await bridge.request("createBranch", {
        newBranchName: newName.trim(),
        startPoint: branch.name,
      });
    } catch (err) {
      console.error("Create branch failed:", err);
    }
  };

  const handleDelete = async () => {
    onClose();
    const confirmed = confirm(
      `Delete branch '${branch.name}'?`,
    );
    if (!confirmed) return;
    try {
      await bridge.request("deleteBranch", {
        branchName: branch.name,
        isRemote: branch.isRemote,
        force: false,
      });
    } catch (err) {
      // If normal delete fails (unmerged), ask for force delete
      const forceConfirmed = confirm(
        `Branch '${branch.name}' is not fully merged. Force delete?`,
      );
      if (forceConfirmed) {
        try {
          await bridge.request("deleteBranch", {
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
    const newName = prompt(`Rename branch '${branch.name}' to:`, branch.name);
    if (!newName || !newName.trim() || newName.trim() === branch.name) return;
    try {
      await bridge.request("renameBranch", {
        oldName: branch.name,
        newName: newName.trim(),
      });
    } catch (err) {
      console.error("Rename failed:", err);
    }
  };

  const handlePush = async () => {
    onClose();
    try {
      await bridge.request("pushBranch", {
        branchName: branch.name,
        force: false,
      });
    } catch (err) {
      console.error("Push failed:", err);
    }
  };

  const handleMerge = async () => {
    onClose();
    const confirmed = confirm(
      `Merge '${branch.name}' into '${currentBranch}'?`,
    );
    if (!confirmed) return;
    try {
      await bridge.request("mergeBranch", { branchName: branch.name });
    } catch (err) {
      console.error("Merge failed:", err);
    }
  };

  const handleRebase = async () => {
    onClose();
    const confirmed = confirm(
      `Rebase '${currentBranch}' onto '${branch.name}'?`,
    );
    if (!confirmed) return;
    try {
      await bridge.request("rebaseBranch", { onto: branch.name });
    } catch (err) {
      console.error("Rebase failed:", err);
    }
  };

  const handleCheckoutAndRebase = async () => {
    onClose();
    try {
      await bridge.request("checkoutAndRebase", {
        branchToCheckout: branch.name,
        rebaseOnto: currentBranch,
      });
    } catch (err) {
      console.error("Checkout and rebase failed:", err);
    }
  };

  const items: { label: string; action: () => void; disabled?: boolean; separator?: boolean }[] = [];

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
    items.push({ label: "Push...", action: handlePush });
  }

  if (items.length === 0) return null;

  return (
    <div
      ref={menuRef}
      style={{
        position: "fixed",
        top: y,
        left: x,
        zIndex: 9999,
        background: "var(--vscode-menu-background, #252526)",
        border: "1px solid var(--vscode-menu-border, #454545)",
        borderRadius: 4,
        padding: "4px 0",
        minWidth: 160,
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
      }}
    >
      {items.map((item, i) =>
        item.separator ? (
          <div
            key={`sep-${i}`}
            style={{
              height: 1,
              background: "var(--vscode-menu-separatorBackground, #454545)",
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
              color: "var(--vscode-menu-foreground, #ccc)",
              fontSize: "13px",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                (e.currentTarget as HTMLElement).style.background =
                  "var(--vscode-menu-selectionBackground, #094771)";
                (e.currentTarget as HTMLElement).style.color =
                  "var(--vscode-menu-selectionForeground, #fff)";
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
