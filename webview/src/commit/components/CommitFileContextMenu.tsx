import { useCallback, useEffect, useRef, useState } from "react";
import { t } from "../../shared/i18n";
import type { WorkingTreeFile } from "../../shared/store/commit-store";
import { useCommitStore } from "../../shared/store/commit-store";

interface CommitFileContextMenuProps {
  x: number;
  y: number;
  file: WorkingTreeFile;
  onClose: () => void;
}

export function CommitFileContextMenu({
  x,
  y,
  file,
  onClose,
}: CommitFileContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    stageFile,
    unstageFile,
    rollbackFile,
    showDiff,
    shelveChanges,
    highlightedFiles,
    changes,
  } = useCommitStore();

  // Close on outside click, Escape, blur, or scroll
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
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
    document.addEventListener("mousedown", handleClick, true);
    document.addEventListener("keydown", handleKey);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleBlur);
    return () => {
      document.removeEventListener("mousedown", handleClick, true);
      document.removeEventListener("keydown", handleKey);
      window.removeEventListener("blur", handleBlur);
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleBlur);
    };
  }, [onClose]);

  // Position adjustment to keep menu in viewport
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  }>({ top: y, left: x });

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
        top = above >= 4 ? above : Math.max(4, viewportH - rect.height - 4);
      }
      if (left + rect.width > viewportW) {
        left = Math.max(4, viewportW - rect.width - 4);
      }
      setPosition({ top, left });
    });
  }, [x, y]);

  const style: React.CSSProperties = {
    position: "fixed",
    left: position.left,
    top: position.top,
    zIndex: 1000,
  };

  const handleShowDiff = useCallback(() => {
    showDiff(file.path, file.staged);
    onClose();
  }, [file, showDiff, onClose]);

  const handleStage = useCallback(() => {
    stageFile(file.path);
    onClose();
  }, [file, stageFile, onClose]);

  const handleUnstage = useCallback(() => {
    unstageFile(file.path);
    onClose();
  }, [file, unstageFile, onClose]);

  const handleRollback = useCallback(() => {
    rollbackFile(file.path);
    onClose();
  }, [file, rollbackFile, onClose]);

  const handleShelve = useCallback(() => {
    // If multiple files are highlighted, shelve all of them; otherwise just this file
    const fileKey = `${file.path}:${file.staged}`;
    if (highlightedFiles.size > 1 && highlightedFiles.has(fileKey)) {
      // Shelve all highlighted files
      const paths = changes
        .filter((f) => highlightedFiles.has(`${f.path}:${f.staged}`))
        .map((f) => f.path);
      shelveChanges(t("Shelved changes"), [...new Set(paths)]);
    } else {
      // Shelve only this file
      shelveChanges(t("Shelved changes"), [file.path]);
    }
    onClose();
  }, [file, shelveChanges, highlightedFiles, changes, onClose]);

  const handleDelete = useCallback(() => {
    const fileKey = `${file.path}:${file.staged}`;
    if (highlightedFiles.size > 1 && highlightedFiles.has(fileKey)) {
      const paths = changes
        .filter((f) => highlightedFiles.has(`${f.path}:${f.staged}`))
        .map((f) => f.path);
      import("../../shared/bridge").then(({ bridge }) => {
        bridge.request("deleteFiles", { filePaths: [...new Set(paths)] });
      });
    } else {
      import("../../shared/bridge").then(({ bridge }) => {
        bridge.request("deleteFiles", { filePaths: [file.path] });
      });
    }
    onClose();
  }, [file, highlightedFiles, changes, onClose]);

  const handleJumpToSource = useCallback(() => {
    import("../../shared/bridge").then(({ bridge }) => {
      bridge.request("openFile", { filePath: file.path });
    });
    onClose();
  }, [file, onClose]);

  const handleOpenInSystemFolder = useCallback(() => {
    import("../../shared/bridge").then(({ bridge }) => {
      bridge.request("revealInSystemExplorer", { filePath: file.path });
    });
    onClose();
  }, [file, onClose]);

  return (
    <div className="commit-context-menu" ref={menuRef} style={style}>
      {/* Show Diff */}
      <button
        type="button"
        className="commit-context-menu-item"
        onClick={handleShowDiff}
      >
        <DiffIcon />
        <span>{t("Show Diff")}</span>
        <span className="commit-context-menu-shortcut">⌘D</span>
      </button>

      {/* Jump to Source */}
      <button
        type="button"
        className="commit-context-menu-item"
        onClick={handleJumpToSource}
      >
        <JumpIcon />
        <span>{t("Jump to Source")}</span>
      </button>

      {/* Open in System Folder */}
      <button
        type="button"
        className="commit-context-menu-item"
        onClick={handleOpenInSystemFolder}
      >
        <FolderOpenIcon />
        <span>{t("Open in System Folder")}</span>
      </button>

      <div className="commit-context-menu-separator" />

      {/* Stage / Unstage */}
      {file.staged ? (
        <button
          type="button"
          className="commit-context-menu-item"
          onClick={handleUnstage}
        >
          <RemoveIcon />
          <span>{t("Unstage")}</span>
        </button>
      ) : (
        <button
          type="button"
          className="commit-context-menu-item"
          onClick={handleStage}
        >
          <AddIcon />
          <span>{t("Add to VCS")}</span>
          <span className="commit-context-menu-shortcut">⌥⌘A</span>
        </button>
      )}

      {/* Rollback */}
      <button
        type="button"
        className="commit-context-menu-item"
        onClick={handleRollback}
      >
        <RollbackIcon />
        <span>{t("Rollback...")}</span>
        <span className="commit-context-menu-shortcut">⌥⌘Z</span>
      </button>

      <div className="commit-context-menu-separator" />

      {/* Shelve */}
      <button
        type="button"
        className="commit-context-menu-item"
        onClick={handleShelve}
      >
        <ShelveIcon />
        <span>{t("Shelve Changes...")}</span>
      </button>

      <div className="commit-context-menu-separator" />

      {/* Delete */}
      <button
        type="button"
        className="commit-context-menu-item"
        onClick={handleDelete}
      >
        <DeleteIcon />
        <span>{t("Delete...")}</span>
        <span className="commit-context-menu-shortcut">⌫</span>
      </button>
    </div>
  );
}

/* ─── Icons ──────────────────────────────────────────────────────── */

function DiffIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="commit-context-menu-icon"
    >
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

function JumpIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="commit-context-menu-icon"
    >
      <path
        d="M8.5 1.5V11M8.5 1.5L5 5M8.5 1.5L12 5M2 14.5h13"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AddIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="commit-context-menu-icon"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7.5 1C7.77614 1 8 1.22386 8 1.5V7H13.5C13.7761 7 14 7.22386 14 7.5C14 7.77614 13.7761 8 13.5 8H8V13.5C8 13.7761 7.77614 14 7.5 14C7.22386 14 7 13.7761 7 13.5V8H1.5C1.22386 8 1 7.77614 1 7.5C1 7.22386 1.22386 7 1.5 7H7V1.5C7 1.22386 7.22386 1 7.5 1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="commit-context-menu-icon"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M1 7.5C1 7.77614 1.22386 8 1.5 8L13.5 8C13.7761 8 14 7.77614 14 7.5C14 7.22386 13.7761 7 13.5 7L1.5 7C1.22386 7 1 7.22386 1 7.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function RollbackIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="commit-context-menu-icon"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.85363 1.85355C6.04889 1.65829 6.04889 1.34171 5.85363 1.14645C5.65837 0.951184 5.34178 0.951184 5.14652 1.14645L1.64652 4.64645L1.29297 5L1.64652 5.35355L5.14652 8.85355C5.34178 9.04882 5.65837 9.04882 5.85363 8.85355C6.04889 8.65829 6.04889 8.34171 5.85363 8.14645L3.20718 5.5H10.5001C12.4331 5.5 14.0001 7.067 14.0001 9C14.0001 10.933 12.4331 12.5 10.5001 12.5H5.50008C5.22393 12.5 5.00008 12.7239 5.00008 13C5.00008 13.2761 5.22393 13.5 5.50008 13.5H10.5001C12.9854 13.5 15.0001 11.4853 15.0001 9C15.0001 6.51472 12.9854 4.5 10.5001 4.5H3.20718L5.85363 1.85355Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ShelveIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="commit-context-menu-icon"
    >
      <path
        d="M4.64645 5.14645C4.45118 5.34171 4.45118 5.65829 4.64645 5.85355L7.64645 8.85355C7.84171 9.04882 8.15829 9.04882 8.35355 8.85355L11.3536 5.85355C11.5488 5.65829 11.5488 5.34171 11.3536 5.14645C11.1583 4.95118 10.8417 4.95118 10.6464 5.14645L8.5 7.29289V1.5C8.5 1.22386 8.27614 1 8 1C7.72386 1 7.5 1.22386 7.5 1.5V7.29289L5.35355 5.14645C5.15829 4.95118 4.84171 4.95118 4.64645 5.14645Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.77639 8.55279L5.5 10H10.5L11.2236 8.55279C11.393 8.214 11.7393 8 12.118 8H14C14.5523 8 15 8.44772 15 9V13C15 13.5523 14.5523 14 14 14H2C1.44772 14 1 13.5523 1 13V9C1 8.44772 1.44772 8 2 8H3.88197C4.26074 8 4.607 8.214 4.77639 8.55279ZM3.88197 9L4.88197 11H11.118L12.118 9H14V13H2V9H3.88197Z"
        fill="currentColor"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="commit-context-menu-icon"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M7 2H9C9.55228 2 10 2.44772 10 3H6C6 2.44772 6.44772 2 7 2ZM5 3C5 1.89543 5.89543 1 7 1H9C10.1046 1 11 1.89543 11 3H13C13.5523 3 14 3.44772 14 4V5V6H13V13C13 14.1046 12.1046 15 11 15H5C3.89543 15 3 14.1046 3 13V6H2V5V4C2 3.44772 2.44772 3 3 3H5ZM11 4H10H6H5H3V5H4H12H13V4H11ZM4 6H12V13C12 13.5523 11.5523 14 11 14H5C4.44772 14 4 13.5523 4 13V6ZM6.5 7C6.22386 7 6 7.22386 6 7.5V11.5C6 11.7761 6.22386 12 6.5 12C6.77614 12 7 11.7761 7 11.5V7.5C7 7.22386 6.77614 7 6.5 7ZM9 7.5C9 7.22386 9.22386 7 9.5 7C9.77614 7 10 7.22386 10 7.5V11.5C10 11.7761 9.77614 12 9.5 12C9.22386 12 9 11.7761 9 11.5V7.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function FolderOpenIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="commit-context-menu-icon"
    >
      <path
        d="M1.5 3.5C1.5 2.95 1.95 2.5 2.5 2.5H5.5L7 4H13.5C14.05 4 14.5 4.45 14.5 5V12.5C14.5 13.05 14.05 13.5 13.5 13.5H2.5C1.95 13.5 1.5 13.05 1.5 12.5V3.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
