import type { WorkingTreeFile } from "../../shared/store/commit-store";
import { getCommitFileIcon } from "../utils/file-icon";

export interface FileItemProps {
  file: WorkingTreeFile;
  selected: boolean;
  highlighted: boolean;
  onToggle: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onShowDiff: () => void;
  onClick: (e: React.MouseEvent) => void;
}

export function FileItem({
  file,
  selected,
  highlighted,
  onToggle,
  onContextMenu,
  onShowDiff,
  onClick,
}: FileItemProps) {
  const parts = file.path.split("/");
  const fileName = parts.pop() || parts.pop() || file.path;
  const dirPath = parts.length > 0 ? parts.join("/") : "";

  const statusLabel = getStatusLabel(file.status);
  const statusColor = getStatusColor(file.status);
  const FileIcon = getCommitFileIcon(file.path);

  return (
    <div
      className={`commit-file-item ${highlighted ? "highlighted" : ""}`}
      onDoubleClick={onShowDiff}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onContextMenu(e);
      }}
    >
      <input
        type="checkbox"
        className="commit-file-checkbox"
        checked={selected}
        onChange={onToggle}
      />
      <span className="commit-file-icon">
        <FileIcon style={{ width: 16, height: 16 }} />
      </span>
      <span
        className="commit-file-name"
        title={file.path}
        style={{ color: statusColor }}
      >
        {fileName}
      </span>
      {dirPath && (
        <span className="commit-file-path" title={dirPath}>
          {dirPath}
        </span>
      )}
      <span className="commit-file-status" style={{ color: statusColor }}>
        {statusLabel}
      </span>
    </div>
  );
}

function getStatusLabel(status: WorkingTreeFile["status"]): string {
  switch (status) {
    case "added":
      return "A";
    case "modified":
      return "M";
    case "deleted":
      return "D";
    case "renamed":
      return "R";
    case "untracked":
      return "U";
    case "conflicted":
      return "C";
    default:
      return "?";
  }
}

function getStatusColor(status: WorkingTreeFile["status"]): string {
  switch (status) {
    case "added":
      return "var(--vscode-gitDecoration-addedResourceForeground, #587c0c)";
    case "untracked":
      return "var(--vscode-gitDecoration-untrackedResourceForeground, #d91a29)";
    case "modified":
      return "var(--vscode-gitDecoration-modifiedResourceForeground, #3b8eea)";
    case "deleted":
      return "var(--vscode-gitDecoration-deletedResourceForeground, #a0a0a0)";
    case "renamed":
      return "var(--vscode-gitDecoration-submoduleResourceForeground, #c09553)";
    case "conflicted":
      return "var(--vscode-gitDecoration-conflictingResourceForeground, #d91a29)";
    default:
      return "inherit";
  }
}
