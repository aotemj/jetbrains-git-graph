import { useCallback, useEffect, useRef } from "react";
import { t } from "../../shared/i18n";
import type { ShelveEntry } from "../../shared/store/commit-store";
import { useCommitStore } from "../../shared/store/commit-store";

interface ShelfContextMenuProps {
  x: number;
  y: number;
  entry: ShelveEntry;
  onClose: () => void;
}

export function ShelfContextMenu({
  x,
  y,
  entry,
  onClose,
}: ShelfContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { unshelveChanges, deleteShelve } = useCommitStore();

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
    unshelveChanges(entry.id, true);
    onClose();
  }, [entry, unshelveChanges, onClose]);

  const handleApply = useCallback(() => {
    unshelveChanges(entry.id, false);
    onClose();
  }, [entry, unshelveChanges, onClose]);

  const handleDelete = useCallback(() => {
    deleteShelve(entry.id);
    onClose();
  }, [entry, deleteShelve, onClose]);

  return (
    <div className="commit-context-menu" ref={menuRef} style={style}>
      <button
        type="button"
        className="commit-context-menu-item"
        onClick={handleUnshelve}
      >
        <UnshelveIcon />
        <span>{t("Unshelve...")}</span>
        <span className="commit-context-menu-shortcut">⇧⌘U</span>
      </button>

      <button
        type="button"
        className="commit-context-menu-item"
        onClick={handleApply}
      >
        <ApplyIcon />
        <span>{t("Restore")}</span>
      </button>

      <div className="commit-context-menu-separator" />

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
