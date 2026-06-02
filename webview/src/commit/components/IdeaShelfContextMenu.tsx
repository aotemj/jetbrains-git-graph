import { useCallback, useEffect, useRef } from "react";
import type { IdeaShelfEntry } from "../../shared/store/commit-store";
import { useCommitStore } from "../../shared/store/commit-store";

interface IdeaShelfContextMenuProps {
  x: number;
  y: number;
  entry: IdeaShelfEntry;
  onClose: () => void;
}

export function IdeaShelfContextMenu({
  x,
  y,
  entry,
  onClose,
}: IdeaShelfContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { ideaUnshelveChanges, deleteIdeaShelf } = useCommitStore();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
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
  }, [onClose]);

  const style: React.CSSProperties = {
    position: "fixed",
    left: x,
    top: y,
    zIndex: 1000,
  };

  const handleUnshelve = useCallback(() => {
    ideaUnshelveChanges(entry.name, true);
    onClose();
  }, [entry, ideaUnshelveChanges, onClose]);

  const handleApply = useCallback(() => {
    ideaUnshelveChanges(entry.name, false);
    onClose();
  }, [entry, ideaUnshelveChanges, onClose]);

  const handleCreatePatch = useCallback(() => {
    import("../../shared/bridge").then(({ bridge }) => {
      bridge.request("createPatchFromShelf", { shelfName: entry.name });
    });
    onClose();
  }, [entry, onClose]);

  const handleCopyPatch = useCallback(() => {
    import("../../shared/bridge").then(({ bridge }) => {
      bridge.request("copyShelfPatchToClipboard", { shelfName: entry.name });
    });
    onClose();
  }, [entry, onClose]);

  const handleImportPatches = useCallback(() => {
    import("../../shared/bridge").then(({ bridge }) => {
      bridge.request("importPatches");
    });
    onClose();
  }, [onClose]);

  const handleImportFromClipboard = useCallback(() => {
    import("../../shared/bridge").then(({ bridge }) => {
      bridge.request("importPatchFromClipboard");
    });
    onClose();
  }, [onClose]);

  const handleDelete = useCallback(() => {
    deleteIdeaShelf(entry.name);
    onClose();
  }, [entry, deleteIdeaShelf, onClose]);

  return (
    <div className="commit-context-menu" ref={menuRef} style={style}>
      <button
        type="button"
        className="commit-context-menu-item"
        onClick={handleUnshelve}
      >
        <UnshelveIcon />
        <span>Unshelve...</span>
        <span className="commit-context-menu-shortcut">⇧⌘U</span>
      </button>

      <button
        type="button"
        className="commit-context-menu-item"
        onClick={handleApply}
      >
        <ApplyIcon />
        <span>Restore</span>
      </button>

      <div className="commit-context-menu-separator" />

      <button
        type="button"
        className="commit-context-menu-item"
        onClick={handleCreatePatch}
      >
        <PatchIcon />
        <span>Create Patch...</span>
      </button>

      <button
        type="button"
        className="commit-context-menu-item"
        onClick={handleCopyPatch}
      >
        <CopyIcon />
        <span>Copy as Patch to Clipboard</span>
      </button>

      <button
        type="button"
        className="commit-context-menu-item"
        onClick={handleImportPatches}
      >
        <ImportIcon />
        <span>Import Patches...</span>
      </button>

      <button
        type="button"
        className="commit-context-menu-item"
        onClick={handleImportFromClipboard}
      >
        <ClipboardImportIcon />
        <span>Import Patches from Clipboard</span>
      </button>

      <div className="commit-context-menu-separator" />

      <button
        type="button"
        className="commit-context-menu-item"
        onClick={handleDelete}
      >
        <DeleteIcon />
        <span>Delete...</span>
        <span className="commit-context-menu-shortcut">⌫</span>
      </button>
    </div>
  );
}

/* ─── Icons ──────────────────────────────────────────────────────── */

function UnshelveIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="commit-context-menu-icon"
    >
      <path
        d="M11.3536 4.85355C11.5488 4.65829 11.5488 4.34171 11.3536 4.14645L8.35355 1.14645C8.15829 0.951184 7.84171 0.951184 7.64645 1.14645L4.64645 4.14645C4.45118 4.34171 4.45118 4.65829 4.64645 4.85355C4.84171 5.04882 5.15829 5.04882 5.35355 4.85355L7.5 2.70711L7.5 8.5C7.5 8.77614 7.72386 9 8 9C8.27614 9 8.5 8.77614 8.5 8.5V2.70711L10.6464 4.85355C10.8417 5.04882 11.1583 5.04882 11.3536 4.85355Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4.77639 8.55279L5.5 10H10.5L11.2236 8.55279C11.393 8.214 11.7393 8 12.118 8H14C14.5523 8 15 8.44772 15 9V13C15 13.5523 14.5523 14 14 14H2C1.44772 14 1 13.5523 1 13V9C1 8.44772 1.44772 8 2 8H3.88197C4.26074 8 4.607 8.214 4.77639 8.55279ZM4.60557 10.4472C4.77496 10.786 5.12123 11 5.5 11H10.5C10.8788 11 11.225 10.786 11.3944 10.4472L12.118 9H14V13H2V9H3.88197L4.60557 10.4472Z"
        fill="currentColor"
      />
    </svg>
  );
}

function ApplyIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="commit-context-menu-icon"
    >
      <path
        d="M14.431 3.323l-8.47 10-.79-.036-3.35-4.77.818-.574 2.978 4.24 8.051-9.506.763.646z"
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

function PatchIcon() {
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
        d="M7.99998 1C7.72383 1 7.49998 1.22386 7.49998 1.5V5.5H3.5C3.22386 5.5 3 5.72386 3 6C3 6.27614 3.22386 6.5 3.5 6.5H7.49998V10.5C7.49998 10.7761 7.72383 11 7.99998 11C8.27612 11 8.49998 10.7761 8.49998 10.5V6.5H12.5C12.7761 6.5 13 6.27614 13 6C13 5.72386 12.7761 5.5 12.5 5.5H8.49998V1.5C8.49998 1.22386 8.27612 1 7.99998 1Z"
        fill="currentColor"
      />
      <rect
        x="13"
        y="13"
        width="1"
        height="10"
        rx="0.5"
        transform="rotate(90 13 13)"
        fill="currentColor"
      />
    </svg>
  );
}

function CopyIcon() {
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
        d="M4 4H1V15H11V12H4V4Z"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <path d="M5 1H15V11H5V1Z" stroke="currentColor" strokeLinejoin="round" />
      <path
        d="M1 4.5V15H11.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ImportIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="commit-context-menu-icon"
    >
      <path
        d="M8 2V10M8 10L5 7M8 10L11 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M2 12V13.5C2 14.0523 2.44772 14.5 3 14.5H13C13.5523 14.5 14 14.0523 14 13.5V12"
        stroke="currentColor"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ClipboardImportIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="commit-context-menu-icon"
    >
      <path
        d="M5 2H4C3.44772 2 3 2.44772 3 3V13C3 13.5523 3.44772 14 5 14H11C11.5523 14 12 13.5523 12 13V12"
        stroke="currentColor"
        strokeLinecap="round"
      />
      <path
        d="M6 2.5C6 1.67157 6.67157 1 7.5 1H8.5C9.32843 1 10 1.67157 10 2.5V3H6V2.5Z"
        stroke="currentColor"
      />
      <path
        d="M10 7V11M10 11L8 9M10 11L12 9"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
