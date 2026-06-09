# Changelog / 更新日志

## [0.4.14] - 2026-06-09

### Added / 新增
- **Drop Commit** — right-click a commit in git log to drop it from history while preserving its changes as unstaged modifications (IDEA-style) / 右键 commit 支持 Drop Commit，移除 commit 但保留变更到工作区
- **Push Panel: editable remote branch target** — click "origin : main" label to type a custom push target branch name / Push 面板支持点击编辑远程分支目标
- **Push Panel: draggable split divider** — drag the vertical divider between commit list and file changes to resize panes / Push 面板分割线支持拖拽调整宽度
- **Push Panel: progress bar + native notification** — indeterminate progress bar during push, VS Code notification on completion / Push 时显示进度条，完成后弹出原生通知
- **Push Panel: reuse FileTree + CommitInfo** — right side now uses the same FileTree (with tree/flat toggle) and CommitInfo components as git log / Push 面板右侧复用 git log 的文件树和 commit 详情组件
- **Rollback Panel** — dedicated confirmation tab (like Push Panel) with file tree, checkboxes, "Delete local copies of added files" option, and Rollback/Cancel buttons / 全新 Rollback 确认面板，类似 Push 面板，带文件树 + checkbox + 删除选项
- **(JetGit) Edit Source** — right-click in diff editor to jump to the source file at the same line / Diff 编辑器右键跳转到源文件
- **Ref tag icons: dual icons for merged labels** — "origin & dev" now shows both remote (purple) + local (green) overlapping tag icons / 合并标签显示双色重叠图标

### Changed / 变更
- **Rollback uses highlighted files** — rollback button now operates on mouse-click selected (highlighted) files, not checkbox-selected files / Rollback 按钮根据鼠标点击高亮的文件操作
- **No default checkbox selection** — commit panel no longer auto-selects all files on load / Commit 面板不再默认全选文件
- **(JetGit) Show File History** — renamed from "Show File History" to clearly indicate plugin origin, focuses git log panel before filtering / 文案改为 (JetGit) Show File History，点击时先聚焦 git log 面板
- **Ref icon styling** — 16px icons, 5px overlap spacing, white-fill with 1.2px colored stroke for IDEA-like layered effect / 图标调大到 16px，间距 5px，白色填充+彩色描边

### Fixed / 修复
- **Pull --rebase with unstaged changes** — added `--autostash` flag so rebase works even with uncommitted changes (matches IDEA behavior) / pull --rebase 加 --autostash，有未提交变更时也能正常 rebase
- **Edit Source path resolution** — correctly resolves `git-brains:/` URI paths to workspace files / Edit Source 正确解析 diff URI 到工作区文件

## [0.4.11] - 2026-06-06

### Changed / 变更
- **IDEA-style graph colors** — lane colors updated to match IntelliJ IDEA's softer, professional palette (blue, red, green, golden, purple, teal, orange, light teal) / Git graph 配色更新为 IDEA 风格的柔和专业色系
- **IDEA-style angular lines** — graph lines changed from Bézier curves to IDEA-style diagonal transitions (vertical → diagonal → vertical) / 分支线从贝塞尔曲线改为 IDEA 风格的斜线过渡
- **Stub lines with arrows** — branch tips whose parents are beyond the loaded range now show a solid line with a downward arrow (matching IDEA) instead of dashed stubs / 超出加载范围的分支末端改为实线+向下箭头
- **Branch ahead/behind indicators** — shows green ↗ for ahead and teal ↙ for behind on branch names in the tree (IDEA style) / 分支树显示绿色 ↗ ahead 和青色 ↙ behind 标记
- **Ref icon colors** — remote-branch and tag icon colors updated to match the new graph palette / Ref 图标颜色与 graph 配色统一

### Fixed / 修复
- **Graph hidden by header** — git graph SVG no longer renders above the column header when scrolling; header properly clips the graph / 滚动时 graph 不再穿过表头
- **Node-text overlap** — improved per-row max column tracking to prevent graph nodes from overlapping commit message text / 改进每行最大列计算，防止节点与文字重叠
- **Date-order sorting** — git log now uses `--date-order` for commit ordering consistent with IDEA / git log 使用 `--date-order` 排序，与 IDEA 一致

## [0.4.10] - 2026-06-04

### Added / 新增
- **Create Branch dialog** — replaced native input box with a custom dialog featuring "Checkout branch" and "Overwrite existing branch" checkboxes, matching JetBrains style / 创建分支改为自定义对话框，支持 "Checkout branch" 和 "Overwrite existing branch" 选项
- **Inline error in Create Branch dialog** — shows git error message (e.g. branch already exists) directly in the dialog instead of only logging to console / 创建分支失败时在对话框内显示错误提示

### Fixed / 修复
- **Rollback toolbar button** — the Rollback button in the commit panel toolbar now works (was missing onClick handler) / Commit 面板工具栏的 Rollback 按钮现在可以正常使用

## [0.4.9] - 2026-06-03

### Added / 新增
- **Tooltip on truncated branch names** — hover over ellipsized branch names to see full name via custom Tooltip / 悬浮被截断的分支名显示完整名称（使用自定义 Tooltip）
- **Tooltip on truncated commit messages** — hover over ellipsized commit subjects to see full message / 悬浮被截断的 commit message 显示完整内容
- **Tooltip on ref/tag labels** — hover over branch/tag labels in commit rows to see full ref names / 悬浮 commit 行的 ref/tag 标签显示完整名称
- **Directory rollback** — added "Rollback..." option to folder context menu to revert all files in directory / 文件夹右键菜单新增 "Rollback..." 选项

### Fixed / 修复
- **Tooltip renders via portal** — tooltips now render to document.body, preventing clipping by overflow:hidden containers / Tooltip 通过 portal 渲染到 body，不再被父容器裁剪
- **Tooltip auto-flip** — when near viewport top edge, tooltip automatically flips to bottom / Tooltip 靠近顶部时自动翻转到下方显示
- **Context menu viewport overflow** — file and folder context menus auto-adjust position near viewport edges / 右键菜单靠近边缘时自动调整位置
- **Context menu dismiss on blur** — clicking outside webview now closes context menus / 点击 webview 外部关闭右键菜单
- **Preserve file selection on refresh** — refresh no longer resets checkbox state, preserves user selections / 刷新不再重置勾选状态
- **Behind count font size** — reduced to 0.85em to match branch name size / behind 数字字体缩小匹配分支名
- **Thin scrollbar** — 6px scrollbar that doesn't expand on hover / 6px 细滚动条，悬浮不变宽

## [0.4.8] - 2026-06-02

### Added / 新增
- **Column visibility toggle** — right-click the column header or use the eye icon (View Options) in the toolbar to show/hide Author, Date, Hash columns, similar to IntelliJ IDEA / 右键表头或点击工具栏眼睛图标可切换显示/隐藏 Author、Date、Hash 列，类似 IDEA 的 Columns 菜单
- **View Options button** — eye icon button on the far right of the toolbar with a dropdown for column visibility / 工具栏最右侧新增眼睛图标按钮，下拉菜单控制列显示
- **Branch panel collapse button in sidebar** — the "<" collapse button is now at the top of the left toolbar (BranchSidebar), matching JetBrains layout / 分支面板收起按钮移到左侧工具栏顶部，与 JetBrains 布局一致
- **New Branch input pre-filled** — "New Branch from..." now pre-fills the input with the source branch name (fully selected) / "New Branch from..." 现在预填源分支名称并全选

### Fixed / 修复
- **Diff icon** — replaced with official JetBrains `expui/vcs/diff.svg` icon (two offset arrows → ←) across all context menus and toolbars / 所有右键菜单和工具栏的 diff 图标替换为 JetBrains 官方 `expui/vcs/diff.svg`
- **Compare with Current icon** — now uses the official diff icon instead of the external-link style / "Compare with Current" 按钮改用官方 diff 图标
- **Group By Directory icon** — replaced with JetBrains `groupByPackage` icon (folder inside brackets) / "Group By Directory" 图标改为 JetBrains `groupByPackage` 风格（方括号内文件夹）
- **Settings icon** — replaced with stroke-based gear icon for better clarity / 设置图标替换为描边齿轮，更清晰
- **Ref badges right-aligned** — tag/branch labels in the git log are now right-aligned within the message column / Git log 中的 tag/分支名标签现在右对齐
- **Context menu viewport overflow** — file and directory context menus now auto-adjust position when near viewport edges / 文件和文件夹右键菜单现在在靠近视口边缘时自动调整位置
- **Context menu dismiss on blur** — clicking outside the webview (editor, other panels) now correctly closes context menus / 点击 webview 外部（编辑器、其他面板）现在能正确关闭右键菜单
- **Directory rollback** — added "Rollback..." option to folder context menu to revert all files in the directory / 文件夹右键菜单新增 "Rollback..." 选项，可还原目录内所有文件

### Changed / 变更
- **Panel layout** — uses `proportionalLayout={false}` so collapsing left/right panels gives all space to the center git log / 面板布局改为非等比分配，收起侧面板时空间全部给中间 git log
- **All buttons have tooltips** — enforced tooltip on every interactive button / 所有按钮强制添加 tooltip

## [0.4.7] - 2026-05-31

### Added / 新增
- **Merge conflict banner** — displays "Merging {branch}" with continue/abort buttons when merge conflicts are detected, matching IntelliJ IDEA behavior / 合并冲突时显示 "Merging {branch}" 横幅，带继续/终止按钮，与 IDEA 行为一致
- **Merge Conflicts file group** — conflicted files are separated into a dedicated "Merge Conflicts" group with a "Resolve" link / 冲突文件单独分组为 "Merge Conflicts"，带 "Resolve" 链接
- **Rebase banner** — displays "Rebasing {branch} (step/total)" with continue/abort buttons during rebase / Rebase 时显示进度横幅和操作按钮
- **Custom fast Tooltip** — 300ms delay tooltip component replacing slow native browser tooltips across all buttons / 自定义 300ms 快速 Tooltip 组件，替换所有按钮的原生浏览器提示

### Fixed / 修复
- **Merge editor Apply button** — accepting a single side now auto-resolves the conflict block, enabling the Apply button immediately / 合并编辑器中接受单侧变更后立即启用 Apply 按钮
- **Rebase/Merge continue button** — opens conflict resolution panel when unresolved conflicts exist, commits only when all resolved / 有未解决冲突时打开冲突面板，全部解决后才执行 commit

### Changed / 变更
- **Rebase continue/abort icons** — replaced with JetBrains official expui-style icons (double chevron >> and ×) / 替换为 JetBrains 官方 expui 风格图标
- **Merge editor buttons** — restyled to match plugin design (rounded corners, hover effects) / 合并编辑器按钮样式统一为插件风格（圆角、hover 效果）
- **Tooltip unified** — all toolbar, merge editor, and gutter buttons now use the custom Tooltip component / 所有工具栏、合并编辑器和 gutter 按钮统一使用自定义 Tooltip

## [0.4.6] - 2026-05-30

### Added / 新增
- **Current branch sorted to top** — the checked-out branch (or folder containing it) is always shown first in the Local branch tree / 当前分支（或包含它的文件夹）始终排在 Local 分支树最顶部
- **Commit message history dropdown** — click the clock icon next to "Amend" to pick from recent commit messages / 点击 Amend 旁的时钟图标可选择最近的 commit message
- **Refresh syncs both panels** — the refresh button in the commit panel now also refreshes the git log view / Commit 面板的刷新按钮现在同时刷新 Git Log 视图

### Fixed / 修复
- History dropdown opens upward to avoid being clipped by panel boundary / 历史下拉菜单向上弹出，避免被面板边界裁剪
- History dropdown dismisses on outside click / 点击外部区域关闭历史下拉菜单

## [0.4.4] - 2026-05-28

### Added / 新增
- **IDEA-style compact Git Graph** — narrower lanes, smaller nodes, thinner lines / IDEA 风格紧凑 Git 图 — 更窄的通道、更小的节点、更细的线条
- **Per-row text indent** — commit message starts right after the graph for that row, not global max width / 每行文字缩进基于该行 graph 宽度，不再使用全局最大宽度
- **IDEA-style ref tag icons** — outline tag icons with overlapping layout, color-coded / IDEA 风格标签图标 — 线条轮廓标签重叠显示，颜色区分
- **Ref merge rules** — local + remote same-name branches merge as "origin & branchName" / 同名本地+远程分支合并显示为 "origin & branchName"
- **Detail panel email** — author email shown as clickable mailto link / 详情面板显示作者邮箱（可点击）
- **URL highlighting** — links in commit messages are clickable / 提交信息中的链接可点击
- **Mailmap support** — uses %aN/%aE for consistent author identity / 支持 .mailmap 统一作者身份
- **Delete files** — right-click file or directory to delete (with confirmation) / 右键删除文件或目录（带确认）
- **Default directory view** — commit panel defaults to directory tree mode / Commit 面板默认使用目录树视图

### Fixed / 修复
- origin/HEAD filtered from ref display / 过滤 origin/HEAD 不显示
- HEAD shows only icon in list row (no text) / HEAD 在列表行只显示图标
- Local branches with slashes (feat/xxx) correctly classified / 带斜杠的本地分支正确分类
- Empty email no longer shows `<>` / 空邮箱不再显示 `<>`
- Graph-to-text gap increased for readability / 增加 graph 和文字间距
- Per-row indent considers all lanes passing through each row / 每行缩进考虑所有经过该行的 lane

### Changed / 变更
- Git graph COLUMN_WIDTH: 16→10, line stroke: 1.6→1.2, node radius reduced / Git 图列宽、线粗、节点半径缩小
- Ref display: background badges → outline tag icons / 标签显示从背景色方块改为轮廓图标

## [0.4.3] - 2026-05-27

### Fixed / 修复
- Larger checkboxes (16px) for better visibility / 更大的复选框（16px）提升可见性
- Removed yellow/orange focus outline on unchecked checkboxes / 移除取消选中时的黄色聚焦边框
- Checkbox accent color uses IDEA blue (#3574f0) / 复选框选中颜色使用 IDEA 蓝色
- "Commit and Push" button hover color matches toolbar style (#ededed) / "Commit and Push" 按钮悬浮颜色与工具栏一致

## [0.4.2] - 2026-05-27

### Added / 新增
- Clicking Commit icon in Activity Bar now opens both sidebar and bottom Git Log panel simultaneously / 点击 Activity Bar 的 Commit 图标同时打开侧边栏和底部 Git Log 面板
- Clicking again to collapse also closes the bottom panel / 再次点击收起时同时关闭底部面板
- Custom larger SVG icon for Commit in Activity Bar / Activity Bar 使用更大的自定义 SVG 图标

## [0.4.1] - 2026-05-26

### Added / 新增
- **Next/Previous File Diff Navigation** — jump between file diffs with keyboard shortcuts
  **下一个/上一个文件 Diff 导航** — 用快捷键在文件 diff 之间跳转
  - Cmd+F7: next file diff / 下一个文件 diff
  - Cmd+Shift+F7: previous file diff / 上一个文件 diff
  - Status bar shows current position (e.g. "File 2/5: filename.tsx") / 状态栏显示当前位置
  - Commands: `git-brains.nextDiff` / `git-brains.prevDiff` (rebindable in Keyboard Shortcuts) / 可在键盘快捷键设置中自定义绑定
- **Directory node checkboxes** in tree view / 目录树视图中的文件夹复选框
  - Check/uncheck recursively selects/deselects all files under a directory / 勾选/取消勾选递归选中/取消目录下所有文件
  - Indeterminate state when partially selected / 部分选中时显示半选状态
- **Keyboard arrow navigation** — Up/Down arrows move highlight between files / 上下箭头键在文件间移动高亮

### Fixed / 修复
- Directory tree expanded state now persists across tab switches / 目录树展开状态在切换标签页后保持不变
- Show all individual untracked files (use `git status -uall`) instead of directory summaries / 显示所有未跟踪文件而非目录摘要
- Directory tree indentation matches IDEA style with proper nesting / 目录树缩进匹配 IDEA 风格
- Chevron arrow placed before checkbox in directory rows (matches IDEA) / 文件夹行中箭头在复选框前面

## [0.4.0] - 2026-05-26

### Added / 新增
- **IDEA-style Commit Panel** — new sidebar panel (Activity Bar) replicating IntelliJ's commit workflow
  **IDEA 风格 Commit 面板** — 新增侧边栏面板，复刻 IntelliJ 的提交工作流
  - File changes grouped by Changes / Staged / Unversioned Files / 文件变更按 Changes / Staged / Unversioned Files 分组
  - Checkbox-based file selection for partial commits / 基于复选框的文件选择，支持部分提交
  - Commit message input with Ctrl+Enter shortcut / 提交信息输入框，支持 Ctrl+Enter 快捷提交
  - Commit / Commit and Push buttons / Commit 和 Commit and Push 按钮
  - Amend commit support (auto-loads previous message) / Amend 提交支持（自动加载上次提交信息）
  - Right-click context menu: Show Diff, Jump to Source, Add to VCS/Unstage, Rollback, Shelve Changes / 右键菜单：查看差异、跳转源码、暂存/取消暂存、回滚、搁置变更
  - Cmd+Click multi-select for batch operations / Cmd+点击多选，支持批量操作
  - Group by Directory toggle with tree view (collapsible folders) / 按目录分组切换，支持树形视图（可折叠文件夹）
  - View Options menu (eye icon): Group By Directory, Show Unversioned Files / 视图选项菜单（眼睛图标）：按目录分组、显示未跟踪文件
  - Expand All / Collapse All toolbar buttons / 展开全部/折叠全部工具栏按钮
- **IDEA-compatible Shelf** — real shelf stored in `.idea/shelf/` (compatible with IntelliJ IDEA)
  **IDEA 兼容 Shelf** — 真正的 shelf 功能，存储在 `.idea/shelf/`（与 IntelliJ IDEA 完全兼容）
  - Patch-based storage format matching IDEA's XML + unified diff / 基于 patch 的存储格式，匹配 IDEA 的 XML + unified diff
  - Expandable shelf entries showing individual file changes / 可展开的 shelf 条目，显示每个文件的变更
  - Right-click context menu: Unshelve, Restore, Create Patch, Copy as Patch to Clipboard, Import Patches, Delete / 右键菜单：取消搁置、恢复、创建补丁、复制补丁到剪贴板、导入补丁、删除
  - Show Diff opens side-by-side diff editor (base vs modified) / Show Diff 打开左右对比差异编辑器（原始 vs 修改后）
  - Import Patches from external .patch/.diff files / 从外部 .patch/.diff 文件导入补丁
  - Right-click on empty area to Import Patches / 空白区域右键可导入补丁
- **Stash Tab** — git stash management (renamed from previous "Shelf")
  **Stash 标签页** — git stash 管理（从之前的 "Shelf" 重命名）
  - Expandable stash entries with file details / 可展开的 stash 条目，显示文件详情
  - Right-click context menu: Unshelve, Restore, Delete / 右键菜单：弹出、应用、删除
  - Per-file context menu: Show Diff, Jump to Source, Copy Path / 单文件右键菜单：查看差异、跳转源码、复制路径
- All icons sourced from [JetBrains IntelliJ Icons](https://intellij-icons.jetbrains.design/) (Apache 2.0)
  所有图标来源于 [JetBrains IntelliJ Icons](https://intellij-icons.jetbrains.design/)（Apache 2.0 许可）
- Unified design language: 6px border-radius, consistent hover colors (#ededed), IDEA blue focus (#3574f0)
  统一设计语言：6px 圆角、一致的悬浮颜色（#ededed）、IDEA 蓝色聚焦（#3574f0）
- File status colors matching IDEA: green (added), blue (modified), red (unversioned), gray (deleted)
  文件状态颜色匹配 IDEA：绿色（新增）、蓝色（修改）、红色（未跟踪）、灰色（删除）
- Unknown file types use IDEA-style three-line text icon / 未知文件类型使用 IDEA 风格三横线文本图标

### Changed / 变更
- Tab order: Commit | Shelf | Stash (matches IDEA layout) / 标签页顺序：Commit | Shelf | Stash（匹配 IDEA 布局）
- Global button/input border-radius unified to 6px via `--radius` CSS variable / 全局按钮/输入框圆角统一为 6px
- Tab hover/active styles match IDEA (rounded, light blue active state #dfe7f5) / 标签页悬浮/选中样式匹配 IDEA（圆角、淡蓝色选中状态）
- Context menu hover color matches existing branch panel (#e8f0fe) / 右键菜单悬浮颜色与分支面板一致
- Commit message textarea focus border uses IDEA blue (#3574f0) / 提交信息输入框聚焦边框使用 IDEA 蓝色

### Fixed / 修复
- Binary files (zip, png) now open correctly via Jump to Source / 二进制文件（zip、png）现在可以通过"跳转源码"正确打开
- Single-file shelve no longer pulls in unrelated staged files / 单文件搁置不再连带其他已暂存文件
- Shelf/Stash lists auto-refresh after operations / Shelf/Stash 列表在操作后自动刷新

## [0.3.5] - 2025-05-25

### Added
- Status bar button "IDEA Git" at the bottom to quickly open/focus the Git Graph panel

## [0.3.4] - 2025-05-25

### Fixed
- Input hover/focus border now uses hardcoded IDEA blue (#3574f0) instead of VS Code theme variable which was overriding it

## [0.3.3] - 2025-05-25

### Changed
- User and Date filter dropdowns now also have search input (same as Branch)
- Removed unused FilterDropdown component

## [0.3.2] - 2025-05-25

### Added
- Branch filter dropdown now has a search input for quick filtering when there are many branches

## [0.3.1] - 2025-05-25

### Fixed
- Filter dropdowns (Branch/User/Date) now close when clicking anywhere outside, scrolling, or window blur

## [0.3.0] - 2025-05-25

### Changed
- Input border colors match IDEA: default `#c4c4c4`, focus/hover `#3574f0`

## [0.2.9] - 2025-05-25

### Fixed
- Refresh button (built-in) also respects minimum 1s progress bar display

## [0.2.8] - 2025-05-25

### Fixed
- Progress bar shows for minimum 1 second, ensuring animation is always visible even for fast operations

## [0.2.7] - 2025-05-25

### Fixed
- Remove duplicate refresh button from panel title (keep VS Code's built-in one)

## [0.2.6] - 2025-05-25

### Fixed
- Progress bar animation improved: thicker (3px), faster (1s), gradient glow effect for better visibility

## [0.2.5] - 2025-05-25

### Fixed
- Progress bar now shows immediately when clicking git operations (checkout, push, pull, merge, rebase, cherry-pick, reset, revert, delete) instead of waiting for server response

## [0.2.4] - 2025-05-25

### Added
- Auto-maximize editor when opening Diff viewer (same as Merge editor)

## [0.2.3] - 2025-05-25

### Added
- Auto-maximize editor when opening 3-Way Merge Editor for full-screen experience

## [0.2.2] - 2025-05-25

### Added
- IDEA-style blue progress bar during async git operations (checkout, push, pull, merge, rebase, cherry-pick, reset, revert)

## [0.2.1] - 2025-05-25

### Added
- **Show File History command** — right-click a file in editor or Explorer → "IDEA Git: Show File History"
- Also available from Command Palette
- Triggers file history view in the Git Log panel

### Changed
- Command category renamed to "IDEA Git" for easy recognition

## [0.1.9] - 2025-05-25

### Added
- **Show in Git Log** — when viewing file history, right-click a commit to jump back to full log view at that commit
- **Tab-style file history** — file filter displays as a closeable tab (`History: filename.tsx ×`)

## [0.1.8] - 2025-05-25

### Fixed
- Changed Files panel now only shows the filtered file when "History Up to Here" is active

## [0.1.7] - 2025-05-25

### Added
- **History Up to Here** — right-click a file → show only commits that modified it (`git log -- <file>`)
- File filter indicator in toolbar with clear button

## [0.1.6] - 2025-05-25

### Added
- SEO keywords for Marketplace discoverability
- Improved description with more searchable terms

## [0.1.4] - 2025-05-25

### Fixed
- Repository URL now points to the correct fork

## [0.1.3] - 2025-05-25

### Added
- Chinese README (简体中文文档)
- GIF demos for branch checkout and commit context menu

## [0.1.1] - 2025-05-25

### Added
- **Branch Context Menu** — Checkout, New Branch, Checkout and Rebase, Rebase, Merge, Rename, Delete, Update, Push
- **Commit Context Menu** — Copy Revision Number, Cherry-Pick, Checkout Revision, Reset (Mixed/Soft/Hard), Revert, New Branch, New Tag
- **Changed Files Context Menu** — Show Diff, Edit Source, Open Repository Version, Revert Selected Changes, Cherry-Pick Selected Changes, Copy Path, Copy File Name
- **Branch search** — filter branches and tags by name
- **Commit filters** — filter by Branch, User, Date range
- **Resizable columns** — drag to adjust Author, Date, Hash column widths
- **Hash column** — short commit hash in dedicated column
- **Current branch indicator** — shows name next to "Current Branch"
- **IntelliJ IDEA icons** — official SVG icons from intellij-icons.jetbrains.design (Apache 2.0)
- **Context menu icons** — Cherry-Pick (cherry), Revert (undo arrow), Copy, Edit, Diff, Branch, Tag
- **IDEA-style menu colors** — light background, soft shadow, subtle borders

### Changed
- Search inputs match IDEA style with search icon and clear button
- Filter dropdowns use stroke-based chevron icons
- Folder icons use official IntelliJ folder SVG (light fill + stroke)
- Context menus render via React portal for proper positioning
- Menu auto-adjusts position to stay within viewport
- Menu dismisses on outside click, scroll, blur, and resize

## [0.0.4] - Original

- Git Graph visualization
- 3-Way Merge Editor
- Conflict List management
- Diff Editor
