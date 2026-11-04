/**
 * Conflicts and merge editor strings. Keyed by English source text.
 */
export const zhConflicts: Record<string, string> = {
  // Conflict list
  Conflicts: "冲突",
  Modified: "已修改",
  Name: "名称",
  Yours: "你的",
  Theirs: "他们的",
  "Accept Yours": "接受你的",
  "Accept Theirs": "接受他们的",
  "Merge...": "合并…",
  "Merging branch {from} into {into}": "正在将分支 {from} 合并到 {into}",
  "Merge in progress": "合并进行中",
  "No merge in progress": "没有正在进行的合并",
  "{count} file with conflicts": "有 {count} 个文件存在冲突",
  "{count} files with conflicts": "有 {count} 个文件存在冲突",
  "Group files by directory": "按目录分组文件",
  "All conflicts resolved": "所有冲突已解决",

  // 3-way merge editor
  "Left (Theirs)": "左侧（他们的）",
  "Center (Result)": "中间（结果）",
  "Right (Yours)": "右侧（你的）",
  "Previous Conflict": "上一个冲突",
  "Next Conflict": "下一个冲突",
  "{changes} changes · {conflicts} conflicts":
    "{changes} 处更改 · {conflicts} 个冲突",
  "Accept Left": "接受左侧",
  "Accept Right": "接受右侧",
  "Accept all changes from left side": "接受左侧的所有更改",
  "Accept all changes from right side": "接受右侧的所有更改",
  "Save merged result and stage file": "保存合并结果并暂存文件",
  "Skip left": "跳过左侧",
  "Skip right": "跳过右侧",
  "Accept left": "接受左侧",
  "Accept right": "接受右侧",
  Undo: "撤销",

  // Loading / errors
  "Loading merge editor...": "正在加载合并编辑器…",
  "Missing merge file path.": "缺少合并文件路径。",
  "Failed to load merge content.": "加载合并内容失败。",
  "Apply failed: {message}": "应用失败：{message}",
};
