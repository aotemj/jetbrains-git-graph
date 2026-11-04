/**
 * Commit panel strings. Keyed by English source text.
 */
export const zhCommit: Record<string, string> = {
  // App / banners / tabs
  "Rebasing {branch}": "正在变基 {branch}",
  Rebasing: "正在变基",
  "Continue Rebase (git rebase --continue)": "继续变基 (git rebase --continue)",
  "Abort Rebase (git rebase --abort)": "中止变基 (git rebase --abort)",
  "Cherry-picking {hash}": "正在拣选 {hash}",
  "Cherry-picking": "正在拣选",
  "Continue Cherry-pick (git cherry-pick --continue)":
    "继续拣选 (git cherry-pick --continue)",
  "Skip Cherry-pick (git cherry-pick --skip)":
    "跳过拣选 (git cherry-pick --skip)",
  "Abort Cherry-pick (git cherry-pick --abort)":
    "中止拣选 (git cherry-pick --abort)",
  Merging: "正在合并",
  "Merging {branch}": "正在合并 {branch}",
  "Resolve Conflicts": "解决冲突",
  "Abort Merge (git merge --abort)": "中止合并 (git merge --abort)",
  Commit: "提交",
  Shelf: "搁置",
  Stash: "贮藏",

  // Toolbar / view options
  Refresh: "刷新",
  Rollback: "回滚",
  "Shelve Changes": "搁置更改",
  "Show Diff": "显示差异",
  Pull: "拉取",
  "Push...": "推送...",
  "View Options": "视图选项",
  "Expand All": "全部展开",
  "Collapse All": "全部折叠",
  "Group By": "分组依据",
  Directory: "目录",
  Show: "显示",
  "Unversioned Files": "未版本控制文件",

  // File groups
  "Shelved changes": "搁置的更改",
  "Merge Conflicts": "合并冲突",
  Resolve: "解决",
  Changes: "更改",
  Staged: "已暂存",
  "No changes detected": "未检测到更改",
  "{count} file": "{count} 个文件",
  "{count} files": "{count} 个文件",

  // Context menus
  "Rollback...": "回滚...",
  "Open in System Folder": "在系统文件夹中打开",
  'Delete "{name}"...': "删除“{name}”...",
  "Jump to Source": "跳转到源",
  Unstage: "取消暂存",
  "Add to VCS": "添加到 VCS",
  "Shelve Changes...": "搁置更改...",
  "Delete...": "删除...",

  // Commit message area
  "Commit message (Ctrl+Enter to commit)": "提交信息（Ctrl+Enter 提交）",
  Amend: "修改提交",
  "Recent commit messages": "最近的提交信息",
  "Commit and Push...": "提交并推送...",
  "Commit and Push": "提交并推送",
  Cancel: "取消",
  "No recent commit messages": "无最近的提交信息",

  // Shelf / stash list
  "No shelved changes": "无搁置的更改",
  "Use the shelf icon in the Commit tab toolbar to shelve changes for later.":
    "使用“提交”选项卡工具栏中的搁置图标将更改搁置以便稍后处理。",
  "Use the shelf icon in the Commit tab toolbar to shelve changes to .idea/shelf/ (IDEA-compatible format).":
    "使用“提交”选项卡工具栏中的搁置图标将更改搁置到 .idea/shelf/（IDEA 兼容格式）。",
  "{count} file, {date}": "{count} 个文件，{date}",
  "{count} files, {date}": "{count} 个文件，{date}",
  "just now": "刚刚",
  "{hours}h ago": "{hours} 小时前",
  "{days}d ago": "{days} 天前",

  // Shelf context menus
  "Unshelve...": "取消搁置...",
  Restore: "恢复",
  "Unshelve This File": "取消搁置此文件",
  "Copy Path": "复制路径",
  "Import Patches...": "导入补丁...",
  "Import Patches from Clipboard": "从剪贴板导入补丁",
  "Create Patch...": "创建补丁...",
  "Copy as Patch to Clipboard": "将补丁复制到剪贴板",
};
