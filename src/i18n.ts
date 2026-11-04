import * as vscode from "vscode";

export type Locale = "en" | "zh-cn";

/**
 * Extension-host strings, keyed by their English source text.
 */
const zhCN: Record<string, string> = {
  "You have unsaved merge changes. Discard them?":
    "你有未保存的合并更改，确定要丢弃吗？",
  "Show My Branches: filter applied in branch tree":
    "显示我的分支：已在分支树中应用筛选",
  "Open IDEA Git Graph Panel": "打开 IDEA Git 图谱面板",
  'Rollback changes to "{file}"? This cannot be undone.':
    "要回滚对“{file}”的更改吗？此操作无法撤销。",
  "Rollback changes to {count} file(s)? This cannot be undone.":
    "要回滚 {count} 个文件的更改吗？此操作无法撤销。",
  'Delete "{file}"? This cannot be undone.':
    "要删除“{file}”吗？此操作无法撤销。",
  "Delete {count} files? This cannot be undone.":
    "要删除 {count} 个文件吗？此操作无法撤销。",
  'Delete shelved changes "{stash}"? This cannot be undone.':
    "要删除搁置的更改“{stash}”吗？此操作无法撤销。",
  'Delete shelf "{shelf}"? This cannot be undone.':
    "要删除搁置架“{shelf}”吗？此操作无法撤销。",
  'Delete branch "{branch}"?': "要删除分支“{branch}”吗？",
  "Failed to unshelve file: {message}": "取消搁置文件失败：{message}",
  'Could not show diff for "{file}": {message}':
    "无法显示“{file}”的差异：{message}",
  "Patch saved to {path}": "补丁已保存到 {path}",
  "Failed to create patch: {message}": "创建补丁失败：{message}",
  "Patch copied to clipboard": "补丁已复制到剪贴板",
  "Failed to copy patch: {message}": "复制补丁失败：{message}",
  "Imported {count} patch(es)": "已导入 {count} 个补丁",
  "Failed to import patches: {message}": "导入补丁失败：{message}",
  "Clipboard is empty or does not contain patch content.":
    "剪贴板为空或内容不是补丁。",
  "Clipboard content does not appear to be a valid patch.":
    "剪贴板内容似乎不是有效的补丁。",
  "Imported patch from clipboard as shelf entry.":
    "已从剪贴板导入补丁并创建搁置架条目。",
  "Failed to import patch from clipboard: {message}":
    "从剪贴板导入补丁失败：{message}",
  "Toggled favorite: {branch}": "已切换收藏：{branch}",
  "Invalid commit hash": "无效的提交哈希",
  "Merge commits cannot be dropped": "不能摘除合并提交",
  "No current branch": "没有当前分支",
  "Operation timed out": "操作超时",
  // Shared dialog labels
  Discard: "丢弃",
  Rollback: "回滚",
  Delete: "删除",
  "Patch files": "补丁文件",
  "All files": "所有文件",
  "Save Patch File": "保存补丁文件",
  "Import Patch Files": "导入补丁文件",
  // Commands / notifications
  "JetGit: No diff file list. Double-click a file in Changed Files first.":
    "JetGit：没有差异文件列表，请先在“更改的文件”中双击一个文件。",
  "JetGit: No workspace open.": "JetGit：没有打开的工作区。",
  "Unable to locate conflict file from SCM item.":
    "无法从源代码管理项中定位冲突文件。",
  "Source file does not exist in the working directory.":
    "源文件在工作目录中不存在。",
  "JetGit language changed. Reload the window to apply it everywhere.":
    "JetGit 语言已更改，重新加载窗口以使其全面生效。",
  "Reload Window": "重新加载窗口",
  OK: "确定",
  "Cannot drop the initial commit (no parent)":
    "无法摘除初始提交（没有父提交）",
  "No changes to shelve": "没有可搁置的更改",
  Conflicts: "冲突",
  "Push Commits to {branch}": "推送提交到 {branch}",
  "Merge: {file}": "合并：{file}",
  "Rollback Changes": "回滚更改",
};

const dictionaries: Record<Exclude<Locale, "en">, Record<string, string>> = {
  "zh-cn": zhCN,
};

function normalize(value: string | undefined | null): Locale {
  const v = (value ?? "").toLowerCase().replace("_", "-");
  return v === "zh" || v.startsWith("zh-") ? "zh-cn" : "en";
}

/**
 * Locale used by the extension host and injected into every webview.
 *
 * `jetgit.language` can force `en` / `zh-cn`; the default `auto` follows the
 * VS Code display language.
 */
export function getLocale(): Locale {
  const configured = vscode.workspace
    .getConfiguration("jetgit")
    .get<string>("language", "auto");
  if (configured === "en" || configured === "zh-cn") return configured;
  return normalize(vscode.env.language);
}

export function t(key: string, vars?: Record<string, string | number>): string {
  const locale = getLocale();
  let text = locale === "en" ? key : (dictionaries[locale][key] ?? key);
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.split(`{${name}}`).join(String(value));
    }
  }
  return text;
}
