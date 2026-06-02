import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Tooltip } from "../../shared/components/Tooltip";
import "../../shared/components/Tooltip.css";
import { usePanelStore } from "../../shared/store/panel-store";

export function Toolbar() {
  const setFilter = usePanelStore((s) => s.setFilter);
  const filter = usePanelStore((s) => s.filter);
  const commits = usePanelStore((s) => s.commits);
  const branches = usePanelStore((s) => s.branches);
  const currentBranch = usePanelStore((s) => s.currentBranch);
  const visibleColumns = usePanelStore((s) => s.visibleColumns);
  const toggleColumnVisibility = usePanelStore((s) => s.toggleColumnVisibility);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const historyBranch = filter.branch || currentBranch;

  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [showViewOptions, setShowViewOptions] = useState(false);

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
          onClear={handleClearBranch}
        />
        {showBranchDropdown && (
          <SearchableDropdown
            items={branchNames}
            activeItem={filter.branch}
            placeholder="Select branch..."
            onSelect={handleSelectBranch}
            onClear={filter.branch ? handleClearBranch : undefined}
            clearLabel="All branches"
            onClose={() => setShowBranchDropdown(false)}
          />
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
          onClear={handleClearAuthor}
        />
        {showUserDropdown && (
          <SearchableDropdown
            items={authors}
            activeItem={filter.author}
            placeholder="Select user..."
            onSelect={handleSelectAuthor}
            onClear={filter.author ? handleClearAuthor : undefined}
            clearLabel="All users"
            onClose={() => setShowUserDropdown(false)}
          />
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
          onClear={handleClearDate}
        />
        {showDateDropdown && (
          <SearchableDropdown
            items={["today", "7days", "30days", "90days"]}
            activeItem={filter.dateRange}
            placeholder="Select date range..."
            onSelect={handleSelectDate}
            onClear={filter.dateRange ? handleClearDate : undefined}
            clearLabel="All time"
            onClose={() => setShowDateDropdown(false)}
            labelMap={dateLabels}
          />
        )}
      </div>

      {/* View Options (eye icon) — pushed to far right */}
      <div style={{ flex: 1 }} />
      <div style={{ position: "relative" }}>
        <Tooltip text="View Options">
          <button
            type="button"
            onClick={() => {
              setShowViewOptions(!showViewOptions);
              setShowUserDropdown(false);
              setShowDateDropdown(false);
              setShowBranchDropdown(false);
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 24,
              height: 24,
              border: "none",
              borderRadius: 4,
              background: showViewOptions
                ? "var(--vscode-toolbar-activeBackground, rgba(90,93,94,0.31))"
                : "transparent",
              color: "var(--app-fg)",
              cursor: "pointer",
              opacity: 0.6,
              padding: 0,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "1";
              if (!showViewOptions) {
                (e.currentTarget as HTMLElement).style.background =
                  "var(--vscode-toolbar-hoverBackground, rgba(90,93,94,0.2))";
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "0.6";
              if (!showViewOptions) {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
              }
            }}
          >
            <ViewOptionsIcon />
          </button>
        </Tooltip>
        {showViewOptions && (
          <ViewOptionsDropdown
            visibleColumns={visibleColumns}
            onToggle={toggleColumnVisibility}
            onClose={() => setShowViewOptions(false)}
          />
        )}
      </div>

      {/* File history tab */}
      {filter.file && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: "2px 8px 2px 10px",
            fontSize: "12px",
            borderRadius: 3,
            background: "var(--vscode-tab-activeBackground, #1e1e1e)",
            border: "1px solid var(--vscode-tab-border, #444)",
            color: "var(--vscode-tab-activeForeground, inherit)",
            whiteSpace: "nowrap",
            userSelect: "none",
          }}
        >
          <span style={{ opacity: 0.6 }}>History:</span>
          <span style={{ fontWeight: 500 }}>
            {filter.file.split("/").pop()}
          </span>
          <div
            onClick={() => setFilter({ file: "" })}
            style={{
              display: "flex",
              alignItems: "center",
              cursor: "pointer",
              opacity: 0.5,
              marginLeft: 2,
              padding: 1,
              borderRadius: 3,
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = "0.5";
            }}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z" />
            </svg>
          </div>
        </div>
      )}
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    onChange(e);
  };

  const handleClear = () => {
    setValue("");
    if (inputRef.current) {
      // Trigger onChange with empty value
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      nativeInputValueSetter?.call(inputRef.current, "");
      inputRef.current.dispatchEvent(new Event("input", { bubbles: true }));
    }
  };

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        width: 180,
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
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        defaultValue={defaultValue}
        onChange={handleChange}
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
      {value && (
        <div
          onClick={handleClear}
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
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z" />
          </svg>
        </div>
      )}
    </div>
  );
}

function FilterButton({
  label,
  active,
  activeValue,
  onClick,
  onClear,
}: {
  label: string;
  active: boolean;
  activeValue?: string;
  onClick: () => void;
  onClear?: () => void;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 2,
        padding: "2px 8px",
        fontSize: "12px",
        cursor: "pointer",
        borderRadius: 3,
        border: "1px solid transparent",
        color: active
          ? "var(--vscode-textLink-foreground, #3794ff)"
          : "var(--description-fg)",
        whiteSpace: "nowrap",
        userSelect: "none",
      }}
    >
      <span onClick={onClick}>
        {active && activeValue ? (
          `${label}: ${activeValue}`
        ) : (
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 2 }}
          >
            {label}
            <svg
              width="10"
              height="10"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ opacity: 0.7 }}
            >
              <polyline points="4,6 8,10 12,6" />
            </svg>
          </span>
        )}
      </span>
      {active && onClear && (
        <div
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          style={{
            display: "flex",
            alignItems: "center",
            marginLeft: 2,
            opacity: 0.6,
            borderRadius: 3,
            padding: 1,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = "1";
            (e.currentTarget as HTMLElement).style.background =
              "var(--vscode-toolbar-hoverBackground, rgba(90,93,94,0.31))";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.opacity = "0.6";
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 8.707l3.646 3.647.708-.707L8.707 8l3.647-3.646-.707-.708L8 7.293 4.354 3.646l-.707.708L7.293 8l-3.646 3.646.707.708L8 8.707z" />
          </svg>
        </div>
      )}
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
          ? "var(--vscode-menu-selectionForeground, #333)"
          : "var(--vscode-menu-foreground, #ccc)",
        background: active
          ? "var(--vscode-menu-selectionBackground, #e8f0fe)"
          : "transparent",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background =
            "var(--vscode-menu-selectionBackground, #e8f0fe)";
          (e.currentTarget as HTMLElement).style.color =
            "var(--vscode-menu-selectionForeground, #333)";
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

// ---------------------------------------------------------------------------
// SearchableDropdown — dropdown with search input for filtering items
// ---------------------------------------------------------------------------

function SearchableDropdown({
  items,
  activeItem,
  placeholder,
  onSelect,
  onClear,
  clearLabel,
  onClose,
  labelMap,
}: {
  items: string[];
  activeItem: string;
  placeholder: string;
  onSelect: (item: string) => void;
  onClear?: () => void;
  clearLabel?: string;
  onClose: () => void;
  labelMap?: Record<string, string>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleScroll = (e: Event) => {
      if (
        ref.current &&
        e.target instanceof Node &&
        !ref.current.contains(e.target)
      ) {
        onClose();
      }
    };
    const handleBlur = () => onClose();
    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("scroll", handleScroll, true);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown, true);
      document.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("blur", handleBlur);
    };
  }, [onClose]);

  const filtered = query
    ? items.filter((item) => {
        const display = labelMap?.[item] ?? item;
        return display.toLowerCase().includes(query.toLowerCase());
      })
    : items;

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        marginTop: 4,
        zIndex: 9999,
        background: "var(--vscode-menu-background, #fff)",
        border: "1px solid var(--vscode-menu-border, #e0e0e0)",
        borderRadius: 4,
        padding: "4px 0",
        minWidth: 200,
        maxHeight: 280,
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 3px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ padding: "4px 8px" }}>
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
          }}
          style={{
            width: "100%",
            padding: "4px 8px",
            fontSize: "12px",
            border: "1px solid var(--vscode-input-border, #c4c4c4)",
            background: "var(--vscode-input-background, #fff)",
            color: "var(--vscode-input-foreground, #333)",
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
        />
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {onClear && clearLabel && (
          <DropdownItem label={clearLabel} active={false} onClick={onClear} />
        )}
        {filtered.map((item) => (
          <DropdownItem
            key={item}
            label={labelMap?.[item] ?? item}
            active={item === activeItem}
            onClick={() => onSelect(item)}
          />
        ))}
        {filtered.length === 0 && (
          <div
            style={{
              padding: "8px 12px",
              fontSize: "12px",
              opacity: 0.5,
            }}
          >
            No matches
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ViewOptionsIcon — eye icon with small triangle (JetBrains show.svg style)
// ---------------------------------------------------------------------------

function ViewOptionsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M8 4C4.5 4 2 8 2 8C2 8 4.5 12 8 12C11.5 12 14 8 14 8C14 8 11.5 4 8 4Z"
        stroke="currentColor"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="2" stroke="currentColor" />
      <path d="M9 12L10 14H8L9 12Z" fill="currentColor" opacity="0.6" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// ViewOptionsDropdown — column visibility menu from the eye icon
// ---------------------------------------------------------------------------

function ViewOptionsDropdown({
  visibleColumns,
  onToggle,
  onClose,
}: {
  visibleColumns: { author: boolean; date: boolean; hash: boolean };
  onToggle: (col: "author" | "date" | "hash") => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick, true);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick, true);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const columns: { key: "author" | "date" | "hash"; label: string }[] = [
    { key: "author", label: "Author" },
    { key: "date", label: "Date" },
    { key: "hash", label: "Hash" },
  ];

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: "100%",
        right: 0,
        marginTop: 4,
        zIndex: 9999,
        background: "var(--vscode-menu-background, #fff)",
        border: "1px solid var(--vscode-menu-border, #e0e0e0)",
        borderRadius: 4,
        padding: "4px 0",
        minWidth: 160,
        boxShadow: "0 3px 12px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)",
      }}
    >
      <div
        style={{
          padding: "4px 12px 6px",
          fontSize: "11px",
          fontWeight: 600,
          opacity: 0.6,
        }}
      >
        Columns
      </div>
      {columns.map((col) => (
        <div
          key={col.key}
          onClick={() => onToggle(col.key)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "5px 12px",
            fontSize: "12px",
            cursor: "pointer",
            color: "var(--vscode-menu-foreground, #333)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "var(--vscode-menu-selectionBackground, #e8f0fe)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          <span style={{ width: 16, textAlign: "center", flexShrink: 0 }}>
            {visibleColumns[col.key] ? "✓" : ""}
          </span>
          <span>{col.label}</span>
        </div>
      ))}
    </div>
  );
}
