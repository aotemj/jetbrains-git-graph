# Developer Notes — JetBrains Git Graph

这是一个vscode插件项目，旨在将jetbrains的git插件迁移到vscode中

## Fork Information

```
zhyc9de/jet-git (original, 8 commits, last: 4aa7125)
  └── aotemj/jetbrains-git-graph (upstream / PR target, 146+ commits)
        └── bbjyzzwwy/jetbrains-git-graph (origin — my fork)
```

- **Original source**: <https://github.com/zhyc9de/jet-git> (fork base: commit `4aa7125`)
- **Upstream (PR target)**: <https://github.com/aotemj/jetbrains-git-graph>
- **My fork (origin)**: <https://github.com/bbjyzzwwy/jetbrains-git-graph>

## Remote Configuration

```bash
# Initial setup (one-time)
git remote add upstream https://github.com/aotemj/jetbrains-git-graph.git

# Verify
git remote -v
# origin    https://github.com/bbjyzzwwy/jetbrains-git-graph.git (fetch/push)
# upstream  https://github.com/aotemj/jetbrains-git-graph.git (fetch/push)
```

## Branch Strategy

| Branch Pattern | Purpose | Example |
|---|---|---|
| `main` | Tracks upstream/main, always clean and merge-ready | — |
| `fix/<desc>` | Bug fixes | `fix/theme-colors` |
| `feat/<desc>` | New features | `feat/diff-highlight` |
| `chore/<desc>` | Tooling, deps, refactors | `chore/upgrade-biome` |

**Rule: Never commit directly to `main`.** Always work on a feature branch.

## Commit Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>: <description>

<optional body>
```

| Type | Usage |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Tooling, dependencies, refactors |
| `docs` | Documentation only |
| `refactor` | Code restructure (no behavior change) |
| `style` | Formatting, CSS changes |
| `test` | Adding or fixing tests |

Examples:
- `fix: adapt status colors to VSCode theme variables`
- `feat: add inline diff highlighting to commit panel`
- `chore: upgrade biome to 2.0`

## Development Workflow

### Start a New Feature

```bash
# 1. Sync main with upstream
git checkout main
git fetch upstream
git rebase upstream/main
git push origin main

# 2. Create feature branch
git checkout -b feat/my-feature

# 3. Develop & test
pnpm run watch              # Dev mode (parallel watch: esbuild + tsc + vite)

# 4. Stage and commit
git add <files>
git commit -m "feat: description"

# 5. Push to my fork
git push -u origin feat/my-feature

# 6. Create PR on GitHub
#    Base: aotemj/jetbrains-git-graph main  ←  Compare: bbjyzzwwy/jetbrains-git-graph feat/my-feature
```

### Keep a Feature Branch Up-to-Date

```bash
# Fetch upstream changes
git fetch upstream

# Rebase current branch onto latest upstream/main
git checkout my-branch
git rebase upstream/main

# If conflicts occur, resolve each file, then:
git add <resolved-files>
git rebase --continue

# Force-push (safe version — will reject if remote has diverged)
git push --force-with-lease origin my-branch
```

## Build & Test Commands

```bash
pnpm run compile            # Extension: check-types + lint (biome) + esbuild
pnpm run build:web          # Webview: tsc + vite build
pnpm run build              # Both extension + webview
pnpm run watch              # Dev mode (esbuild + tsc + vite parallel watch)
pnpm run package            # Production build (for vsce publish)
```

## PR Checklist

Before creating a PR to `aotemj/jetbrains-git-graph`:

- [ ] `pnpm run compile` passes (check-types + lint + esbuild)
- [ ] `pnpm run build` passes (extension + webview)
- [ ] Branch is rebased on latest `upstream/main`
- [ ] Changes are focused and minimal — one concern per PR
- [ ] Commit messages follow Conventional Commits format
- [ ] No version bumps (`package.json` version unchanged)
- [ ] No personal dev notes or editor config committed
- [ ] No `readme-dev.md` changes in PR (personal file)
- [ ] Manually tested in VS Code Extension Development Host (F5)

## Code Conventions

See [CLAUDE.md](CLAUDE.md) for full conventions. Key points:

- **Formatter/linter**: `biome check` (config in [biome.json](biome.json))
- **Extension Host**: TypeScript + Node.js, child_process for Git CLI
- **Webview**: React 19, Zustand, allotment, @tanstack/react-virtual, shiki, diff, node-diff3
- **Communication**: postMessage via MessageRouter (types synced across [src/messages/protocol.ts](src/messages/protocol.ts) and [webview/src/shared/bridge/types.ts](webview/src/shared/bridge/types.ts))
- **Graph rendering**: SVG + DOM (not Canvas)
- **Git**: Direct CLI calls with custom `\x00` delimiter parsing (no simple-git)
- **Package manager**: pnpm (monorepo with pnpm-workspace.yaml)
- **Do not upgrade React or Vite versions proactively** (pinned versions)

## Project Structure

```
src/                    Extension Host (TypeScript + Node.js)
  ├── extension.ts        Entry point, command registration & MessageRouter
  ├── git/                Git CLI wrappers (gitService, graphLayout, types)
  ├── messages/           Communication protocol (protocol, messageRouter)
  └── views/              Webview managers (mergeEditor, conflicts, diffEditor, html)
webview/                Webview Frontend (React 19 + Vite)
  └── src/
      ├── panel/          Git Log panel (Graph, CommitList, BranchTree, DetailPanel)
      ├── conflicts/      Conflict list page + 3-Way Merge Editor
      ├── shared/         Shared modules (bridge, store, hooks, components, theme)
      └── main.tsx        Router entry (mode: panel | merge | conflicts)
```

---

## Change Log

### 2026-06-06

**1. Commit ref 小标签显示修复**
- `webview/src/panel/components/CommitRow.tsx` — 按原始 ref 类型逐个显示 HEAD、本地分支、远程分支和 tag
- 修复本地 `fix/...` 分支被误判为远程分支、显示成紫色的问题
- 修复同一 commit 上本地分支和远程分支被合并成单个图标的问题
- `webview/src/panel/components/CommitDetail.tsx` — HEAD 图标颜色改为黄色，与pycharm中的格式保持一致

**2. Commit ref 小标签可见性修复**
- `webview/src/panel/components/CommitRow.tsx` — 长 commit message 优先省略，避免把 branch/ref 小图标推到面板外
- ref 小标签区域靠右保留最小图标宽度；空间不足时仅省略 ref 文本，保留小图标可见
- `webview/src/shared/components/Tooltip.tsx` — 支持传入 wrapper `style`，使 Tooltip 在 flex 布局中可以正确收缩

**3. Changed Files Diff 打开行为** 
- `src/views/diffEditorManager.ts` — 移除 `workbench.action.maximizeEditorHideSidebar`
- 双击 Changed Files 中的文件打开 diff 时，不再隐藏 VS Code 左右侧栏或改变 workbench 布局
- diff 使用当前 editor group 打开，并保留普通 preview 行为。一般人都不希望打开diff就把自己的侧栏关闭吧


**4. Compare with Local 功能**
- 右键 commit → "Compare with Local"，在左侧栏独立 Changes 容器中显示本地与选中 commit 的文件差异
- `package.json` — 新增 `git-brains-compare` 活动栏容器（标题 Changes，图标 `images/changes_dark.svg`），`git-brains.compareWithLocal` 视图（名称 Changes）
- `webview/src/compare/App.tsx` — 独立的 Changes 面板，复用 commit 面板风格工具栏（Refresh, Close, View Options 眼睛图标, Expand/Collapse All）
- `webview/src/shared/components/FileTree.tsx` — 文件夹节点加小箭头，收起 ▶ 展开 ▼
- 点击文件打开 VSCode diff 编辑器（commit 版本 ↔ 本地文件）
- `src/extension.ts` — `compareWithLocal` handler 获取 diff + untracked 文件，`storedCompareState` 解决 webview 懒加载时序问题
- `src/git/gitService.ts` — 新增 `getCompareWithLocalFiles()` 和 `getUntrackedFiles()` 方法


### 2026-06-02

**1. Commit 面板文件状态颜色适配深色主题，不然深色主题下可见性非常差**
- `webview/src/shared/components/FileTree.tsx` — `STATUS_COLORS` 常量改为 VSCode CSS 变量
- `webview/src/commit/components/FileItem.tsx` — `getStatusColor()` 函数改为 VSCode CSS 变量
- 使用 `--vscode-gitDecoration-*-Foreground` 变量替代硬编码颜色，自动适配深浅主题

**2. Commit 面板按钮样式修复**
- `webview/src/commit/commit.css` — Tab 按钮和主/次按钮的 active/hover 态使用 VSCode 主题变量，
- 替代硬编码的 `#ededed`、`#dfe7f5` 等颜色，适配深色主题
- 为按钮添加 `border` 使在相近背景色下仍有清晰轮廓


