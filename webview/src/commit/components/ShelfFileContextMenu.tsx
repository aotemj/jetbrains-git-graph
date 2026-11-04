import { useCallback, useEffect, useRef } from "react";
import { bridge } from "../../shared/bridge";
import { t } from "../../shared/i18n";

interface ShelfFileContextMenuProps {
  x: number;
  y: number;
  filePath: string;
  stashId: string;
  onClose: () => void;
}

export function ShelfFileContextMenu({
  x,
  y,
  filePath,
  stashId,
  onClose,
}: ShelfFileContextMenuProps) {
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

  const handleShowDiff = useCallback(() => {
    bridge.request("showShelfFileDiff", { stashId, filePath });
    onClose();
  }, [stashId, filePath, onClose]);

  const handleUnshelveFile = useCallback(() => {
    bridge.request("unshelveFile", { stashId, filePath });
    onClose();
  }, [stashId, filePath, onClose]);

  const handleJumpToSource = useCallback(() => {
    bridge.request("openFile", { filePath });
    onClose();
  }, [filePath, onClose]);

  const handleCopyPath = useCallback(() => {
    bridge.request("copyToClipboard", { text: filePath });
    onClose();
  }, [filePath, onClose]);

  return (
    <div className="commit-context-menu" ref={menuRef} style={style}>
      <button
        type="button"
        className="commit-context-menu-item"
        onClick={handleUnshelveFile}
      >
        <UnshelveIcon />
        <span>{t("Unshelve This File")}</span>
      </button>

      <div className="commit-context-menu-separator" />

      <button
        type="button"
        className="commit-context-menu-item"
        onClick={handleShowDiff}
      >
        <DiffIcon />
        <span>{t("Show Diff")}</span>
        <span className="commit-context-menu-shortcut">⌘D</span>
      </button>

      <button
        type="button"
        className="commit-context-menu-item"
        onClick={handleJumpToSource}
      >
        <JumpIcon />
        <span>{t("Jump to Source")}</span>
      </button>

      <div className="commit-context-menu-separator" />

      <button
        type="button"
        className="commit-context-menu-item"
        onClick={handleCopyPath}
      >
        <CopyIcon />
        <span>{t("Copy Path")}</span>
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
