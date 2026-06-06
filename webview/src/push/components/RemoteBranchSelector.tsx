import { useEffect, useRef, useState } from "react";

interface RemoteBranchSelectorProps {
  currentRemote: string;
  currentBranch: string;
  onSelect: (remote: string, branch: string) => void;
  onClose: () => void;
}

/**
 * An inline input that lets the user type/edit the target branch name.
 * Typically used when pushing a new branch for the first time.
 */
export function RemoteBranchSelector({
  currentRemote,
  currentBranch,
  onSelect,
  onClose,
}: RemoteBranchSelectorProps) {
  const [value, setValue] = useState(currentBranch);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-focus and select all text on mount
  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      input.focus();
      input.select();
    }
  }, []);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleConfirm = () => {
    const trimmed = value.trim();
    if (trimmed) {
      onSelect(currentRemote, trimmed);
    } else {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div className="remote-branch-selector" ref={containerRef}>
      <div className="remote-branch-selector__input-row">
        <span className="remote-branch-selector__remote-label">
          {currentRemote} :
        </span>
        <input
          ref={inputRef}
          type="text"
          className="remote-branch-selector__input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleConfirm}
          placeholder="branch name"
          spellCheck={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
}
