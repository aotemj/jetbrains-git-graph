import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePanelStore } from "../../shared/store/panel-store";

export function Toolbar() {
  const setFilter = usePanelStore((s) => s.setFilter);
  const filter = usePanelStore((s) => s.filter);
  const commits = usePanelStore((s) => s.commits);
  const branches = usePanelStore((s) => s.branches);
  const currentBranch = usePanelStore((s) => s.currentBranch);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const historyBranch = filter.branch || currentBranch;

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);

  // Collect unique authors from commits
  const authors = useMemo(() => {
    const set = new Set<string>();
    for (const c of commits) {
      if (c.authorName) set.add(c.authorName);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [commits]);

  // Collect branch names for filter
  const branchNames = useMemo(() => {
    return branches
      .map((b) => b.name)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [branches]);

  const handleSearch = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setFilter({ searchQuery: value });
      }, 300);
    },
    [setFilter],
  );

  const handleSelectAuthor = (author: string) => {
    setShowUserDropdown(false);
    setFilter({ author: author === filter.author ? "" : author });
  };

  const handleClearAuthor = () => {
    setShowUserDropdown(false);
    setFilter({ author: "" });
  };

  const handleSelectDate = (range: string) => {
    setShowDateDropdown(false);
    setFilter({ dateRange: range });
  };

  const handleClearDate = () => {
    setShowDateDropdown(false);
    setFilter({ dateRange: "" });
  };

  const handleSelectBranch = (branch: string) => {
    setShowBranchDropdown(false);
    setFilter({ branch: branch === filter.branch ? "" : branch });
  };

  const handleClearBranch = () => {
    setShowBranchDropdown(false);
    setFilter({ branch: "" });
  };

  const dateLabels: Record<string, string> = {
    today: "Today",
    "7days": "Last 7 days",
    "30days": "Last 30 days",
    "90days": "Last 90 days",
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 8px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}
    >
      <SearchInput
        placeholder="Search commits..."
        defaultValue={filter.searchQuery}
        onChange={handleSearch}
      />

      {/* Branch filter */}
      <div style={{ position: "relative" }}>
        <FilterButton
          label="Branch"
          active={!!filter.branch}
          activeValue={historyBranch}
          onClick={() => {
            setShowBranchDropdown(!showBranchDropdown);
            setShowUserDropdown(false);
            setShowDateDropdown(false);
          }}
        />
        {showBranchDropdown && (
          <FilterDropdown onClose={() => setShowBranchDropdown(false)}>
            {filter.branch && (
              <DropdownItem
                label="All branches"
                active={false}
                onClick={handleClearBranch}
              />
            )}
            {branchNames.map((name) => (
              <DropdownItem
                key={name}
                label={name}
                active={name === filter.branch}
                onClick={() => handleSelectBranch(name)}
              />
            ))}
          </FilterDropdown>
        )}
      </div>

      {/* User filter */}
      <div style={{ position: "relative" }}>
        <FilterButton
          label="User"
          active={!!filter.author}
          activeValue={filter.author}
          onClick={() => {
            setShowUserDropdown(!showUserDropdown);
            setShowDateDropdown(false);
            setShowBranchDropdown(false);
          }}
        />
        {showUserDropdown && (
          <FilterDropdown onClose={() => setShowUserDropdown(false)}>
            {filter.author && (
              <DropdownItem
                label="All users"
                active={false}
                onClick={handleClearAuthor}
              />
            )}
            {authors.map((author) => (
              <DropdownItem
                key={author}
                label={author}
                active={author === filter.author}
                onClick={() => handleSelectAuthor(author)}
              />
            ))}
          </FilterDropdown>
        )}
      </div>

      {/* Date filter */}
      <div style={{ position: "relative" }}>
        <FilterButton
          label="Date"
          active={!!filter.dateRange}
          activeValue={
            filter.dateRange ? dateLabels[filter.dateRange] : undefined
          }
          onClick={() => {
            setShowDateDropdown(!showDateDropdown);
            setShowUserDropdown(false);
            setShowBranchDropdown(false);
          }}
        />
        {showDateDropdown && (
          <FilterDropdown onClose={() => setShowDateDropdown(false)}>
            {filter.dateRange && (
              <DropdownItem
                label="All time"
                active={false}
                onClick={handleClearDate}
              />
            )}
            <DropdownItem
              label="Today"
              active={filter.dateRange === "today"}
              onClick={() => handleSelectDate("today")}
            />
            <DropdownItem
              label="Last 7 days"
              active={filter.dateRange === "7days"}
              onClick={() => handleSelectDate("7days")}
            />
            <DropdownItem
              label="Last 30 days"
              active={filter.dateRange === "30days"}
              onClick={() => handleSelectDate("30days")}
            />
            <DropdownItem
              label="Last 90 days"
              active={filter.dateRange === "90days"}
              onClick={() => handleSelectDate("90days")}
            />
          </FilterDropdown>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SearchInput({
  placeholder,
  defaultValue,
  onChange,
}: {
  placeholder: string;
  defaultValue: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type="text"
      placeholder={placeholder}
      defaultValue={defaultValue}
      onChange={onChange}
      style={{
        width: 180,
        padding: "4px 8px",
        fontSize: "12px",
        border: "1px solid var(--vscode-input-border, #3c3c3c)",
        background: "var(--vscode-input-background, #1e1e1e)",
        color: "var(--vscode-input-foreground, #ccc)",
        borderRadius: 3,
        outline: "none",
        boxSizing: "border-box",
      }}
      onFocus={(e) => {
        (e.target as HTMLElement).style.borderColor =
          "var(--vscode-focusBorder, #007fd4)";
      }}
      onBlur={(e) => {
        (e.target as HTMLElement).style.borderColor =
          "var(--vscode-input-border, #3c3c3c)";
      }}
      onMouseEnter={(e) => {
        (e.target as HTMLElement).style.borderColor =
          "var(--vscode-focusBorder, #007fd4)";
      }}
      onMouseLeave={(e) => {
        if (document.activeElement !== e.target) {
          (e.target as HTMLElement).style.borderColor =
            "var(--vscode-input-border, #3c3c3c)";
        }
      }}
    />
  );
}

function FilterButton({
  label,
  active,
  activeValue,
  onClick,
}: {
  label: string;
  active: boolean;
  activeValue?: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "2px 8px",
        fontSize: "12px",
        cursor: "pointer",
        borderRadius: 3,
        border: active
          ? "1px solid var(--vscode-focusBorder, #007fd4)"
          : "1px solid transparent",
        color: active
          ? "var(--vscode-textLink-foreground, #3794ff)"
          : "var(--description-fg)",
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      {active && activeValue ? `${label}: ${activeValue}` : `${label} ▾`}
    </div>
  );
}

function FilterDropdown({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleMouseDown, true);
    return () =>
      document.removeEventListener("mousedown", handleMouseDown, true);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: 4,
        zIndex: 9999,
        background: "var(--vscode-menu-background, #252526)",
        border: "1px solid var(--vscode-menu-border, #454545)",
        borderRadius: 4,
        padding: "4px 0",
        minWidth: 140,
        maxHeight: 200,
        overflowY: "auto",
        boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
      }}
    >
      {children}
    </div>
  );
}

function DropdownItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: "5px 12px",
        fontSize: "12px",
        cursor: "pointer",
        color: active
          ? "var(--vscode-menu-selectionForeground, #fff)"
          : "var(--vscode-menu-foreground, #ccc)",
        background: active
          ? "var(--vscode-menu-selectionBackground, #094771)"
          : "transparent",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background =
            "var(--vscode-menu-selectionBackground, #094771)";
          (e.currentTarget as HTMLElement).style.color =
            "var(--vscode-menu-selectionForeground, #fff)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = "transparent";
          (e.currentTarget as HTMLElement).style.color =
            "var(--vscode-menu-foreground, #ccc)";
        }
      }}
    >
      {label}
    </div>
  );
}
