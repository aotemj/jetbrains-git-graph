/**
 * Push panel strings. Keyed by English source text.
 */
export const zhPush: Record<string, string> = {
  // Header / branch selector
  Remote: "远程",
  Branch: "分支",
  "branch name": "分支名称",
  "No remotes found": "未找到远程",

  // Commit list
  "No commits to push": "没有要推送的提交",
  "No commits selected": "未选择提交",
  "{count} file": "{count} 个文件",
  "{count} files": "{count} 个文件",
  "Tree View": "树形视图",
  "Flat List": "列表视图",

  // Actions
  Push: "推送",
  "Pushing...": "正在推送…",
  "Force Push": "强制推送",

  // Push rejected dialog
  "Push Rejected": "推送被拒绝",
  'Push of the current branch "{branch}" was rejected. Remote changes need to be merged before pushing.':
    "当前分支“{branch}”的推送被拒绝。需要先合并远程更改才能推送。",
  Rebase: "变基",
  Merge: "合并",

  // Notifications
  "Pushed {count} commit to {remote}/{branch}":
    "已将 {count} 个提交推送到 {remote}/{branch}",
  "Pushed {count} commits to {remote}/{branch}":
    "已将 {count} 个提交推送到 {remote}/{branch}",
  "Rebased and pushed to {remote}/{branch}": "已变基并推送到 {remote}/{branch}",
  "Merged and pushed to {remote}/{branch}": "已合并并推送到 {remote}/{branch}",
};
