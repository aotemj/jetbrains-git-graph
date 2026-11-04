<a name="readme-top"></a>

<div align="center">

<img src="https://raw.githubusercontent.com/aotemj/jetbrains-git-graph/main/images/assets/logo-128.png" width="80" />

<h1>JetBrains Git - IntelliJ IDEA Git Graph, Commit & Shelf for VS Code</h1>

The most complete **IntelliJ IDEA / JetBrains Git** experience for **VS Code** and **Cursor**. Includes Git graph visualization, IDEA-style commit panel with shelf and stash, branch management with context menus, cherry-pick, rebase, merge, and 3-way merge editor. Works like WebStorm, PyCharm, GoLand, and Rider's Git tooling.

> Fork of [zhyc9de/jet-git](https://github.com/zhyc9de/jet-git) with full IntelliJ IDEA-style context menus and UI enhancements.

**English** · [简体中文](./README.zh_CN.md)

</div>

---

## Features

### Branch Context Menu

Right-click any branch to checkout, create, merge, rebase, rename, delete, push, or pull — just like IntelliJ IDEA.

![Branch Checkout](https://raw.githubusercontent.com/aotemj/jetbrains-git-graph/main/images/checkout.gif)

### Commit Context Menu

Right-click any commit to copy hash, cherry-pick, checkout revision, reset, revert, create branch or tag.

![Commit Context Menu](https://raw.githubusercontent.com/aotemj/jetbrains-git-graph/main/images/commit-context-menu.gif)

### Changed Files Context Menu

Right-click files in the Changed Files panel: show diff, edit source, open repository version, revert/cherry-pick file changes, copy path.

### Git Graph

![Git Graph](https://raw.githubusercontent.com/aotemj/jetbrains-git-graph/main/images/git-graph.png)

- **Branch Tree** — branches organized by Local / Remote / Tags with search filter
- **Commit List** — color-coded branch lines, resizable columns (Message, Author, Date, Hash)
- **Detail Panel** — commit message and changed file tree
- **Filters** — filter by Branch, User, Date range

### 3-Way Merge Editor

![3-Way Merge Editor](https://raw.githubusercontent.com/aotemj/jetbrains-git-graph/main/images/three-way-merge.png)

- Three-column layout: Theirs | Result | Yours
- Conflict highlighting with per-block action buttons
- Full syntax highlighting

### Conflict Management

![Conflict List](https://raw.githubusercontent.com/aotemj/jetbrains-git-graph/main/images/conflicts-list.png)

- Quick actions: Accept Yours / Accept Theirs / Merge
- Integration with VS Code Source Control panel

---

## All Context Menu Actions

<details>
<summary><b>Branch (right-click)</b></summary>

- Checkout
- New Branch from...
- Checkout and Rebase onto current
- Rebase current onto branch
- Merge into current
- Rename (local only)
- Delete (with force-delete fallback)
- Update (pull)
- Push

</details>

<details>
<summary><b>Commit (right-click)</b></summary>

- Copy Revision Number
- Cherry-Pick
- Checkout Revision
- Reset Current Branch to Here (Mixed/Soft/Hard)
- Revert Commit
- New Branch...
- New Tag...

</details>

<details>
<summary><b>Changed Files (right-click)</b></summary>

- Show Diff
- Edit Source
- Open Repository Version
- Revert Selected Changes
- Cherry-Pick Selected Changes
- Copy Path
- Copy File Name

</details>

---

## Installation

**From Marketplace:**

Search for **"IDEA-Like Git"** in VS Code Extensions.

**From .vsix:**

1. Download the latest `.vsix` from [releases](https://github.com/aotemj/jetbrains-git-graph/releases)
2. `Cmd+Shift+P` → "Extensions: Install from VSIX..."

## Localization

The interface ships in **English** and **Simplified Chinese**. By default it
follows the VS Code display language; you can force a language with the
`jetgit.language` setting (`auto` / `en` / `zh-cn`).

## Requirements

- VS Code 1.85.0+
- Git installed and in PATH

## Local Development

```bash
git clone https://github.com/aotemj/jetbrains-git-graph.git
cd jetbrains-git-graph
pnpm install
cd webview && pnpm install && cd ..
```

Press **F5** to launch Extension Development Host.

```bash
pnpm run watch          # Watch mode
pnpm run build          # Production build
pnpm run vsce:package   # Package as .vsix
```

## Credits

- Original: [zhyc9de/jet-git](https://github.com/zhyc9de/jet-git)
- Icons: [IntelliJ IDEA Icons](https://intellij-icons.jetbrains.design/) (Apache 2.0)

## License

[MIT](./LICENSE)
