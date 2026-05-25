# Changelog

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
