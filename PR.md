
该PR新增「与本地对比(Compare with Local)」功能并完成多项界面问题修复：

---

### 1. 新增：与本地对比功能
在Git日志面板任意commit记录上右键 → **Compare with Local**，侧边栏弹出「Changes」面板，展示选中commit与工作区本地文件的差异。
- `package.json` — 新增`git-brains-compare`活动栏容器（面板标题：Changes，图标`images/changes_dark.svg`），注册`git-brains.compareWithLocal`视图（视图名：CHANGES）
- `webview/src/compare/App.tsx` — 独立Changes面板，复用`Commit`面板同款工具栏（刷新、关闭、视图配置（眼睛图标）、全部展开/折叠）
- 面板标题展示格式：`Changes between <hash> and local`，面板背景色和`Commit`详情面板统一
- 文件按修改类型分组：已修改(M)、新增(A，包含未追踪文件)、已删除(D)、重命名/复制(R)
- `webview/src/shared/components/FileTree.tsx` — 文件夹节点增加折叠箭头：收起▶、展开▼
- 点击文件直接唤起VSCode差异编辑器（左侧提交版本 ↔ 右侧本地文件）
- `webview/src/panel/components/CommitContextMenu.tsx` — 右键菜单新增「与本地对比」选项
- `src/extension.ts` — 新增`compareWithLocal`处理函数用于获取差异与未追踪文件，通过`storedCompareState`规避网页视图懒加载带来的时序异常
- `src/git/gitService.ts` — 新增`getCompareWithLocalFiles()`、`getUntrackedFiles()`两个接口方法

<img width="2095" height="1291" alt="Peek 2026-06-06 20-15" src="https://github.com/user-attachments/assets/6977eddd-7eee-4259-bdd0-9c11e99166f7" />

### 2. Commit ref 小标签显示修复
- `webview/src/panel/components/CommitRow.tsx` — 依据引用类型分开展示HEAD、本地分支、远程分支与标签
- 修复以`fix/...`开头的本地分支被错误识别为远程分支、图标颜色异常变紫色的问题
- 修复同一条提交的本地、远程分支标签被合并为单个图标显示的缺陷
- `webview/src/panel/components/CommitDetail.tsx` — HEAD标识改为黄色样式，对齐PyCharm展示规范

### 3. Commit ref 小标签可见性修复
- `webview/src/panel/components/CommitRow.tsx` — 长 commit message 优先省略，避免把 branch/ref 小图标推到面板外
- ref 小标签区域靠右保留最小图标宽度；空间不足时仅省略 ref 文本，保留小图标可见
- `webview/src/shared/components/Tooltip.tsx` — 支持传入 wrapper `style`，使 Tooltip 在 flex 布局中可以正确收缩

<img width="962" height="447" alt="image" src="https://github.com/user-attachments/assets/5d025a9e-437e-4f2c-9ee3-a937d7e78821" />


### 4. Changed Files Diff 打开行为更改
- `src/views/diffEditorManager.ts` — 移除最大化编辑器并隐藏侧边栏的命令配置
- 在变更文件列表双击文件唤起差异对比时，不再自动隐藏VSCode左右侧边栏、篡改工作台布局,差异编辑器在当前编辑分组打开，沿用预览页原有逻辑, 正常都不太喜欢打开diff就关闭侧栏吧

### 5. Commit 面板文件状态颜色适配深色主题
- `webview/src/shared/components/FileTree.tsx` — `STATUS_COLORS` 常量改为 VSCode CSS 变量
- `webview/src/commit/components/FileItem.tsx` — `getStatusColor()` 函数改为 VSCode CSS 变量
- 使用 `--vscode-gitDecoration-*-Foreground` 变量替代硬编码颜色，自动适配深浅主题
- 
<table align="center">
  <tr>
    <td align="center"><img src="https://github.com/user-attachments/assets/7d8cd102-3af9-4db0-8e9d-21aa515dbb9b" width="350"></td>
    <td align="center"><img src="https://github.com/user-attachments/assets/b11a810a-31e0-4fa8-9e3c-4d98f0998ed7" width="350"></td>
  </tr>
  <tr>
    <td align="center">fix前</td>
    <td align="center">fix后</td>
  </tr>
</table>

### 6. Commit 面板按钮样式更改
- `webview/src/commit/commit.css` — Tab 按钮和主/次按钮的 active/hover 态使用 VSCode 主题变量
- 替代硬编码的 `#ededed`、`#dfe7f5` 等颜色，适配深色主题
- 为按钮添加 `border` 使在相近背景色下仍有清晰轮廓

<table align="center">
  <tr>
    <td align="center"><img src="https://github.com/user-attachments/assets/390260c4-106f-4506-81f8-2422bb1811ba" width="350"></td>
    <td align="center"><img src="https://github.com/user-attachments/assets/64da3587-da01-4e47-b2ad-3763184dafa9" width="350"></td>
  </tr>
  <tr>
    <td align="center">fix前</td>
    <td align="center">fix后</td>
  </tr>
</table>
