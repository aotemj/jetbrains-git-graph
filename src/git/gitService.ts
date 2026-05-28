import { execFile } from "node:child_process";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { promisify } from "node:util";
import { GitCache } from "./cache";
import { computeGraphLayout } from "./graphLayout";
import type {
  BranchInfo,
  CommitNode,
  DiffFile,
  FileStatus,
  GraphLayoutResult,
  IdeaShelfEntry,
  LaneSnapshot,
  LogOptions,
  MergeState,
  RefInfo,
  TagInfo,
} from "./types";

const execFileAsync = promisify(execFile);

// For parsing git output (actual null byte)
const FIELD_SEP = "\x00";
const RECORD_SEP = "\x00\x00\x01";
// For git log --format (pretty-format): %x00 produces null byte
const FMT_FIELD_SEP = "%x00";
const FMT_RECORD_SEP = "%x00%x00%x01";
// For git branch/tag --format (ref-format / for-each-ref): %00 produces null byte
const REF_FMT_FIELD_SEP = "%00";
const MAX_BUFFER = 10 * 1024 * 1024; // 10MB

const LOG_FORMAT = [
  "%H", // hash
  "%h", // shortHash
  "%P", // parents (space separated)
  "%aN", // authorName (mailmap resolved)
  "%aE", // authorEmail (mailmap resolved)
  "%aI", // authorDate ISO 8601
  "%s", // subject
  "%b", // body
  "%D", // refs
].join(FMT_FIELD_SEP);

export class GitService {
  readonly cache = new GitCache();

  constructor(private readonly cwd: string) {}

  private async execGit(
    args: string[],
    maxBuffer = MAX_BUFFER,
  ): Promise<string> {
    const { stdout } = await execFileAsync("git", args, {
      cwd: this.cwd,
      maxBuffer,
      env: {
        ...process.env,
        LC_ALL: "C",
        GIT_TERMINAL_PROMPT: "0",
      },
    });
    return stdout;
  }

  async checkGitAvailable(): Promise<boolean> {
    try {
      await this.execGit(["rev-parse", "--is-inside-work-tree"]);
      return true;
    } catch {
      return false;
    }
  }

  async getLog(options: LogOptions = {}): Promise<CommitNode[]> {
    const cacheKey = `log:${JSON.stringify(options)}`;
    const cached = this.cache.get<CommitNode[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const args = ["log", `--format=${LOG_FORMAT}${FMT_RECORD_SEP}`];

    if (options.maxCount) {
      args.push(`--max-count=${options.maxCount}`);
    } else {
      args.push("--max-count=200");
    }
    if (options.skip) {
      args.push(`--skip=${options.skip}`);
    }
    if (options.author) {
      args.push(`--author=${options.author}`);
    }
    if (options.search) {
      args.push(`--grep=${options.search}`);
    }
    if (options.since) {
      args.push(`--since=${options.since}`);
    }
    if (options.until) {
      args.push(`--until=${options.until}`);
    }
    if (options.branch) {
      args.push(options.branch);
    } else {
      args.push("--all");
    }
    if (options.file) {
      args.push("--", options.file);
    }

    const output = await this.execGit(args);
    const commits = parseLogOutput(output);
    this.cache.set(cacheKey, commits);
    return commits;
  }

  async getGraphTopology(
    options: LogOptions = {},
    prevSnapshot?: LaneSnapshot,
  ): Promise<GraphLayoutResult> {
    const commits = await this.getLog(options);
    const breakHiddenParents = !!options.search;
    return computeGraphLayout(commits, prevSnapshot, breakHiddenParents);
  }

  async getBranches(): Promise<BranchInfo[]> {
    const cacheKey = "branches";
    const cached = this.cache.get<BranchInfo[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const localFormat = [
      "%(refname:short)",
      "%(HEAD)",
      "%(upstream:short)",
      "%(upstream:track,nobracket)",
      "%(objectname:short)",
    ].join(REF_FMT_FIELD_SEP);

    const localOutput = await this.execGit([
      "branch",
      `--format=${localFormat}`,
    ]);

    const remoteOutput = await this.execGit([
      "branch",
      "-r",
      `--format=${localFormat}`,
    ]).catch(() => "");

    const branches: BranchInfo[] = [];

    for (const line of localOutput.trim().split("\n")) {
      if (!line.trim()) {
        continue;
      }
      const fields = line.split(FIELD_SEP);
      const name = fields[0]?.trim() ?? "";
      const isCurrent = fields[1]?.trim() === "*";
      const upstream = fields[2]?.trim() || undefined;
      const track = fields[3]?.trim() ?? "";
      const lastCommitHash = fields[4]?.trim() ?? "";

      const { ahead, behind } = parseTrack(track);

      branches.push({
        name,
        isRemote: false,
        isCurrent,
        upstream,
        ahead,
        behind,
        lastCommitHash,
      });
    }

    for (const line of remoteOutput.trim().split("\n")) {
      if (!line.trim()) {
        continue;
      }
      const fields = line.split(FIELD_SEP);
      const name = fields[0]?.trim() ?? "";
      const lastCommitHash = fields[4]?.trim() ?? "";

      // Skip HEAD pointers like origin/HEAD
      if (name.endsWith("/HEAD")) {
        continue;
      }

      branches.push({
        name,
        isRemote: true,
        isCurrent: false,
        ahead: 0,
        behind: 0,
        lastCommitHash,
      });
    }

    this.cache.set(cacheKey, branches);
    return branches;
  }

  async getTags(): Promise<TagInfo[]> {
    const cacheKey = "tags";
    const cached = this.cache.get<TagInfo[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const tagFormat = [
      "%(refname:short)",
      "%(objectname:short)",
      "%(objecttype)",
      "%(contents:subject)",
    ].join(REF_FMT_FIELD_SEP);

    const output = await this.execGit([
      "tag",
      "-l",
      `--format=${tagFormat}`,
    ]).catch(() => "");

    const tags: TagInfo[] = [];
    for (const line of output.trim().split("\n")) {
      if (!line.trim()) {
        continue;
      }
      const fields = line.split(FIELD_SEP);
      tags.push({
        name: fields[0]?.trim() ?? "",
        hash: fields[1]?.trim() ?? "",
        isAnnotated: fields[2]?.trim() === "tag",
        message: fields[3]?.trim() || undefined,
      });
    }

    this.cache.set(cacheKey, tags);
    return tags;
  }

  async getDiff(ref1: string, ref2: string, file?: string): Promise<string> {
    const args = ["diff", ref1, ref2];
    if (file) {
      args.push("--", file);
    }
    return this.execGit(args);
  }

  async getFileContent(ref: string, filePath: string): Promise<string> {
    if (!ref) {
      return "";
    }
    try {
      return await this.execGit(["show", `${ref}:${filePath}`]);
    } catch {
      return "";
    }
  }

  async getCommitFiles(hash: string): Promise<DiffFile[]> {
    const output = await this.execGit([
      "diff-tree",
      "--root",
      "--no-commit-id",
      "-r",
      "--name-status",
      "-M",
      hash,
    ]);
    return parseDiffNameStatus(output);
  }

  async getCommitRangeFiles(hashes: string[]): Promise<DiffFile[]> {
    if (hashes.length === 0) return [];
    if (hashes.length === 1) return this.getCommitFiles(hashes[0]);

    // Cherry-pick style: get diff-tree for each commit individually, then merge
    const perCommitFiles = await Promise.all(
      hashes.map((h) => this.getCommitFiles(h)),
    );

    const merged = new Map<string, DiffFile>();
    for (const files of perCommitFiles) {
      for (const f of files) {
        const key = f.newPath || f.oldPath;
        if (!merged.has(key)) {
          merged.set(key, f);
        }
      }
    }
    return Array.from(merged.values());
  }

  async findFileRange(
    hashes: string[],
    filePath: string,
  ): Promise<{ oldest: string; newest: string } | null> {
    // From hashes (newest first), find commits that touch this file
    const touching: string[] = [];
    for (const h of hashes) {
      const files = await this.getCommitFiles(h);
      if (files.some((f) => f.newPath === filePath || f.oldPath === filePath)) {
        touching.push(h);
      }
    }
    if (touching.length === 0) return null;
    return { newest: touching[0], oldest: touching[touching.length - 1] };
  }

  async getStatus(): Promise<FileStatus[]> {
    const output = await this.execGit(["status", "--porcelain=v1"]);
    const files: FileStatus[] = [];

    for (const line of output.split("\n")) {
      if (line.length < 4) {
        continue;
      }
      const indexStatus = line[0];
      const workTreeStatus = line[1];
      const rest = line.substring(3);

      // Handle renames: "R  old -> new"
      const arrowIdx = rest.indexOf(" -> ");
      if (arrowIdx !== -1) {
        files.push({
          path: rest.substring(arrowIdx + 4),
          oldPath: rest.substring(0, arrowIdx),
          indexStatus,
          workTreeStatus,
        });
      } else {
        files.push({
          path: rest,
          indexStatus,
          workTreeStatus,
        });
      }
    }
    return files;
  }

  async getCommitParents(hash: string): Promise<string[]> {
    const output = await this.execGit(["rev-parse", `${hash}^@`]).catch(
      () => "",
    );
    return output
      .trim()
      .split("\n")
      .filter((s) => s.length > 0);
  }

  async getMergeState(): Promise<MergeState> {
    try {
      const mergeHead = (
        await fs.readFile(path.join(this.cwd, ".git", "MERGE_HEAD"), "utf-8")
      ).trim();
      let mergeMsg = "";
      try {
        mergeMsg = (
          await fs.readFile(path.join(this.cwd, ".git", "MERGE_MSG"), "utf-8")
        ).trim();
      } catch {}
      return { isMerging: true, mergeHead, mergeMsg };
    } catch {
      return { isMerging: false };
    }
  }

  async getConflictFiles(): Promise<string[]> {
    const output = await this.execGit([
      "diff",
      "--name-only",
      "--diff-filter=U",
    ]);
    return output
      .trim()
      .split("\n")
      .filter((s) => s.length > 0);
  }

  async getFileVersions(
    filePath: string,
  ): Promise<{ base: string; ours: string; theirs: string }> {
    const [base, ours, theirs] = await Promise.all([
      this.getFileContent(":1", filePath),
      this.getFileContent(":2", filePath),
      this.getFileContent(":3", filePath),
    ]);
    return { base, ours, theirs };
  }

  async saveMergedContent(filePath: string, content: string): Promise<void> {
    await fs.writeFile(path.join(this.cwd, filePath), content, "utf-8");
  }

  async stageFile(filePath: string): Promise<void> {
    await this.execGit(["add", filePath]);
  }

  async acceptOurs(filePath: string): Promise<void> {
    await this.execGit(["checkout", "--ours", filePath]);
    await this.execGit(["add", filePath]);
  }

  async acceptTheirs(filePath: string): Promise<void> {
    await this.execGit(["checkout", "--theirs", filePath]);
    await this.execGit(["add", filePath]);
  }

  async checkout(branchName: string): Promise<void> {
    await this.execGit(["checkout", branchName]);
    this.invalidateCache();
  }

  async createBranch(newBranchName: string, startPoint: string): Promise<void> {
    await this.execGit(["branch", newBranchName, startPoint]);
    this.invalidateCache();
  }

  async deleteBranch(branchName: string, force = false): Promise<void> {
    const flag = force ? "-D" : "-d";
    await this.execGit(["branch", flag, branchName]);
    this.invalidateCache();
  }

  async deleteRemoteBranch(remoteBranch: string): Promise<void> {
    // remoteBranch is like "origin/feature" → push --delete origin feature
    const slashIdx = remoteBranch.indexOf("/");
    const remote = remoteBranch.substring(0, slashIdx);
    const branch = remoteBranch.substring(slashIdx + 1);
    await this.execGit(["push", remote, "--delete", branch]);
    this.invalidateCache();
  }

  async renameBranch(oldName: string, newName: string): Promise<void> {
    await this.execGit(["branch", "-m", oldName, newName]);
    this.invalidateCache();
  }

  async merge(branchName: string): Promise<void> {
    await this.execGit(["merge", branchName]);
    this.invalidateCache();
  }

  async rebase(onto: string): Promise<void> {
    await this.execGit(["rebase", onto]);
    this.invalidateCache();
  }

  async checkoutAndRebase(
    branchToCheckout: string,
    rebaseOnto: string,
  ): Promise<void> {
    await this.execGit(["checkout", branchToCheckout]);
    await this.execGit(["rebase", rebaseOnto]);
    this.invalidateCache();
  }

  async push(branchName: string, force = false): Promise<void> {
    const args = ["push"];
    if (force) args.push("--force-with-lease");
    args.push("origin", branchName);
    await this.execGit(args);
    this.invalidateCache();
  }

  async pull(branchName?: string): Promise<void> {
    const args = ["pull"];
    if (branchName) {
      args.push("origin", branchName);
    }
    await this.execGit(args);
    this.invalidateCache();
  }

  async fetch(remote = "origin"): Promise<void> {
    await this.execGit(["fetch", remote]);
    this.invalidateCache();
  }

  async cherryPick(hash: string): Promise<void> {
    await this.execGit(["cherry-pick", hash]);
    this.invalidateCache();
  }

  async checkoutCommit(hash: string): Promise<void> {
    await this.execGit(["checkout", hash]);
    this.invalidateCache();
  }

  async checkoutFileFromCommit(hash: string, filePath: string): Promise<void> {
    await this.execGit(["checkout", hash, "--", filePath]);
    this.invalidateCache();
  }

  async checkoutFileFromParent(hash: string, filePath: string): Promise<void> {
    // Revert a file to its state before this commit (parent)
    await this.execGit(["checkout", `${hash}~1`, "--", filePath]);
    this.invalidateCache();
  }

  async resetToCommit(
    hash: string,
    mode: "soft" | "mixed" | "hard",
  ): Promise<void> {
    await this.execGit(["reset", `--${mode}`, hash]);
    this.invalidateCache();
  }

  async revertCommit(hash: string): Promise<void> {
    await this.execGit(["revert", "--no-edit", hash]);
    this.invalidateCache();
  }

  async createBranchFromCommit(
    branchName: string,
    hash: string,
  ): Promise<void> {
    await this.execGit(["branch", branchName, hash]);
    this.invalidateCache();
  }

  async createTag(
    tagName: string,
    hash: string,
    message?: string,
  ): Promise<void> {
    if (message) {
      await this.execGit(["tag", "-a", tagName, hash, "-m", message]);
    } else {
      await this.execGit(["tag", tagName, hash]);
    }
    this.invalidateCache();
  }

  // ─── Commit Panel Operations ───────────────────────────────────────

  async getWorkingTreeChanges(): Promise<import("./types").WorkingTreeFile[]> {
    const output = await this.execGit(["status", "--porcelain=v1", "-uall"]);
    const files: import("./types").WorkingTreeFile[] = [];

    for (const line of output.split("\n")) {
      if (line.length < 4) continue;
      const indexStatus = line[0];
      const workTreeStatus = line[1];

      // Skip ignored files
      if (indexStatus === "!" && workTreeStatus === "!") continue;

      const rest = line.substring(3);

      // Handle renames
      const arrowIdx = rest.indexOf(" -> ");
      const filePath = arrowIdx !== -1 ? rest.substring(arrowIdx + 4) : rest;
      const oldPath = arrowIdx !== -1 ? rest.substring(0, arrowIdx) : undefined;

      // Determine if file is staged
      const staged =
        indexStatus !== " " && indexStatus !== "?" && indexStatus !== "!";

      // Determine status
      let status: import("./types").WorkingTreeFile["status"];
      if (indexStatus === "?" && workTreeStatus === "?") {
        status = "untracked";
      } else if (
        indexStatus === "U" ||
        workTreeStatus === "U" ||
        (indexStatus === "A" && workTreeStatus === "A") ||
        (indexStatus === "D" && workTreeStatus === "D")
      ) {
        status = "conflicted";
      } else if (indexStatus === "A" || workTreeStatus === "A") {
        status = "added";
      } else if (indexStatus === "D" || workTreeStatus === "D") {
        status = "deleted";
      } else if (indexStatus === "R" || workTreeStatus === "R") {
        status = "renamed";
      } else {
        status = "modified";
      }

      // For files that have both staged and unstaged changes, emit two entries
      if (
        staged &&
        workTreeStatus !== " " &&
        workTreeStatus !== "?" &&
        workTreeStatus !== "!"
      ) {
        // Staged version
        files.push({ path: filePath, oldPath, status, staged: true });
        // Unstaged version
        files.push({
          path: filePath,
          oldPath,
          status: "modified",
          staged: false,
        });
      } else {
        files.push({ path: filePath, oldPath, status, staged });
      }
    }
    return files;
  }

  async stageFiles(filePaths: string[]): Promise<void> {
    if (filePaths.length === 0) return;
    await this.execGit(["add", "--", ...filePaths]);
  }

  async unstageFile(filePath: string): Promise<void> {
    await this.execGit(["reset", "HEAD", "--", filePath]);
  }

  async unstageAll(): Promise<void> {
    await this.execGit(["reset", "HEAD"]);
  }

  async stageAll(): Promise<void> {
    await this.execGit(["add", "-A"]);
  }

  async commit(message: string, amend = false): Promise<void> {
    const args = ["commit", "-m", message];
    if (amend) args.push("--amend");
    await this.execGit(args);
    this.invalidateCache();
  }

  async commitAndPush(message: string, amend = false): Promise<void> {
    await this.commit(message, amend);
    // Push current branch
    const branch = await this.getCurrentBranch();
    if (branch) {
      const force = amend;
      await this.push(branch, force);
    }
  }

  async getCurrentBranch(): Promise<string | null> {
    try {
      const output = await this.execGit(["rev-parse", "--abbrev-ref", "HEAD"]);
      const branch = output.trim();
      return branch === "HEAD" ? null : branch;
    } catch {
      return null;
    }
  }

  async getLastCommitMessage(): Promise<string> {
    try {
      const output = await this.execGit(["log", "-1", "--format=%B"]);
      return output.trim();
    } catch {
      return "";
    }
  }

  async rollbackFile(filePath: string): Promise<void> {
    // Check if file is untracked
    try {
      await this.execGit(["ls-files", "--error-unmatch", filePath]);
      // File is tracked, checkout from HEAD
      await this.execGit(["checkout", "HEAD", "--", filePath]);
    } catch {
      // File is untracked, remove it
      const fullPath = path.join(this.cwd, filePath);
      await fs.unlink(fullPath);
    }
  }

  // ─── Shelf (Stash-based) Operations ───────────────────────────────

  async getShelves(): Promise<import("./types").ShelveEntry[]> {
    try {
      const output = await this.execGit([
        "stash",
        "list",
        "--format=%gd%x00%s%x00%aI%x00%D",
      ]);
      if (!output.trim()) return [];

      const entries: import("./types").ShelveEntry[] = [];
      for (const line of output.trim().split("\n")) {
        if (!line.trim()) continue;
        const parts = line.split("\x00");
        const id = parts[0] ?? "";
        const message = (parts[1] ?? "").replace(/^(WIP on|On) [^:]+:\s*/, "");
        const date = parts[2] ?? "";
        const _refs = parts[3] ?? "";
        // Extract branch from refs or message
        const branchMatch = (parts[1] ?? "").match(/^(?:WIP on|On) ([^:]+)/);
        const branch = branchMatch?.[1] ?? "";

        entries.push({ id, message, date, branch, files: [] });
      }

      // Load files for each stash
      for (const entry of entries) {
        try {
          const filesOutput = await this.execGit([
            "stash",
            "show",
            entry.id,
            "--name-only",
          ]);
          entry.files = filesOutput.trim().split("\n").filter(Boolean);
        } catch {
          // ignore
        }
      }

      return entries;
    } catch {
      return [];
    }
  }

  async shelveChanges(message: string, filePaths?: string[]): Promise<void> {
    if (filePaths && filePaths.length > 0) {
      // Strategy: to stash only specific files without pulling in other staged files,
      // we need to temporarily reset the index, stage only our target files, then stash.

      // 1. Save current index state by creating a temporary stash of the index
      //    We use a different approach: reset index, add targets, stash, restore index.

      // Get current status to know what's staged
      const statusBefore = await this.execGit(["status", "--porcelain=v1"]);
      const previouslyStaged: string[] = [];
      for (const line of statusBefore.split("\n")) {
        if (line.length < 4) continue;
        const indexStatus = line[0];
        if (indexStatus !== " " && indexStatus !== "?" && indexStatus !== "!") {
          const rest = line.substring(3);
          const arrowIdx = rest.indexOf(" -> ");
          const filePath =
            arrowIdx !== -1 ? rest.substring(arrowIdx + 4) : rest;
          previouslyStaged.push(filePath);
        }
      }

      // 2. Reset the index (unstage everything) without touching working tree
      try {
        await this.execGit(["reset", "HEAD"]);
      } catch {
        // May fail if there's no HEAD (initial commit) — that's ok
      }

      // 3. Stage only the target files
      await this.execGit(["add", "--", ...filePaths]);

      // 4. Stash only the staged files
      await this.execGit([
        "stash",
        "push",
        "--staged",
        "-m",
        message || "Shelved changes",
      ]);

      // 5. Re-stage previously staged files (that weren't stashed)
      const remainingToStage = previouslyStaged.filter(
        (f) => !filePaths.includes(f),
      );
      if (remainingToStage.length > 0) {
        try {
          await this.execGit(["add", "--", ...remainingToStage]);
        } catch {
          // Some files may no longer exist, ignore errors
        }
      }
    } else {
      // Stash all changes including untracked
      const args = ["stash", "push", "-m", message || "Shelved changes", "-u"];
      await this.execGit(args);
    }
    this.invalidateCache();
  }

  async unshelveChanges(stashId: string, drop = true): Promise<void> {
    if (drop) {
      await this.execGit(["stash", "pop", stashId]);
    } else {
      await this.execGit(["stash", "apply", stashId]);
    }
    this.invalidateCache();
  }

  async deleteShelve(stashId: string): Promise<void> {
    await this.execGit(["stash", "drop", stashId]);
  }

  // ─── IDEA Shelf (patch-file based) Operations ─────────────────────

  async getIdeaShelves(): Promise<IdeaShelfEntry[]> {
    const shelfDir = path.join(this.cwd, ".idea", "shelf");
    try {
      await fs.access(shelfDir);
    } catch {
      return [];
    }

    const entries: IdeaShelfEntry[] = [];
    const dirContents = await fs.readdir(shelfDir);

    for (const item of dirContents) {
      if (!item.endsWith(".xml")) continue;
      const xmlPath = path.join(shelfDir, item);
      try {
        const xmlContent = await fs.readFile(xmlPath, "utf-8");
        const entry = this.parseIdeaShelfXml(xmlContent, shelfDir);
        if (entry) entries.push(entry);
      } catch {
        // skip malformed entries
      }
    }

    // Sort by date descending (newest first)
    entries.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
    return entries;
  }

  private parseIdeaShelfXml(
    xmlContent: string,
    shelfDir: string,
  ): IdeaShelfEntry | null {
    // Parse: <changelist name="..." date="..." recycled="...">
    const nameMatch = xmlContent.match(/changelist\s+name="([^"]*)"/);
    const dateMatch = xmlContent.match(/\bdate="(\d+)"/);
    const pathMatch = xmlContent.match(
      /option\s+name="PATH"\s+value="([^"]*)"/,
    );
    const descMatch = xmlContent.match(
      /option\s+name="DESCRIPTION"\s+value="([^"]*)"/,
    );

    if (!nameMatch || !pathMatch) return null;

    const name = nameMatch[1];
    const dateMs = dateMatch ? Number.parseInt(dateMatch[1], 10) : Date.now();
    const date = new Date(dateMs).toISOString();
    const description = descMatch?.[1] ?? "";

    // Resolve $PROJECT_DIR$ to workspace root
    const patchRelative = pathMatch[1].replace(/\$PROJECT_DIR\$/g, this.cwd);
    const patchPath = path.isAbsolute(patchRelative)
      ? patchRelative
      : path.join(shelfDir, patchRelative);

    // Parse files from patch
    const files = this.parseFilesFromPatchPath(patchPath);

    return { name, description, date, patchPath, files };
  }

  private parseFilesFromPatchPath(patchPath: string): string[] {
    try {
      const content = require("node:fs").readFileSync(patchPath, "utf-8");
      return this.parseFilesFromPatch(content);
    } catch {
      return [];
    }
  }

  private parseFilesFromPatch(patchContent: string): string[] {
    const files: string[] = [];
    const lines = patchContent.split("\n");
    for (const line of lines) {
      // Match: diff --git a/path b/path
      const diffMatch = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      if (diffMatch) {
        files.push(diffMatch[2]);
        continue;
      }
      // Match: Index: path
      const indexMatch = line.match(/^Index:\s+(.+)$/);
      if (indexMatch) {
        files.push(indexMatch[1]);
      }
    }
    return [...new Set(files)];
  }

  async ideaShelveChanges(
    message: string,
    filePaths?: string[],
  ): Promise<void> {
    const shelfDir = path.join(this.cwd, ".idea", "shelf");
    await fs.mkdir(shelfDir, { recursive: true });

    const sanitizedName = this.sanitizeShelfName(message || "Changes");
    const uniqueName = await this.getUniqueShelfName(shelfDir, sanitizedName);

    // Create shelf subdirectory
    const entryDir = path.join(shelfDir, uniqueName);
    await fs.mkdir(entryDir, { recursive: true });

    // Generate patch
    let patchContent = "";
    if (filePaths && filePaths.length > 0) {
      patchContent = await this.generatePatchForFiles(filePaths);
    } else {
      patchContent = await this.generatePatchAll();
    }

    if (!patchContent.trim()) {
      // Clean up empty directory
      await fs.rm(entryDir, { recursive: true, force: true });
      throw new Error("No changes to shelve");
    }

    // Write patch file
    const patchFilePath = path.join(entryDir, "shelved.patch");
    await fs.writeFile(patchFilePath, patchContent, "utf-8");

    // Write XML metadata
    const timestamp = Date.now();
    const xmlContent = `<changelist name="${this.escapeXml(uniqueName)}" date="${timestamp}" recycled="false">\n  <option name="PATH" value="$PROJECT_DIR$/.idea/shelf/${uniqueName}/shelved.patch" />\n  <option name="DESCRIPTION" value="${this.escapeXml(message || "")}" />\n</changelist>\n`;
    const xmlPath = path.join(shelfDir, `${uniqueName}.xml`);
    await fs.writeFile(xmlPath, xmlContent, "utf-8");

    // Revert the files in working tree
    if (filePaths && filePaths.length > 0) {
      await this.revertFiles(filePaths);
    } else {
      await this.revertAllChanges();
    }

    this.invalidateCache();
  }

  async ideaUnshelveChanges(shelfName: string, drop?: boolean): Promise<void> {
    const shelfDir = path.join(this.cwd, ".idea", "shelf");
    const patchPath = path.join(shelfDir, shelfName, "shelved.patch");

    try {
      const patchContent = await fs.readFile(patchPath, "utf-8");
      if (patchContent.trim()) {
        // Apply patch using git apply
        try {
          await this.execGit(["apply", "--3way", patchPath]);
        } catch {
          // Try without --3way as fallback
          await this.execGit(["apply", patchPath]);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`Failed to apply shelf "${shelfName}": ${message}`);
    }

    if (drop) {
      await this.deleteIdeaShelf(shelfName);
    }

    this.invalidateCache();
  }

  async deleteIdeaShelf(shelfName: string): Promise<void> {
    const shelfDir = path.join(this.cwd, ".idea", "shelf");
    const entryDir = path.join(shelfDir, shelfName);
    const xmlPath = path.join(shelfDir, `${shelfName}.xml`);

    // Delete directory
    try {
      await fs.rm(entryDir, { recursive: true, force: true });
    } catch {
      // ignore
    }

    // Delete XML file
    try {
      await fs.unlink(xmlPath);
    } catch {
      // ignore
    }
  }

  private sanitizeShelfName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .substring(0, 100);
  }

  async importPatchAsShelf(name: string, patchContent: string): Promise<void> {
    const shelfDir = path.join(this.cwd, ".idea", "shelf");
    await fs.mkdir(shelfDir, { recursive: true });

    const sanitized = this.sanitizeShelfName(name || "Imported");
    const shelfName = await this.getUniqueShelfName(shelfDir, sanitized);

    // Create shelf directory and write patch
    const entryDir = path.join(shelfDir, shelfName);
    await fs.mkdir(entryDir, { recursive: true });
    await fs.writeFile(
      path.join(entryDir, "shelved.patch"),
      patchContent,
      "utf-8",
    );

    // Write XML metadata
    const now = Date.now();
    const xml = `<changelist name="${shelfName}" date="${now}" recycled="false">\n  <option name="PATH" value="$PROJECT_DIR$/.idea/shelf/${shelfName}/shelved.patch" />\n  <option name="DESCRIPTION" value="${shelfName}" />\n</changelist>\n`;
    await fs.writeFile(path.join(shelfDir, `${shelfName}.xml`), xml, "utf-8");
  }

  private async getUniqueShelfName(
    shelfDir: string,
    baseName: string,
  ): Promise<string> {
    let candidate = baseName;
    let counter = 1;
    while (true) {
      const xmlPath = path.join(shelfDir, `${candidate}.xml`);
      try {
        await fs.access(xmlPath);
        // File exists, try next
        candidate = `${baseName}${counter}`;
        counter++;
      } catch {
        // File doesn't exist, use this name
        return candidate;
      }
    }
  }

  private async generatePatchForFiles(filePaths: string[]): Promise<string> {
    let patch = "";

    // Separate tracked and untracked files
    const tracked: string[] = [];
    const untracked: string[] = [];

    for (const filePath of filePaths) {
      try {
        await this.execGit(["ls-files", "--error-unmatch", filePath]);
        tracked.push(filePath);
      } catch {
        untracked.push(filePath);
      }
    }

    // Generate diff for tracked files (staged + unstaged)
    if (tracked.length > 0) {
      try {
        const diff = await this.execGit(["diff", "HEAD", "--", ...tracked]);
        patch += diff;
      } catch {
        // If HEAD doesn't exist (initial commit), diff against empty tree
        try {
          const diff = await this.execGit([
            "diff",
            "--cached",
            "--",
            ...tracked,
          ]);
          patch += diff;
        } catch {
          // ignore
        }
      }
    }

    // Generate patch for untracked files
    for (const filePath of untracked) {
      const fullPath = path.join(this.cwd, filePath);
      try {
        const content = await fs.readFile(fullPath, "utf-8");
        const lines = content.split("\n");
        patch += `diff --git a/${filePath} b/${filePath}\n`;
        patch += "new file mode 100644\n";
        patch += "--- /dev/null\n";
        patch += `+++ b/${filePath}\n`;
        patch += `@@ -0,0 +1,${lines.length} @@\n`;
        for (const line of lines) {
          patch += `+${line}\n`;
        }
      } catch {
        // skip files that can't be read
      }
    }

    return patch;
  }

  private async generatePatchAll(): Promise<string> {
    let patch = "";

    // Get diff for all tracked changes
    try {
      const diff = await this.execGit(["diff", "HEAD"]);
      patch += diff;
    } catch {
      try {
        const diff = await this.execGit(["diff", "--cached"]);
        patch += diff;
      } catch {
        // ignore
      }
    }

    // Get untracked files
    try {
      const untrackedOutput = await this.execGit([
        "ls-files",
        "--others",
        "--exclude-standard",
      ]);
      const untrackedFiles = untrackedOutput.trim().split("\n").filter(Boolean);

      for (const filePath of untrackedFiles) {
        const fullPath = path.join(this.cwd, filePath);
        try {
          const content = await fs.readFile(fullPath, "utf-8");
          const lines = content.split("\n");
          patch += `diff --git a/${filePath} b/${filePath}\n`;
          patch += "new file mode 100644\n";
          patch += "--- /dev/null\n";
          patch += `+++ b/${filePath}\n`;
          patch += `@@ -0,0 +1,${lines.length} @@\n`;
          for (const line of lines) {
            patch += `+${line}\n`;
          }
        } catch {
          // skip binary or unreadable files
        }
      }
    } catch {
      // ignore
    }

    return patch;
  }

  private async revertFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        await this.execGit(["ls-files", "--error-unmatch", filePath]);
        // Tracked file: checkout from HEAD
        await this.execGit(["checkout", "HEAD", "--", filePath]);
      } catch {
        // Untracked file: delete it
        const fullPath = path.join(this.cwd, filePath);
        try {
          await fs.unlink(fullPath);
        } catch {
          // ignore
        }
      }
    }
  }

  private async revertAllChanges(): Promise<void> {
    // Reset tracked files
    try {
      await this.execGit(["checkout", "HEAD", "--", "."]);
    } catch {
      // ignore (e.g. no HEAD yet)
    }
    // Remove untracked files
    try {
      await this.execGit(["clean", "-fd"]);
    } catch {
      // ignore
    }
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  invalidateCache(pattern?: string): void {
    this.cache.invalidate(pattern);
  }
}

function parseDiffNameStatus(output: string): DiffFile[] {
  const files: DiffFile[] = [];
  for (const line of output.trim().split("\n")) {
    if (!line.trim()) {
      continue;
    }
    const parts = line.split("\t");
    const statusCode = parts[0]?.trim() ?? "";

    if (statusCode.startsWith("R") || statusCode.startsWith("C")) {
      const oldPath = parts[1] ?? "";
      const newPath = parts[2] ?? "";
      files.push({
        oldPath,
        newPath,
        status: statusCode.startsWith("R") ? "renamed" : "copied",
        isBinary: false,
      });
    } else {
      const filePath = parts[1] ?? "";
      let status: DiffFile["status"] = "modified";
      if (statusCode === "A") {
        status = "added";
      } else if (statusCode === "D") {
        status = "deleted";
      }
      files.push({
        oldPath: filePath,
        newPath: filePath,
        status,
        isBinary: false,
      });
    }
  }
  return files;
}

function parseLogOutput(output: string): CommitNode[] {
  const commits: CommitNode[] = [];
  const records = output.split(RECORD_SEP);

  for (const record of records) {
    const trimmed = record.trim();
    if (!trimmed) {
      continue;
    }
    const fields = trimmed.split(FIELD_SEP);
    if (fields.length < 9) {
      continue;
    }

    const refsStr = fields[8]?.trim() ?? "";
    const refs = parseRefs(refsStr);

    commits.push({
      hash: fields[0] ?? "",
      shortHash: fields[1] ?? "",
      parents: (fields[2] ?? "").split(" ").filter((s) => s.length > 0),
      authorName: fields[3] ?? "",
      authorEmail: fields[4] ?? "",
      authorDate: fields[5] ?? "",
      subject: fields[6] ?? "",
      body: fields[7] ?? "",
      refs,
    });
  }
  return commits;
}

function parseRefs(refsStr: string): RefInfo[] {
  if (!refsStr) {
    return [];
  }
  const refs: RefInfo[] = [];
  const parts = refsStr.split(",").map((s) => s.trim());

  for (const part of parts) {
    if (!part) {
      continue;
    }
    if (part === "HEAD") {
      refs.push({ type: "HEAD", name: "HEAD" });
    } else if (part.startsWith("HEAD -> ")) {
      refs.push({ type: "HEAD", name: "HEAD" });
      refs.push({ type: "branch", name: part.replace("HEAD -> ", "") });
    } else if (part.startsWith("tag: ")) {
      refs.push({ type: "tag", name: part.replace("tag: ", "") });
    } else if (part.includes("/")) {
      // Distinguish remote branches from local branches with slashes (e.g. feat/xxx)
      // Remote branches in %D format are prefixed with remote name (origin/, upstream/, etc.)
      // Common pattern: if first segment before / is a short name (likely a remote), treat as remote
      const firstSlash = part.indexOf("/");
      const prefix = part.substring(0, firstSlash);
      // Heuristic: remote names are typically short (origin, upstream, fork, etc.)
      // Local branch names with / typically start with feat/, fix/, hotfix/, release/, etc.
      const localPrefixes = [
        "feat",
        "fix",
        "hotfix",
        "release",
        "bugfix",
        "feature",
        "chore",
        "docs",
        "refactor",
        "test",
        "ci",
        "build",
        "perf",
        "style",
        "revert",
        "wip",
        "dependabot",
      ];
      if (localPrefixes.includes(prefix.toLowerCase())) {
        refs.push({ type: "branch", name: part });
      } else {
        refs.push({ type: "remote-branch", name: part });
      }
    } else {
      refs.push({ type: "branch", name: part });
    }
  }
  return refs;
}

function parseTrack(track: string): { ahead: number; behind: number } {
  let ahead = 0;
  let behind = 0;
  const aheadMatch = track.match(/ahead (\d+)/);
  if (aheadMatch) {
    ahead = parseInt(aheadMatch[1], 10);
  }
  const behindMatch = track.match(/behind (\d+)/);
  if (behindMatch) {
    behind = parseInt(behindMatch[1], 10);
  }
  return { ahead, behind };
}
