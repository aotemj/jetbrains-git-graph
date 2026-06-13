import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { bridge, bridgeWithProgress } from "../../shared/bridge";
import { usePanelStore } from "../../shared/store/panel-store";
import type { Commit } from "../../shared/types/git";

// IntelliJ-style icons for commit context menu
function IconCopy() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect
        x="2.5"
        y="3.5"
        width="9"
        height="10"
        rx="1.5"
        stroke="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M11 2h.6C12.37 2 13 2.63 13 3.4v.51c0 .03 0 .06 0 .09v7.55c.6-.44 1-1.15 1-1.95V3.4C14 2.07 12.93 1 11.6 1H6.4c-.8 0-1.51.39-1.95 1H6.4H11z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconCherryPick() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="5" cy="11.5" r="2.5" stroke="currentColor" />
      <circle cx="10.5" cy="10.5" r="2.5" stroke="currentColor" />
      <path
        d="M5 9C5 6 4 4 7 2"
        stroke="currentColor"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M10.5 8C10.5 5.5 11 4 8 2"
        stroke="currentColor"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function IconRevert() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.85 1.85a.5.5 0 00-.7-.7L1.65 4.65 1.3 5l.35.35 3.5 3.5a.5.5 0 00.7-.7L3.21 5.5H10.5a3.5 3.5 0 010 7H5.5a.5.5 0 000 1h5a4.5 4.5 0 000-9H3.21l2.64-2.65z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconBranch() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="4.5" cy="4" r="2" stroke="currentColor" />
      <path
        d="M4.5 11.5H8.5C9.6 11.5 10.5 10.6 10.5 9.5V8"
        stroke="currentColor"
      />
      <path d="M4.5 6.5V14.5" stroke="currentColor" strokeLinecap="round" />
      <circle cx="10.5" cy="6" r="2" stroke="currentColor" />
    </svg>
  );
}

function IconTag() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 2.5h4.5l6 6-4.5 4.5-6-6V2.5z" stroke="currentColor" />
      <circle cx="5.5" cy="5" r="1" fill="currentColor" />
    </svg>
  );
}

interface CommitContextMenuProps {
  x: number;
  y: number;
  commit: Commit;
  onClose: () => void;
  onCreateBranch?: (hash: string, defaultName: string) => void;
}

export function CommitContextMenu({
  x,
  y,
  commit,
  onClose,
  onCreateBranch,
}: CommitContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const currentBranch = usePanelStore((s) => s.currentBranch);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const [isRebasing, setIsRebasing] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isCherryPicking, setIsCherryPicking] = useState(false);

  // Query rebase/merge/cherry-pick state to determine if Drop Commit should be disabled
  useEffect(() => {
    const fetchRepoState = async () => {
      try {
        const [rebaseState, mergeState, cherryPickState] = await Promise.all([
          bridge.request("getRebaseState") as Promise<{ isRebasing: boolean }>,
          bridge.request("getMergeState") as Promise<{ isMerging: boolean }>,
          bridge.request("getCherryPickState") as Promise<{
            isCherryPicking: boolean;
          }>,
        ]);
        setIsRebasing(rebaseState?.isRebasing ?? false);
        setIsMerging(mergeState?.isMerging ?? false);
        setIsCherryPicking(cherryPickState?.isCherryPicking ?? false);
      } catch {
        // If we can't determine state, leave as not disabled
      }
    };
    fetchRepoState();
  }, []);

  // Adjust position after first render
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const viewportW = window.innerWidth;

      let top = y;
      let left = x;

      if (top + rect.height > viewportH) {
        const above = y - rect.height;
        if (above >= 4) {
          top = above;
        } else {
          top = Math.max(4, viewportH - rect.height - 4);
        }
      }
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
    const handleBlur = () => onClose();
    const handleScroll = (e: Event) => {
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

  const shortHash = commit.shortHash || commit.hash.slice(0, 8);

  const handleCompareWithLocal = async () => {
    onClose();
    try {
      await bridge.request("compareWithLocal", { hash: commit.hash });
    } catch (err) {
      console.error("Compare with Local failed:", err);
    }
  };

  const handleCopyHash = async () => {
    onClose();
    try {
      await bridge.request("copyToClipboard", { text: commit.hash });
    } catch (err) {
      console.error("Copy failed:", err);
    }
  };

  const handleCherryPick = async () => {
    onClose();
    try {
      await bridgeWithProgress("cherryPick", { hash: commit.hash });
    } catch (err) {
      console.error("Cherry-pick failed:", err);
    }
  };

  const handleCheckoutRevision = async () => {
    onClose();
    try {
      await bridgeWithProgress("checkoutCommit", { hash: commit.hash });
    } catch (err) {
      console.error("Checkout revision failed:", err);
    }
  };

  const handleResetHard = async () => {
    onClose();
    const result = (await bridge.request("showConfirmMessage", {
      message: `Reset '${currentBranch}' to ${shortHash} (hard)? This will discard all uncommitted changes.`,
      confirmLabel: "Reset",
    })) as { confirmed: boolean };
    if (!result.confirmed) return;
    try {
      await bridgeWithProgress("resetToCommit", {
        hash: commit.hash,
        mode: "hard",
      });
    } catch (err) {
      console.error("Reset failed:", err);
    }
  };

  const handleResetMixed = async () => {
    onClose();
    try {
      await bridgeWithProgress("resetToCommit", {
        hash: commit.hash,
        mode: "mixed",
      });
    } catch (err) {
      console.error("Reset failed:", err);
    }
  };

  const handleResetSoft = async () => {
    onClose();
    try {
      await bridgeWithProgress("resetToCommit", {
        hash: commit.hash,
        mode: "soft",
      });
    } catch (err) {
      console.error("Reset failed:", err);
    }
  };

  const handleRevert = async () => {
    onClose();
    try {
      await bridgeWithProgress("revertCommit", { hash: commit.hash });
    } catch (err) {
      console.error("Revert failed:", err);
    }
  };

  const handleDropCommit = async () => {
    onClose();
    try {
      const result = (await bridge.request("showConfirmMessage", {
        message: `Drop commit ${shortHash} "${commit.subject}"?\n\nThis will remove the commit from history but keep its changes as unstaged modifications.\n\nThis operation cannot be undone.`,
        confirmLabel: "Drop Commit",
      })) as { confirmed: boolean };
      if (!result.confirmed) return;
      await bridgeWithProgress("dropCommit", { hash: commit.hash });
    } catch (err) {
      console.error("Drop commit failed:", err);
    }
  };

  const handleNewBranch = async () => {
    onClose();
    if (onCreateBranch) {
      onCreateBranch(commit.hash, "");
      return;
    }
    // Fallback to showInputBox if no dialog handler provided
    const result = (await bridge.request("showInputBox", {
      prompt: `Create new branch from ${shortHash}:`,
      placeHolder: "branch-name",
    })) as { value: string | null };
    if (!result.value || !result.value.trim()) return;
    try {
      await bridge.request("createBranchFromCommit", {
        branchName: result.value.trim(),
        hash: commit.hash,
      });
    } catch (err) {
      console.error("Create branch failed:", err);
    }
  };

  const handleNewTag = async () => {
    onClose();
    const result = (await bridge.request("showInputBox", {
      prompt: `Create tag at ${shortHash}:`,
      placeHolder: "tag-name",
    })) as { value: string | null };
    if (!result.value || !result.value.trim()) return;
    try {
      await bridge.request("createTag", {
        tagName: result.value.trim(),
        hash: commit.hash,
      });
    } catch (err) {
      console.error("Create tag failed:", err);
    }
  };

  const filter = usePanelStore((s) => s.filter);
  const selectCommit = usePanelStore((s) => s.selectCommit);

  const handleShowInGitLog = () => {
    onClose();
    // Clear file filter and select this commit in the full log
    usePanelStore.getState().setFilter({ file: "" });
    // After refresh, select this commit
    setTimeout(() => {
      selectCommit(commit.hash);
    }, 500);
  };

  // Drop Commit is disabled when in detached HEAD, rebasing, merging, or cherry-picking
  const isDropCommitDisabled =
    !currentBranch || isRebasing || isMerging || isCherryPicking;

  const items: {
    label: string;
    action: () => void;
    separator?: boolean;
    icon?: React.ReactNode;
    disabled?: boolean;
  }[] = [
    {
      label: `Copy Revision Number`,
      action: handleCopyHash,
      icon: <IconCopy />,
    },
    {
      label: "Compare with Local",
      action: handleCompareWithLocal,
      icon: (
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
      ),
    },
    {
      label: "Cherry-Pick",
      action: handleCherryPick,
      icon: <IconCherryPick />,
    },
    { label: "", action: () => {}, separator: true },
    { label: "Checkout Revision", action: handleCheckoutRevision },
    { label: "", action: () => {}, separator: true },
    {
      label: "Reset Current Branch to Here (Mixed)...",
      action: handleResetMixed,
      icon: <IconRevert />,
    },
    {
      label: "Reset Current Branch to Here (Soft)...",
      action: handleResetSoft,
      icon: <IconRevert />,
    },
    {
      label: "Reset Current Branch to Here (Hard)...",
      action: handleResetHard,
      icon: <IconRevert />,
    },
    { label: "Revert Commit", action: handleRevert, icon: <IconRevert /> },
    {
      label: "Drop Commit",
      action: handleDropCommit,
      icon: <IconRevert />,
      disabled: isDropCommitDisabled,
    },
    { label: "", action: () => {}, separator: true },
    { label: "New Branch...", action: handleNewBranch, icon: <IconBranch /> },
    { label: "New Tag...", action: handleNewTag, icon: <IconTag /> },
  ];

  // Add "Show in Git Log" when file filter is active
  if (filter.file) {
    items.push({ label: "", action: () => {}, separator: true });
    items.push({
      label: "Show in Git Log",
      action: handleShowInGitLog,
      icon: <IconBranch />,
    });
  }

  const menu = (
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
        minWidth: 200,
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
              padding: "6px 12px",
              cursor: item.disabled ? "default" : "pointer",
              opacity: item.disabled ? 0.5 : 1,
              color: "var(--vscode-menu-foreground, #333)",
              fontSize: "13px",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 8,
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
            <span style={{ width: 16, flexShrink: 0, opacity: 0.7 }}>
              {item.icon ?? null}
            </span>
            {item.label}
          </div>
        ),
      )}
    </div>
  );

  return createPortal(menu, document.body);
}
