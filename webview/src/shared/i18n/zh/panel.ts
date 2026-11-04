/**
 * Git Log panel strings. Keyed by English source text.
 */
export const zhPanel: Record<string, string> = {
  "Loading...": "加载中…",
  "Show Branches": "显示分支",
  "Hide Details": "隐藏详细信息",
  "Show Details": "显示详细信息",

  // Toolbar / filters
  "Search commits...": "搜索提交…",
  Branch: "分支",
  User: "用户",
  Date: "日期",
  "Select branch...": "选择分支…",
  "All branches": "全部分支",
  "Select user...": "选择用户…",
  "All users": "所有用户",
  "Select date range...": "选择日期范围…",
  "All time": "全部时间",
  Today: "今天",
  "Last 7 days": "最近 7 天",
  "Last 30 days": "最近 30 天",
  "Last 90 days": "最近 90 天",
  "View Options": "视图选项",
  "History:": "历史：",
  "No matches": "无匹配项",
  Columns: "列",
  Author: "作者",
  Hash: "哈希",

  // Branch sidebar
  "Hide Branches": "隐藏分支",
  "New Branch": "新建分支",
  "Update Selected": "更新所选分支",
  "Delete Branch": "删除分支",
  "Compare with Current": "与当前分支比较",
  "Show My Branches": "显示我的分支",
  Fetch: "抓取",
  "Mark/Unmark As Favorite": "标记/取消标记为收藏",
  "Navigate Log to Selected Branch Head": "将日志定位到所选分支头",
  "Flatten List": "平铺列表",
  "Group By Directory": "按目录分组",
  "Expand All": "全部展开",
  "Collapse All": "全部折叠",
  Settings: "设置",
  "On Single Click": "单击时",
  "Update Branch Filter": "更新分支筛选",
  "Navigate Log to Branch Head": "将日志定位到分支头",
  "✓ Show Tags": "✓ 显示标签",

  // Branch tree
  "Branch or tag": "分支或标签",
  "Current Branch: {branch}": "当前分支：{branch}",
  Local: "本地",
  Remote: "远程",
  Tags: "标签",
  "Create Branch from '{startPoint}'": "从“{startPoint}”创建分支",
  "Create Branch from {hash}": "从 {hash} 创建分支",
  "Branch Name:": "分支名称：",
  "Checkout branch": "检出分支",
  "Overwrite existing branch": "覆盖现有分支",
  Create: "创建",
  Cancel: "取消",
  "Branch '{branch}' already exists.\nChange the name or overwrite existing branch.":
    "分支“{branch}”已存在。\n请更改名称或覆盖现有分支。",

  // Branch context menu
  Checkout: "检出",
  "New Branch from '{branch}'...": "从“{branch}”新建分支…",
  "Checkout and Rebase onto '{branch}'": "检出并变基到“{branch}”",
  "Rebase '{branch}' onto '{onto}'?": "将“{branch}”变基到“{onto}”？",
  "Merge '{source}' into '{target}'?": "将“{source}”合并到“{target}”？",
  "Rename...": "重命名…",
  Delete: "删除",
  Update: "更新",
  "Push...": "推送...",
  "Delete branch '{branch}'?": "删除分支“{branch}”？",
  "Branch '{branch}' is not fully merged. Force delete?":
    "分支“{branch}”尚未完全合并。是否强制删除？",
  "Force Delete": "强制删除",
  "Rename branch '{branch}' to:": "将分支“{branch}”重命名为：",
  Merge: "合并",
  Rebase: "变基",

  // Push dialog
  "Push Branch": "推送分支",
  "Push branch '{branch}' to remote 'origin'.":
    "将分支“{branch}”推送到远程“origin”。",
  "Force Push": "强制推送",
  Push: "推送",

  // Commit list / header
  Message: "消息",
  "Select a commit to view details": "选择一个提交以查看详细信息",
  "Select a commit to see changed files": "选择一个提交以查看更改的文件",
  "No changes to {file} in this commit": "此提交中 {file} 没有更改",
  "Changed Files": "更改的文件",
  "Tree View": "树形视图",
  "Flat List": "列表视图",

  // Commit context menu
  "Copy Revision Number": "复制修订号",
  "Cherry-Pick": "拣选",
  "Checkout Revision": "检出修订版本",
  "Reset Current Branch to Here (Mixed)...": "将当前分支重置到此处（混合）…",
  "Reset Current Branch to Here (Soft)...": "将当前分支重置到此处（软）…",
  "Reset Current Branch to Here (Hard)...": "将当前分支重置到此处（硬）…",
  "Revert Commit": "还原提交",
  "Drop Commit": "删除提交",
  "New Branch...": "新建分支…",
  "New Tag...": "新建标签…",
  "Show in Git Log": "在 Git 日志中显示",
  Reset: "重置",
  "Reset '{branch}' to {hash} (hard)? This will discard all uncommitted changes.":
    "将“{branch}”重置到 {hash}（硬）？这将丢弃所有未提交的更改。",
  'Drop commit {hash} "{subject}"?\n\nThis will remove the commit from history but keep its changes as unstaged modifications.\n\nThis operation cannot be undone.':
    "删除提交 {hash}“{subject}”？\n\n这将从历史中移除该提交，但将其更改保留为未暂存的修改。\n\n此操作无法撤销。",
  "Create new branch from {hash}:": "从 {hash} 创建新分支：",
  "Create tag at {hash}:": "在 {hash} 处创建标签：",

  // File context menu
  "Show Diff": "显示差异",
  "Edit Source": "编辑源文件",
  "Open Repository Version": "打开仓库版本",
  "Revert Selected Changes": "还原所选更改",
  "Cherry-Pick Selected Changes": "拣选所选更改",
  "Copy Path": "复制路径",
  "Copy File Name": "复制文件名",
  "History Up to Here": "此提交之前的历史",
  Revert: "还原",
  "Revert changes to '{file}' from this commit?":
    "是否还原此提交中对“{file}”的更改？",
  Apply: "应用",
  "Apply changes to '{file}' from this commit to working tree?":
    "是否将此提交中对“{file}”的更改应用到工作树？",
};
