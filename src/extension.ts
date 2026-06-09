import * as nodefs from "node:fs/promises";
import * as vscode from "vscode";
import { GitService } from "./git/gitService";
import type { DiffFile, LaneSnapshot } from "./git/types";
import { MessageRouter } from "./messages/messageRouter";
import { ErrorCode } from "./messages/protocol";
import { CommitViewProvider } from "./views/commitViewProvider";
import { ConflictsManager } from "./views/conflictsManager";
import { DiffEditorManager } from "./views/diffEditorManager";
import {
  GIT_BRAINS_SCHEME,
  GitContentProvider,
} from "./views/gitContentProvider";
import { GitLogViewProvider } from "./views/gitLogViewProvider";
import { MergeEditorManager } from "./views/mergeEditorManager";
import { PushPanel } from "./views/pushPanel";
import type { RollbackFileInfo } from "./views/rollbackPanel";
import { RollbackPanel } from "./views/rollbackPanel";
import { GitWatcher } from "./watchers/gitWatcher";

const NOT_GIT_REPO = { status: "not_git_repo" as const, data: null };

/** Temporary storage for shelf diff content (base/modified) */
const shelfDiffContent = new Map<string, string>();

/** Wrap a git operation with progress events */
function withProgress(
  messageRouter: MessageRouter,
  fn: () => Promise<unknown>,
): Promise<unknown> {
  messageRouter.broadcastEvent("operationStart", {});
  return fn().finally(() => {
    messageRouter.broadcastEvent("operationEnd", {});
  });
}

export function activate(context: vscode.ExtensionContext) {
  // 1. MessageRouter (always created)
  const messageRouter = new MessageRouter();

  // 2. GitLogViewProvider (always registered)
  const logProvider = new GitLogViewProvider(
    context.extensionUri,
    messageRouter,
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      GitLogViewProvider.viewType,
      logProvider,
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
  );

  // 2b. Git services for all workspace folders
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  const allWorkspaceRoots = (vscode.workspace.workspaceFolders ?? []).map(
    (f) => f.uri.fsPath,
  );
  let gitService: GitService | null = null;
  let diffManager: DiffEditorManager | null = null;

  const allGitServices: GitService[] = [];
  for (const root of allWorkspaceRoots) {
    allGitServices.push(new GitService(root));
  }

  if (workspaceRoot) {
    gitService = allGitServices[0] ?? new GitService(workspaceRoot);

    // Register virtual document provider for git file content
    const contentProvider = new GitContentProvider(gitService);
    contentProvider.setExternalContentMap(shelfDiffContent);
    context.subscriptions.push(
      vscode.workspace.registerTextDocumentContentProvider(
        GIT_BRAINS_SCHEME,
        contentProvider,
      ),
    );

    diffManager = new DiffEditorManager(gitService);
  }

  // 2c. CommitViewProvider (always registered)
  const commitProvider = new CommitViewProvider(
    context.extensionUri,
    messageRouter,
    allGitServices.map((s) => s.cache),
  );
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      CommitViewProvider.viewType,
      commitProvider,
      { webviewOptions: { retainContextWhenHidden: true } },
    ),
  );

  // 3. MergeEditorManager + ConflictsManager (always created)
  const mergeManager = new MergeEditorManager(
    context.extensionUri,
    messageRouter,
  );
  const conflictsManager = new ConflictsManager(
    context.extensionUri,
    messageRouter,
  );

  // 4. PushPanel
  const pushPanel = new PushPanel(context.extensionUri, messageRouter);

  // 4b. RollbackPanel
  const rollbackPanel = new RollbackPanel(context.extensionUri, messageRouter);

  // 5. Register VSCode commands (always registered)
  context.subscriptions.push(
    vscode.commands.registerCommand("git-brains.openPushPanel", async () => {
      if (!gitService) return;
      const branch = await gitService.getCurrentBranch();
      if (branch) {
        pushPanel.open(branch);
      }
    }),
    vscode.commands.registerCommand(
      "git-brains.openMergeEditor",
      (file?: string) => {
        mergeManager.openMergeEditor(file ?? "untitled");
      },
    ),
    vscode.commands.registerCommand(
      "git-brains.openDiffEditor",
      (commit?: string, filePath?: string) => {
        if (commit && filePath && diffManager) {
          diffManager.openDiffEditor(commit, filePath);
        }
      },
    ),
    vscode.commands.registerCommand("git-brains.refreshLog", () => {
      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
    }),
    vscode.commands.registerCommand("git-brains.nextDiff", async () => {
      if (diffManager) {
        const result = await diffManager.nextDiff();
        if (!result) {
          void vscode.window.showInformationMessage(
            "JetGit: No diff file list. Double-click a file in Changed Files first.",
          );
        }
      } else {
        void vscode.window.showInformationMessage("JetGit: No workspace open.");
      }
    }),
    vscode.commands.registerCommand("git-brains.prevDiff", async () => {
      if (diffManager) {
        const result = await diffManager.prevDiff();
        if (!result) {
          void vscode.window.showInformationMessage(
            "JetGit: No diff file list. Double-click a file in Changed Files first.",
          );
        }
      } else {
        void vscode.window.showInformationMessage("JetGit: No workspace open.");
      }
    }),
    vscode.commands.registerCommand("git-brains.openConflicts", () => {
      conflictsManager.openConflictsPanel();
    }),
    vscode.commands.registerCommand(
      "git-brains.openMergeEditorFromSCM",
      (arg?: unknown) => {
        const filePath = getScmResourcePath(arg);
        if (!filePath) {
          void vscode.window.showWarningMessage(
            "Unable to locate conflict file from SCM item.",
          );
          return;
        }
        mergeManager.openMergeEditor(filePath);
      },
    ),
    vscode.commands.registerCommand(
      "git-brains.showFileHistory",
      async (uri?: vscode.Uri) => {
        const fileUri = uri ?? vscode.window.activeTextEditor?.document.uri;
        if (!fileUri || !workspaceRoot) return;
        const relativePath = vscode.workspace.asRelativePath(fileUri, false);
        // Ensure the Git Log panel is visible before sending the event
        await vscode.commands.executeCommand("git-brains.gitLog.focus");
        // Send file filter to webview
        messageRouter.broadcastEvent("showFileHistory", {
          file: relativePath,
        });
      },
    ),
    vscode.commands.registerCommand("git-brains.editSource", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;

      const uri = editor.document.uri;
      const line = editor.selection.active.line;
      const character = editor.selection.active.character;

      // Resolve the actual workspace file path from diff URI
      // Format: git-brains:/<relativePath>?ref=<commitHash>
      let filePath: string | undefined;

      if (uri.scheme === "file") {
        filePath = uri.fsPath;
      } else if (uri.scheme === "git-brains" || uri.scheme === "git") {
        // Extract relative path from URI path (strip leading /)
        const relativePath = uri.path.startsWith("/")
          ? uri.path.slice(1)
          : uri.path;
        if (relativePath && workspaceRoot) {
          filePath = vscode.Uri.joinPath(
            vscode.Uri.file(workspaceRoot),
            relativePath,
          ).fsPath;
        }
      } else {
        // Other schemes (e.g. vscode builtin git) — try path
        const relativePath = uri.path.startsWith("/")
          ? uri.path.slice(1)
          : uri.path;
        if (relativePath && workspaceRoot) {
          filePath = vscode.Uri.joinPath(
            vscode.Uri.file(workspaceRoot),
            relativePath,
          ).fsPath;
        }
      }

      if (!filePath) return;

      // Check if file exists before opening
      const fileUri = vscode.Uri.file(filePath);
      try {
        await vscode.workspace.fs.stat(fileUri);
      } catch {
        void vscode.window.showWarningMessage(
          "Source file does not exist in the working directory.",
        );
        return;
      }

      const doc = await vscode.workspace.openTextDocument(fileUri);
      await vscode.window.showTextDocument(doc, {
        selection: new vscode.Range(line, character, line, character),
        preview: false,
      });
    }),
  );

  // 6. Register command handlers to MessageRouter
  // If GitService is unavailable, handlers return { status: 'not_git_repo' }

  messageRouter.handle("openMergeEditor", async (params) => {
    const file = (params.file as string) ?? "untitled";
    mergeManager.openMergeEditor(file);
    return undefined;
  });

  messageRouter.handle("openDiffEditor", async (params) => {
    if (!diffManager) return undefined;
    const commit = params.commit as string;
    const filePathParam = params.filePath as string | undefined;
    const fileParam = params.file as string | DiffFile | undefined;
    const baseRef = params.baseRef as string | undefined;
    const cherryPickHashes = params.cherryPickHashes as string[] | undefined;
    const fileList = params.fileList as DiffFile[] | undefined;
    const fileMeta =
      typeof fileParam === "object" && fileParam !== null
        ? (fileParam as DiffFile)
        : undefined;
    const filePath =
      filePathParam ??
      (typeof fileParam === "string" ? fileParam : undefined) ??
      fileMeta?.newPath ??
      fileMeta?.oldPath;

    if (commit && filePath) {
      // Set file list for next/prev navigation
      if (fileList && fileList.length > 0) {
        diffManager.setDiffFileList(
          fileList,
          commit,
          baseRef,
          cherryPickHashes,
        );
        // Set current index to the file being opened
        const idx = fileList.findIndex(
          (f) => (f.newPath || f.oldPath) === filePath,
        );
        if (idx >= 0) {
          diffManager.setCurrentIndex(idx);
        }
      }

      await diffManager.openDiffEditor(
        commit,
        filePath,
        fileMeta,
        baseRef,
        cherryPickHashes,
      );
    }
    return undefined;
  });

  messageRouter.handle("getGraphData", async (params) => {
    if (!gitService) {
      return NOT_GIT_REPO;
    }
    const options = {
      maxCount: (params.maxCount as number) ?? 200,
      skip: params.skip as number | undefined,
      branch: params.branch as string | undefined,
      search: params.search as string | undefined,
      author: params.author as string | undefined,
      file: params.file as string | undefined,
    };
    const snapshot = params.snapshot as LaneSnapshot | undefined;
    const result = await gitService.getGraphTopology(options, snapshot);
    return result;
  });

  messageRouter.handle("getLog", async (params) => {
    if (!gitService) {
      return NOT_GIT_REPO;
    }
    return gitService.getLog(
      params as Record<string, unknown> & { maxCount?: number },
    );
  });

  messageRouter.handle("loadMoreLog", async (params) => {
    if (!gitService) {
      return NOT_GIT_REPO;
    }
    const options = {
      maxCount: (params.count as number) ?? 200,
      skip: (params.skip as number) ?? 0,
      branch: params.branch as string | undefined,
      search: params.search as string | undefined,
      author: params.author as string | undefined,
    };
    const snapshot = params.snapshot as LaneSnapshot | undefined;
    const result = await gitService.getGraphTopology(options, snapshot);
    return result;
  });

  messageRouter.handle("getBranches", async () => {
    if (!gitService) {
      return NOT_GIT_REPO;
    }
    return gitService.getBranches();
  });

  messageRouter.handle("getRemoteBranches", async () => {
    if (!gitService) {
      return NOT_GIT_REPO;
    }
    return gitService.getRemoteBranches();
  });

  messageRouter.handle("getTags", async () => {
    if (!gitService) {
      return NOT_GIT_REPO;
    }
    return gitService.getTags();
  });

  messageRouter.handle("getDiff", async (params) => {
    if (!gitService) {
      return NOT_GIT_REPO;
    }
    const ref1 = params.ref1 as string;
    const ref2 = params.ref2 as string;
    const file = params.file as string | undefined;
    return gitService.getDiff(ref1, ref2, file);
  });

  messageRouter.handle("getFileContent", async (params) => {
    if (!gitService) {
      return NOT_GIT_REPO;
    }
    const ref = params.ref as string;
    const filePath = params.filePath as string;
    return gitService.getFileContent(ref, filePath);
  });

  messageRouter.handle("getCommitFiles", async (params) => {
    if (!gitService) {
      return NOT_GIT_REPO;
    }
    const hash = params.hash as string;
    return gitService.getCommitFiles(hash);
  });

  messageRouter.handle("getCommitRangeFiles", async (params) => {
    if (!gitService) {
      return NOT_GIT_REPO;
    }
    const hashes = params.hashes as string[];
    return gitService.getCommitRangeFiles(hashes);
  });

  messageRouter.handle("getStatus", async () => {
    if (!gitService) {
      return NOT_GIT_REPO;
    }
    return gitService.getStatus();
  });

  messageRouter.handle("getMergeState", async () => {
    if (!gitService) return NOT_GIT_REPO;
    return gitService.getMergeState();
  });

  messageRouter.handle("getCherryPickState", async () => {
    if (!gitService) return { isCherryPicking: false };
    return gitService.getCherryPickState();
  });

  messageRouter.handle("cherryPickAction", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const action = params.action as "continue" | "abort" | "skip";
    return withProgress(messageRouter, async () => {
      await gitService.cherryPickAction(action);
      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      messageRouter.broadcastEvent("commitStateChanged", {});
      return { success: true };
    });
  });

  messageRouter.handle("getRebaseState", async () => {
    if (!gitService) return { isRebasing: false };
    return gitService.getRebaseState();
  });

  messageRouter.handle("rebaseAction", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const action = params.action as "continue" | "abort" | "skip";
    return withProgress(messageRouter, async () => {
      await gitService.rebaseAction(action);
      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      messageRouter.broadcastEvent("commitStateChanged", {});
      return { success: true };
    });
  });

  messageRouter.handle("mergeAction", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const action = params.action as "continue" | "abort";
    return withProgress(messageRouter, async () => {
      if (action === "continue") {
        await gitService.mergeContinue();
      } else {
        await gitService.mergeAbort();
      }
      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      messageRouter.broadcastEvent("commitStateChanged", {});
      return { success: true };
    });
  });

  messageRouter.handle("getConflictFiles", async () => {
    if (!gitService) return NOT_GIT_REPO;
    return gitService.getConflictFiles();
  });

  messageRouter.handle("openConflictsPanel", async () => {
    await vscode.commands.executeCommand("git-brains.openConflicts");
    return { success: true };
  });

  messageRouter.handle("getFileVersions", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const filePath = params.filePath as string;
    const versions = await gitService.getFileVersions(filePath);
    const mergeState = await gitService.getMergeState();
    const ext = filePath.split(".").pop() ?? "";
    return {
      ...versions,
      language: extToLanguage(ext),
      mergeMsg: mergeState.mergeMsg,
    };
  });

  messageRouter.handle("saveMergedContent", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    await gitService.saveMergedContent(
      params.filePath as string,
      params.content as string,
    );
    return { success: true };
  });

  messageRouter.handle("stageFile", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    await gitService.stageFile(params.filePath as string);
    messageRouter.broadcastEvent("commitStateChanged", {});
    return { success: true };
  });

  messageRouter.handle("acceptOurs", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    await gitService.acceptOurs(params.filePath as string);
    return { success: true };
  });

  messageRouter.handle("acceptTheirs", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    await gitService.acceptTheirs(params.filePath as string);
    return { success: true };
  });

  messageRouter.handle("confirmCancelMerge", async (params) => {
    const hasChanges = params.hasChanges as boolean;
    if (!hasChanges) return { confirmed: true };
    const choice = await vscode.window.showWarningMessage(
      "You have unsaved merge changes. Discard them?",
      { modal: true },
      "Discard",
    );
    return { confirmed: choice === "Discard" };
  });

  messageRouter.handle("closeMergeEditor", async (params) => {
    const filePath = params.filePath as string;
    mergeManager.closeMergeEditor(filePath);
    return { success: true };
  });

  messageRouter.handle("openFile", async (params) => {
    const filePath = params.filePath as string;
    const absPath = workspaceRoot
      ? vscode.Uri.joinPath(vscode.Uri.file(workspaceRoot), filePath)
      : vscode.Uri.file(filePath);
    try {
      await vscode.commands.executeCommand("vscode.open", absPath);
    } catch {
      // Fallback for files that can't be opened in any editor
      await vscode.env.openExternal(absPath);
    }
    return { success: true };
  });

  messageRouter.handle("showInputBox", async (params) => {
    const prompt = params.prompt as string | undefined;
    const value = params.value as string | undefined;
    const placeHolder = params.placeHolder as string | undefined;
    const result = await vscode.window.showInputBox({
      prompt,
      value,
      placeHolder,
    });
    return { value: result ?? null };
  });

  messageRouter.handle("showConfirmMessage", async (params) => {
    const message = params.message as string;
    const confirmLabel = (params.confirmLabel as string) || "OK";
    const result = await vscode.window.showWarningMessage(
      message,
      { modal: true },
      confirmLabel,
    );
    return { confirmed: result === confirmLabel };
  });

  messageRouter.handle("showErrorNotification", async (params) => {
    const message = params.message as string;
    void vscode.window.showErrorMessage(message);
    return { success: true };
  });

  messageRouter.handle("showInfoNotification", async (params) => {
    const message = params.message as string;
    void vscode.window.showInformationMessage(message);
    return { success: true };
  });

  messageRouter.handle("checkoutBranch", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const branchName = params.branchName as string;
    return withProgress(messageRouter, async () => {
      await gitService.checkout(branchName);
      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      return { success: true };
    });
  });

  messageRouter.handle("createBranch", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const newBranchName = params.newBranchName as string;
    const startPoint = params.startPoint as string;
    const checkout = params.checkout as boolean | undefined;
    const force = params.force as boolean | undefined;
    await gitService.createBranch(newBranchName, startPoint, force ?? false);
    if (checkout) {
      await gitService.checkout(newBranchName);
    }
    messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
    return { success: true };
  });

  messageRouter.handle("deleteBranch", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const branchName = params.branchName as string;
    const isRemote = params.isRemote as boolean;
    const force = params.force as boolean | undefined;
    if (isRemote) {
      await gitService.deleteRemoteBranch(branchName);
    } else {
      await gitService.deleteBranch(branchName, force ?? false);
    }
    messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
    return { success: true };
  });

  messageRouter.handle("renameBranch", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const oldName = params.oldName as string;
    const newName = params.newName as string;
    await gitService.renameBranch(oldName, newName);
    messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
    return { success: true };
  });

  messageRouter.handle("mergeBranch", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const branchName = params.branchName as string;
    return withProgress(messageRouter, async () => {
      await gitService.merge(branchName);
      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      return { success: true };
    });
  });

  messageRouter.handle("rebaseBranch", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const onto = params.onto as string;
    return withProgress(messageRouter, async () => {
      await gitService.rebase(onto);
      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      return { success: true };
    });
  });

  messageRouter.handle("checkoutAndRebase", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const branchToCheckout = params.branchToCheckout as string;
    const rebaseOnto = params.rebaseOnto as string;
    return withProgress(messageRouter, async () => {
      await gitService.checkoutAndRebase(branchToCheckout, rebaseOnto);
      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      return { success: true };
    });
  });

  messageRouter.handle("pushBranch", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const branchName = params.branchName as string;
    const force = params.force as boolean | undefined;
    return withProgress(messageRouter, async () => {
      await gitService.push(branchName, force ?? false);
      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      return { success: true };
    });
  });

  messageRouter.handle("getAheadCommits", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const branchName = params.branchName as string;
    const commits = await gitService.getAheadCommits(branchName);
    return { commits };
  });

  messageRouter.handle("executePush", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const branchName = params.branchName as string;
    const force = params.force as boolean | undefined;
    const remote = (params.remote as string) || "origin";
    const targetBranch = (params.targetBranch as string) || branchName;
    return withProgress(messageRouter, async () => {
      const output = await gitService.push(
        branchName,
        force ?? false,
        remote,
        targetBranch,
      );
      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      messageRouter.broadcastEvent("commitStateChanged", {});
      // Return push output so webview can show result toast before closing
      const isUpToDate =
        output?.includes("Everything up-to-date") ||
        output?.includes("up to date");
      return { success: true, data: { output: output ?? "", isUpToDate } };
    });
  });

  messageRouter.handle("closePushPanel", async () => {
    pushPanel.close();
    return { success: true };
  });

  messageRouter.handle("openPushPanel", async () => {
    if (!gitService) return NOT_GIT_REPO;
    const branch = await gitService.getCurrentBranch();
    if (!branch) return { error: "No current branch" };
    pushPanel.open(branch);
    return { success: true };
  });

  // ─── Rollback Panel Handlers ───────────────────────────────────────

  messageRouter.handle("openRollbackPanel", async (params) => {
    const files = params.files as RollbackFileInfo[];
    rollbackPanel.open(files);
    return { success: true };
  });

  messageRouter.handle("executeRollback", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const filePaths = params.filePaths as string[];
    const deleteLocalCopies = params.deleteLocalCopies as boolean;

    try {
      // Get current working tree status to determine each file's state
      const workingTreeChanges = await gitService.getWorkingTreeChanges();
      const statusMap = new Map<string, string>();
      for (const file of workingTreeChanges) {
        statusMap.set(file.path, file.status);
      }

      for (const filePath of filePaths) {
        const status = statusMap.get(filePath) ?? "modified";
        if (status === "added" || status === "untracked") {
          if (deleteLocalCopies) {
            // Delete untracked/added file from filesystem
            const absPath = vscode.Uri.joinPath(
              vscode.Uri.file(workspaceRoot!),
              filePath,
            );
            await vscode.workspace.fs.delete(absPath);
          }
          // If deleteLocalCopies is false, skip untracked/added files
        } else {
          // Revert tracked file changes via git checkout
          await gitService.rollbackFile(filePath);
        }
      }

      messageRouter.broadcastEvent("commitStateChanged", {});
      rollbackPanel.close();
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, error: message };
    }
  });

  messageRouter.handle("closeRollbackPanel", async () => {
    rollbackPanel.close();
    return { success: true };
  });

  messageRouter.handle("pullBranch", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const branchName = params.branchName as string | undefined;
    return withProgress(messageRouter, async () => {
      await gitService.pull(branchName);
      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      return { success: true };
    });
  });

  messageRouter.handle("pullRebase", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const branchName = params.branchName as string | undefined;
    return withProgress(messageRouter, async () => {
      await gitService.pullRebase(branchName);
      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      return { success: true };
    });
  });

  messageRouter.handle("pullMerge", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const branchName = params.branchName as string | undefined;
    return withProgress(messageRouter, async () => {
      await gitService.pull(branchName);
      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      return { success: true };
    });
  });

  messageRouter.handle("fetchBranch", async () => {
    if (!gitService) return NOT_GIT_REPO;
    return withProgress(messageRouter, async () => {
      await gitService.fetch();
      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      return { success: true };
    });
  });

  messageRouter.handle("cherryPick", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const hash = params.hash as string;
    return withProgress(messageRouter, async () => {
      await gitService.cherryPick(hash);
      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      return { success: true };
    });
  });

  messageRouter.handle("checkoutCommit", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const hash = params.hash as string;
    await gitService.checkoutCommit(hash);
    messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
    return { success: true };
  });

  messageRouter.handle("revertFileChanges", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const hash = params.hash as string;
    const filePath = params.filePath as string;
    const status = params.status as string | undefined;
    await gitService.checkoutFileFromParent(hash, filePath, status);
    messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
    return { success: true };
  });

  messageRouter.handle("cherryPickFileChanges", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const hash = params.hash as string;
    const filePath = params.filePath as string;
    await gitService.checkoutFileFromCommit(hash, filePath);
    messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
    return { success: true };
  });

  messageRouter.handle("resetToCommit", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const hash = params.hash as string;
    const mode = params.mode as "soft" | "mixed" | "hard";
    return withProgress(messageRouter, async () => {
      await gitService.resetToCommit(hash, mode);
      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      return { success: true };
    });
  });

  messageRouter.handle("revertCommit", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const hash = params.hash as string;
    return withProgress(messageRouter, async () => {
      await gitService.revertCommit(hash);
      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      return { success: true };
    });
  });

  messageRouter.handle("dropCommit", async (params) => {
    if (!gitService) return NOT_GIT_REPO;

    const hash = params.hash as string;

    // Validate hash format (40-char hex)
    if (!hash || !/^[0-9a-f]{40}$/i.test(hash)) {
      return {
        success: false,
        error: { code: ErrorCode.INVALID_REF, message: "Invalid commit hash" },
      };
    }

    // Check if merge commit (reject before emitting operationStart)
    const parents = await gitService.getCommitParents(hash);
    if (parents.length > 1) {
      return {
        success: false,
        error: {
          code: ErrorCode.GIT_COMMAND_FAILED,
          message: "Merge commits cannot be dropped",
        },
      };
    }

    // Proceed with progress and 30-second timeout
    return withProgress(messageRouter, async () => {
      const timeoutMs = 30_000;
      const dropPromise = gitService.dropCommit(hash);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Operation timed out")), timeoutMs),
      );

      await Promise.race([dropPromise, timeoutPromise]);

      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      messageRouter.broadcastEvent("commitStateChanged", {});
      return { success: true };
    });
  });

  messageRouter.handle("createBranchFromCommit", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const branchName = params.branchName as string;
    const hash = params.hash as string;
    const checkout = params.checkout as boolean | undefined;
    const force = params.force as boolean | undefined;
    await gitService.createBranchFromCommit(branchName, hash, force ?? false);
    if (checkout) {
      await gitService.checkout(branchName);
    }
    messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
    return { success: true };
  });

  messageRouter.handle("createTag", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const tagName = params.tagName as string;
    const hash = params.hash as string;
    const message = params.message as string | undefined;
    await gitService.createTag(tagName, hash, message);
    messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
    return { success: true };
  });

  messageRouter.handle("copyToClipboard", async (params) => {
    const text = params.text as string;
    await vscode.env.clipboard.writeText(text);
    return { success: true };
  });

  messageRouter.handle("openFileAtRevision", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const filePath = params.filePath as string;
    const ref = params.ref as string;
    const uri = vscode.Uri.parse(`${GIT_BRAINS_SCHEME}:${filePath}?ref=${ref}`);
    await vscode.window.showTextDocument(uri, { preview: true });
    return { success: true };
  });

  // ─── Commit Panel Handlers ───────────────────────────────────────

  messageRouter.handle("getWorkingTreeChanges", async () => {
    if (allGitServices.length === 0) return NOT_GIT_REPO;

    // Aggregate changes from all workspace folders
    const allChanges: import("./git/types").WorkingTreeFile[] = [];
    for (const svc of allGitServices) {
      try {
        const changes = await svc.getWorkingTreeChanges();
        allChanges.push(...changes);
      } catch {
        // Skip folders that aren't git repos
      }
    }
    return allChanges;
  });

  messageRouter.handle("unstageFile", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    await gitService.unstageFile(params.filePath as string);
    messageRouter.broadcastEvent("commitStateChanged", {});
    return { success: true };
  });

  messageRouter.handle("stageAll", async () => {
    if (!gitService) return NOT_GIT_REPO;
    await gitService.stageAll();
    messageRouter.broadcastEvent("commitStateChanged", {});
    return { success: true };
  });

  messageRouter.handle("unstageAll", async () => {
    if (!gitService) return NOT_GIT_REPO;
    await gitService.unstageAll();
    messageRouter.broadcastEvent("commitStateChanged", {});
    return { success: true };
  });

  messageRouter.handle("commitChanges", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const message = params.message as string;
    const amend = params.amend as boolean | undefined;
    const filePaths = params.filePaths as string[] | undefined;

    // Stage specified files if provided
    if (filePaths && filePaths.length > 0) {
      await gitService.stageFiles(filePaths);
    }

    await gitService.commit(message, amend ?? false);
    messageRouter.broadcastEvent("commitStateChanged", {});
    messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
    return { success: true };
  });

  messageRouter.handle("commitAndPush", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const message = params.message as string;
    const amend = params.amend as boolean | undefined;
    const filePaths = params.filePaths as string[] | undefined;

    if (filePaths && filePaths.length > 0) {
      await gitService.stageFiles(filePaths);
    }

    return withProgress(messageRouter, async () => {
      await gitService.commitAndPush(message, amend ?? false);
      messageRouter.broadcastEvent("commitStateChanged", {});
      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      return { success: true };
    });
  });

  messageRouter.handle("amendCommit", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const message = params.message as string;
    await gitService.commit(message, true);
    messageRouter.broadcastEvent("commitStateChanged", {});
    messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
    return { success: true };
  });

  messageRouter.handle("getAmendMessage", async () => {
    if (!gitService) return NOT_GIT_REPO;
    const message = await gitService.getLastCommitMessage();
    return { message };
  });

  messageRouter.handle("getRecentCommitMessages", async () => {
    if (!gitService) return NOT_GIT_REPO;
    return gitService.getRecentCommitMessages(20);
  });

  messageRouter.handle("refreshGitState", async () => {
    if (gitService) {
      gitService.invalidateCache();
    }
    messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
    return { success: true };
  });

  messageRouter.handle("rollbackFile", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const filePath = params.filePath as string;
    const choice = await vscode.window.showWarningMessage(
      `Rollback changes to "${filePath}"? This cannot be undone.`,
      { modal: true },
      "Rollback",
    );
    if (choice !== "Rollback") return { success: false };
    await gitService.rollbackFile(filePath);
    messageRouter.broadcastEvent("commitStateChanged", {});
    return { success: true };
  });

  messageRouter.handle("rollbackFiles", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const filePaths = params.filePaths as string[];
    if (!filePaths || filePaths.length === 0) return { success: false };
    const choice = await vscode.window.showWarningMessage(
      `Rollback changes to ${filePaths.length} file(s)? This cannot be undone.`,
      { modal: true },
      "Rollback",
    );
    if (choice !== "Rollback") return { success: false };
    for (const filePath of filePaths) {
      await gitService.rollbackFile(filePath);
    }
    messageRouter.broadcastEvent("commitStateChanged", {});
    return { success: true };
  });

  messageRouter.handle("revealInSystemExplorer", async (params) => {
    const filePath = params.filePath as string;
    if (!filePath || !workspaceRoot) return { success: false };
    const absPath = vscode.Uri.joinPath(
      vscode.Uri.file(workspaceRoot),
      filePath,
    );
    await vscode.commands.executeCommand("revealFileInOS", absPath);
    return { success: true };
  });

  messageRouter.handle("deleteFiles", async (params) => {
    if (!workspaceRoot) return NOT_GIT_REPO;
    const filePaths = params.filePaths as string[];
    if (!filePaths || filePaths.length === 0) return { success: false };

    const fileCount = filePaths.length;
    const message =
      fileCount === 1
        ? `Delete "${filePaths[0]}"? This cannot be undone.`
        : `Delete ${fileCount} files? This cannot be undone.`;

    const choice = await vscode.window.showWarningMessage(
      message,
      { modal: true },
      "Delete",
    );
    if (choice !== "Delete") return { success: false };

    for (const filePath of filePaths) {
      const fullPath = vscode.Uri.joinPath(
        vscode.Uri.file(workspaceRoot),
        filePath,
      );
      try {
        await vscode.workspace.fs.delete(fullPath, { recursive: true });
      } catch {
        // File may already be deleted, ignore
      }
    }
    messageRouter.broadcastEvent("commitStateChanged", {});
    return { success: true };
  });

  messageRouter.handle("showDiffForWorkingFile", async (params) => {
    if (!gitService || !workspaceRoot) return NOT_GIT_REPO;
    const filePath = params.filePath as string;
    const staged = params.staged as boolean | undefined;

    const rightUri = vscode.Uri.joinPath(
      vscode.Uri.file(workspaceRoot),
      filePath,
    );

    if (staged) {
      // Show diff between HEAD and staged
      const leftUri = vscode.Uri.parse(
        `${GIT_BRAINS_SCHEME}:${filePath}?ref=HEAD`,
      );
      await vscode.commands.executeCommand(
        "vscode.diff",
        leftUri,
        rightUri,
        `${filePath} (HEAD ↔ Staged)`,
      );
    } else {
      // Show diff between HEAD and working tree
      const leftUri = vscode.Uri.parse(
        `${GIT_BRAINS_SCHEME}:${filePath}?ref=HEAD`,
      );
      await vscode.commands.executeCommand(
        "vscode.diff",
        leftUri,
        rightUri,
        `${filePath} (HEAD ↔ Working Tree)`,
      );
    }
    return { success: true };
  });

  // ─── Shelf Handlers ───────────────────────────────────────────────

  messageRouter.handle("getShelves", async () => {
    if (!gitService) return NOT_GIT_REPO;
    return gitService.getShelves();
  });

  messageRouter.handle("shelveChanges", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const message = params.message as string | undefined;
    const filePaths = params.filePaths as string[] | undefined;
    await gitService.shelveChanges(message ?? "", filePaths);
    messageRouter.broadcastEvent("commitStateChanged", {});
    return { success: true };
  });

  messageRouter.handle("unshelveChanges", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const stashId = params.stashId as string;
    const drop = (params.drop as boolean) ?? true;
    await gitService.unshelveChanges(stashId, drop);
    messageRouter.broadcastEvent("commitStateChanged", {});
    messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
    return { success: true };
  });

  messageRouter.handle("deleteShelve", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const stashId = params.stashId as string;
    const choice = await vscode.window.showWarningMessage(
      `Delete shelved changes "${stashId}"? This cannot be undone.`,
      { modal: true },
      "Delete",
    );
    if (choice !== "Delete") return { success: false };
    await gitService.deleteShelve(stashId);
    messageRouter.broadcastEvent("commitStateChanged", {});
    return { success: true };
  });

  messageRouter.handle("showShelfFileDiff", async (params) => {
    if (!gitService || !workspaceRoot) return NOT_GIT_REPO;
    const stashId = params.stashId as string;
    const filePath = params.filePath as string;

    // Show diff between the stash version and the parent (before stash)
    const stashUri = vscode.Uri.parse(
      `${GIT_BRAINS_SCHEME}:${filePath}?ref=${stashId}`,
    );
    const parentUri = vscode.Uri.parse(
      `${GIT_BRAINS_SCHEME}:${filePath}?ref=${stashId}^`,
    );
    await vscode.commands.executeCommand(
      "vscode.diff",
      parentUri,
      stashUri,
      `${filePath} (Shelved: ${stashId})`,
    );
    return { success: true };
  });

  messageRouter.handle("unshelveFile", async (params) => {
    if (!gitService || !workspaceRoot) return NOT_GIT_REPO;
    const stashId = params.stashId as string;
    const filePath = params.filePath as string;

    // Checkout the single file from the stash into the working tree
    try {
      await gitService.checkoutFileFromCommit(stashId, filePath);
      messageRouter.broadcastEvent("commitStateChanged", {});
      return { success: true };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      void vscode.window.showErrorMessage(
        `Failed to unshelve file: ${message}`,
      );
      return { success: false };
    }
  });

  // ─── IDEA Shelf Handlers ────────────────────────────────────────────

  messageRouter.handle("getIdeaShelves", async () => {
    if (!gitService) return NOT_GIT_REPO;
    return gitService.getIdeaShelves();
  });

  messageRouter.handle("ideaShelveChanges", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const message = params.message as string | undefined;
    const filePaths = params.filePaths as string[] | undefined;
    await gitService.ideaShelveChanges(message ?? "", filePaths);
    messageRouter.broadcastEvent("commitStateChanged", {});
    return { success: true };
  });

  messageRouter.handle("ideaUnshelveChanges", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const shelfName = params.shelfName as string;
    const drop = (params.drop as boolean) ?? true;
    await gitService.ideaUnshelveChanges(shelfName, drop);
    messageRouter.broadcastEvent("commitStateChanged", {});
    return { success: true };
  });

  messageRouter.handle("deleteIdeaShelf", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const shelfName = params.shelfName as string;
    const choice = await vscode.window.showWarningMessage(
      `Delete shelf "${shelfName}"? This cannot be undone.`,
      { modal: true },
      "Delete",
    );
    if (choice !== "Delete") return { success: false };
    await gitService.deleteIdeaShelf(shelfName);
    messageRouter.broadcastEvent("commitStateChanged", {});
    return { success: true };
  });

  messageRouter.handle("showIdeaShelfFileDiff", async (params) => {
    if (!gitService || !workspaceRoot) return NOT_GIT_REPO;
    const shelfName = params.shelfName as string;
    const filePath = params.filePath as string;

    const patchFile = `${workspaceRoot}/.idea/shelf/${shelfName}/shelved.patch`;
    try {
      const patchContent = await nodefs.readFile(patchFile, "utf-8");

      // Parse IDEA patch format to extract base content and modified content
      const { baseContent, modifiedContent } = parseIdeaPatchForFile(
        patchContent,
        filePath,
      );

      // Create virtual documents for both sides and show diff
      const baseUri = vscode.Uri.parse(
        `${GIT_BRAINS_SCHEME}:shelved/${shelfName}/${filePath}?ref=base`,
      );
      const modifiedUri = vscode.Uri.parse(
        `${GIT_BRAINS_SCHEME}:shelved/${shelfName}/${filePath}?ref=modified`,
      );

      // Register temporary content for these URIs
      shelfDiffContent.set(baseUri.toString(), baseContent);
      shelfDiffContent.set(modifiedUri.toString(), modifiedContent);

      await vscode.commands.executeCommand(
        "vscode.diff",
        baseUri,
        modifiedUri,
        `${filePath.split("/").pop()} (Shelved in ${shelfName})`,
      );
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      void vscode.window.showErrorMessage(
        `Could not show diff for "${filePath}": ${msg}`,
      );
      return { success: false };
    }
  });

  messageRouter.handle("createPatchFromShelf", async (params) => {
    if (!gitService || !workspaceRoot) return NOT_GIT_REPO;
    const shelfName = params.shelfName as string;
    const patchFile = `${workspaceRoot}/.idea/shelf/${shelfName}/shelved.patch`;

    // Ask user where to save the patch
    const saveUri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`${workspaceRoot}/${shelfName}.patch`),
      filters: { "Patch files": ["patch", "diff"], "All files": ["*"] },
      title: "Save Patch File",
    });

    if (!saveUri) return { success: false };

    try {
      const patchContent = await nodefs.readFile(patchFile, "utf-8");
      await nodefs.writeFile(saveUri.fsPath, patchContent, "utf-8");
      void vscode.window.showInformationMessage(
        `Patch saved to ${saveUri.fsPath}`,
      );
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      void vscode.window.showErrorMessage(`Failed to create patch: ${msg}`);
      return { success: false };
    }
  });

  messageRouter.handle("copyShelfPatchToClipboard", async (params) => {
    if (!gitService || !workspaceRoot) return NOT_GIT_REPO;
    const shelfName = params.shelfName as string;
    const patchFile = `${workspaceRoot}/.idea/shelf/${shelfName}/shelved.patch`;

    try {
      const patchContent = await nodefs.readFile(patchFile, "utf-8");
      await vscode.env.clipboard.writeText(patchContent);
      void vscode.window.showInformationMessage("Patch copied to clipboard");
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      void vscode.window.showErrorMessage(`Failed to copy patch: ${msg}`);
      return { success: false };
    }
  });

  messageRouter.handle("importPatches", async () => {
    if (!gitService || !workspaceRoot) return NOT_GIT_REPO;

    // Ask user to select patch files
    const fileUris = await vscode.window.showOpenDialog({
      canSelectMany: true,
      filters: { "Patch files": ["patch", "diff"], "All files": ["*"] },
      title: "Import Patch Files",
    });

    if (!fileUris || fileUris.length === 0) return { success: false };

    try {
      for (const uri of fileUris) {
        const patchContent = await nodefs.readFile(uri.fsPath, "utf-8");

        // Create a shelf entry from the imported patch
        const fileName = uri.fsPath.split("/").pop() ?? "Imported";
        const shelfName = fileName.replace(/\.(patch|diff)$/, "");
        await gitService.importPatchAsShelf(shelfName, patchContent);
      }

      messageRouter.broadcastEvent("commitStateChanged", {});
      void vscode.window.showInformationMessage(
        `Imported ${fileUris.length} patch${fileUris.length > 1 ? "es" : ""}`,
      );
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      void vscode.window.showErrorMessage(`Failed to import patches: ${msg}`);
      return { success: false };
    }
  });

  messageRouter.handle("importPatchFromClipboard", async () => {
    if (!gitService || !workspaceRoot) return NOT_GIT_REPO;

    try {
      const clipboardContent = await vscode.env.clipboard.readText();
      if (!clipboardContent || !clipboardContent.trim()) {
        void vscode.window.showWarningMessage(
          "Clipboard is empty or does not contain patch content.",
        );
        return { success: false };
      }

      // Validate it looks like a patch
      if (
        !clipboardContent.includes("diff ") &&
        !clipboardContent.includes("---") &&
        !clipboardContent.includes("@@")
      ) {
        void vscode.window.showWarningMessage(
          "Clipboard content does not appear to be a valid patch.",
        );
        return { success: false };
      }

      const shelfName = `Clipboard patch ${new Date().toLocaleString()}`;
      await gitService.importPatchAsShelf(shelfName, clipboardContent);

      messageRouter.broadcastEvent("commitStateChanged", {});
      void vscode.window.showInformationMessage(
        "Imported patch from clipboard as shelf entry.",
      );
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      void vscode.window.showErrorMessage(
        `Failed to import patch from clipboard: ${msg}`,
      );
      return { success: false };
    }
  });

  // ─── Branch Sidebar Actions ─────────────────────────────────────────

  messageRouter.handle("createBranchPrompt", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const name = params.branchName as string | undefined;
    const checkout = params.checkout as boolean | undefined;
    const force = params.force as boolean | undefined;
    if (!name) return { success: false };
    return withProgress(messageRouter, async () => {
      await gitService.createBranch(name, "HEAD", force ?? false);
      if (checkout) {
        await gitService.checkout(name);
      }
      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      return { success: true };
    });
  });

  messageRouter.handle("deleteBranchPrompt", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const branchName = params.branchName as string;
    if (!branchName) return { success: false };
    const confirm = await vscode.window.showWarningMessage(
      `Delete branch "${branchName}"?`,
      { modal: true },
      "Delete",
    );
    if (confirm !== "Delete") return { success: false };
    return withProgress(messageRouter, async () => {
      await gitService.deleteBranch(branchName);
      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      return { success: true };
    });
  });

  messageRouter.handle("compareWithCurrent", async (params) => {
    if (!gitService) return NOT_GIT_REPO;
    const branchName = params.branchName as string;
    if (!branchName) return { success: false };
    // Use VS Code's built-in git diff between current branch and selected
    const currentBranch = await gitService.getCurrentBranch();
    void vscode.commands.executeCommand(
      "vscode.diff",
      vscode.Uri.parse(`git-brains:${currentBranch}`),
      vscode.Uri.parse(`git-brains:${branchName}`),
      `${currentBranch} ↔ ${branchName}`,
    );
    return { success: true };
  });

  messageRouter.handle("showMyBranches", async () => {
    // Filter branches by current git user
    if (!gitService) return NOT_GIT_REPO;
    void vscode.window.showInformationMessage(
      "Show My Branches: filter applied in branch tree",
    );
    return { success: true };
  });

  messageRouter.handle("fetchAll", async () => {
    if (!gitService) return NOT_GIT_REPO;
    return withProgress(messageRouter, async () => {
      await gitService.fetch();
      gitService.invalidateCache();
      messageRouter.broadcastEvent("gitStateChanged", { scope: "all" });
      return { success: true };
    });
  });

  messageRouter.handle("toggleFavorite", async (params) => {
    const branchName = params.branchName as string;
    // Favorites are a UI-only concept, handled in webview state
    void vscode.window.showInformationMessage(
      `Toggled favorite: ${branchName}`,
    );
    return { success: true };
  });

  messageRouter.handle("navigateToHead", async (params) => {
    const branchName = params.branchName as string;
    if (!branchName) return { success: false };
    // Broadcast event to scroll git log to this branch's head commit
    messageRouter.broadcastEvent("gitStateChanged", {
      scope: "navigateToHead",
      branch: branchName,
    });
    return { success: true };
  });

  messageRouter.handle("toggleBranchGroupByDirectory", async () => {
    // This is a UI-only toggle, handled in webview state
    return { success: true };
  });

  messageRouter.handle("setSingleClickAction", async () => {
    // UI preference, handled in webview state
    return { success: true };
  });

  messageRouter.handle("toggleShowTags", async () => {
    // UI preference, handled in webview state
    return { success: true };
  });

  // 7. GitWatcher (only if GitService is available)
  if (gitService && workspaceRoot) {
    const watcher = new GitWatcher(
      workspaceRoot,
      messageRouter,
      gitService.cache,
    );
    context.subscriptions.push(watcher);
  }

  // 8. Status bar item to quickly open the panel
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );
  statusBarItem.text = "$(git-branch) IDEA Git";
  statusBarItem.tooltip = "Open IDEA Git Graph Panel";
  statusBarItem.command = "git-brains.gitLog.focus";
  statusBarItem.show();
  context.subscriptions.push(statusBarItem);
}

function extToLanguage(ext: string): string {
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescriptreact",
    js: "javascript",
    jsx: "javascriptreact",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    c: "c",
    cpp: "cpp",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    css: "css",
    scss: "scss",
    less: "less",
    html: "html",
    xml: "xml",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sql: "sql",
    sh: "shellscript",
    bash: "shellscript",
    toml: "toml",
    ini: "ini",
    vue: "vue",
    svelte: "svelte",
  };
  return map[ext.toLowerCase()] ?? "plaintext";
}

export function deactivate() {}

/**
 * Extract the patch section for a specific file from a combined patch.
 * Handles IDEA format (Index: path) and standard git format (diff --git).
 */
function _extractFilePatch(
  patchContent: string,
  filePath: string,
): string | null {
  const lines = patchContent.split("\n");
  let collecting = false;
  const result: string[] = [];

  for (const line of lines) {
    // IDEA format: "Index: <path>"
    if (line.startsWith("Index: ")) {
      if (collecting) break;
      const indexPath = line.substring(7).trim();
      if (indexPath === filePath) {
        collecting = true;
        result.push(line);
      }
      continue;
    }

    // Standard git format: "diff --git a/<path> b/<path>"
    if (line.startsWith("diff --git ")) {
      if (collecting && result.length > 1) {
        // Already collecting from Index: line, this is part of same section
        result.push(line);
        continue;
      }
      if (collecting) break;
      if (line.includes(`a/${filePath}`) || line.includes(`b/${filePath}`)) {
        collecting = true;
        result.push(line);
      }
      continue;
    }

    if (collecting) {
      result.push(line);
    }
  }

  return result.length > 0 ? result.join("\n") : null;
}

/**
 * Parse IDEA patch format to extract base and modified content for a specific file.
 * IDEA patches have:
 * - BaseRevisionTextPatchEP section with <+> containing the original file (escaped)
 * - Standard unified diff section
 */
function parseIdeaPatchForFile(
  patchContent: string,
  filePath: string,
): { baseContent: string; modifiedContent: string } {
  const lines = patchContent.split("\n");
  let inTargetFile = false;
  let inBaseRevision = false;
  let baseContentEscaped = "";
  const diffLines: string[] = [];
  let inDiff = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect file section start
    if (line.startsWith("Index: ")) {
      if (inTargetFile) break; // hit next file
      const indexPath = line.substring(7).trim();
      if (indexPath === filePath) {
        inTargetFile = true;
      }
      continue;
    }

    if (!inTargetFile) continue;

    // Detect BaseRevisionTextPatchEP section
    if (
      line.includes(
        "com.intellij.openapi.diff.impl.patch.BaseRevisionTextPatchEP",
      )
    ) {
      inBaseRevision = true;
      continue;
    }

    // Collect base content (starts with <+>)
    if (inBaseRevision && line.startsWith("<+>")) {
      baseContentEscaped = line.substring(3);
      inBaseRevision = false;
      continue;
    }

    // Skip charset info
    if (line.includes("CharsetEP")) {
      // Next line will be <+>UTF-8 or similar, skip it
      if (i + 1 < lines.length && lines[i + 1].startsWith("<+>")) {
        i++;
      }
      continue;
    }

    // Detect diff start
    if (line.startsWith("--- ") && !inDiff) {
      inDiff = true;
      diffLines.push(line);
      continue;
    }

    if (inDiff) {
      diffLines.push(line);
    }
  }

  // Unescape base content (IDEA uses \n for newlines, \t for tabs in the <+> section)
  const baseContent = baseContentEscaped
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\\\/g, "\\");

  // Apply unified diff to base content to get modified content
  const modifiedContent = applyUnifiedDiff(baseContent, diffLines);

  return { baseContent, modifiedContent };
}

/**
 * Apply a unified diff to base content to produce modified content.
 */
function applyUnifiedDiff(baseContent: string, diffLines: string[]): string {
  if (diffLines.length === 0) return baseContent;

  const baseLines = baseContent.split("\n");
  const result: string[] = [];
  let baseIdx = 0;

  for (let i = 0; i < diffLines.length; i++) {
    const line = diffLines[i];

    // Parse hunk header: @@ -start,count +start,count @@
    const hunkMatch = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      const oldStart = Number.parseInt(hunkMatch[1], 10) - 1; // 0-indexed

      // Copy lines before this hunk
      while (baseIdx < oldStart) {
        result.push(baseLines[baseIdx]);
        baseIdx++;
      }

      // Process hunk lines
      for (let j = i + 1; j < diffLines.length; j++) {
        const hunkLine = diffLines[j];
        if (
          hunkLine.startsWith("@@") ||
          hunkLine.startsWith("diff ") ||
          hunkLine.startsWith("Index: ")
        ) {
          i = j - 1;
          break;
        }
        if (hunkLine.startsWith("-")) {
          // Removed line — skip in base
          baseIdx++;
        } else if (hunkLine.startsWith("+")) {
          // Added line
          result.push(hunkLine.substring(1));
        } else if (hunkLine.startsWith(" ")) {
          // Context line
          result.push(hunkLine.substring(1));
          baseIdx++;
        } else {
          // End of diff or no-newline marker
          if (hunkLine.startsWith("\\ No newline")) continue;
          i = j - 1;
          break;
        }
        if (j === diffLines.length - 1) {
          i = j;
        }
      }
      continue;
    }

    // Skip --- and +++ lines
    if (line.startsWith("--- ") || line.startsWith("+++ ")) continue;
  }

  // Copy remaining base lines
  while (baseIdx < baseLines.length) {
    result.push(baseLines[baseIdx]);
    baseIdx++;
  }

  return result.join("\n");
}

function getScmResourcePath(arg?: unknown): string | undefined {
  const value = arg as unknown;
  let uri: vscode.Uri | undefined;
  if (value instanceof vscode.Uri) {
    uri = value;
  } else if (value && typeof value === "object") {
    if ("resourceUri" in value) {
      uri = (value as { resourceUri?: vscode.Uri }).resourceUri;
    } else if ("sourceUri" in value) {
      uri = (value as { sourceUri?: vscode.Uri }).sourceUri;
    }
  }
  if (!uri) return undefined;

  return vscode.workspace.asRelativePath(uri, false);
}
