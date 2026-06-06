import { create } from "zustand";
import { bridge } from "../bridge";

export interface WorkingTreeFile {
  path: string;
  oldPath?: string;
  status:
    | "added"
    | "modified"
    | "deleted"
    | "renamed"
    | "untracked"
    | "conflicted";
  staged: boolean;
}

export interface ShelveEntry {
  id: string;
  message: string;
  date: string;
  branch: string;
  files: string[];
}

export interface IdeaShelfEntry {
  name: string;
  description: string;
  date: string;
  patchPath: string;
  files: string[];
}

type TabType = "commit" | "shelf" | "stash";

interface CommitStore {
  // File changes
  changes: WorkingTreeFile[];
  selectedFiles: Set<string>;
  /** Files highlighted via click/Cmd+click (for context menu operations) */
  highlightedFiles: Set<string>;

  // Commit state
  commitMessage: string;
  amend: boolean;

  // Shelf
  shelves: ShelveEntry[];

  // IDEA Shelf
  ideaShelves: IdeaShelfEntry[];

  // UI state
  activeTab: TabType;
  loading: boolean;
  expandedGroups: Set<string>;
  groupByDirectory: boolean;
  showUnversioned: boolean;
  /** Collapsed directory paths in tree view */
  collapsedDirs: Set<string>;

  // Actions
  fetchChanges: () => Promise<void>;
  fetchShelves: () => Promise<void>;
  setCommitMessage: (msg: string) => void;
  setAmend: (amend: boolean) => void;
  toggleFileSelection: (filePath: string) => void;
  setFileKeys: (keys: string[], selected: boolean) => void;
  selectAllFiles: () => void;
  deselectAllFiles: () => void;
  highlightFile: (key: string, mode: "single" | "toggle") => void;
  stageFile: (filePath: string) => Promise<void>;
  unstageFile: (filePath: string) => Promise<void>;
  stageAll: () => Promise<void>;
  unstageAll: () => Promise<void>;
  commit: () => Promise<boolean>;
  commitAndPush: () => Promise<boolean>;
  rollbackFile: (filePath: string) => Promise<void>;
  showDiff: (filePath: string, staged?: boolean) => Promise<void>;
  shelveChanges: (message?: string, filePaths?: string[]) => Promise<void>;
  unshelveChanges: (stashId: string, drop?: boolean) => Promise<void>;
  deleteShelve: (stashId: string) => Promise<void>;
  fetchIdeaShelves: () => Promise<void>;
  ideaShelveChanges: (message?: string, filePaths?: string[]) => Promise<void>;
  ideaUnshelveChanges: (shelfName: string, drop?: boolean) => Promise<void>;
  deleteIdeaShelf: (shelfName: string) => Promise<void>;
  setActiveTab: (tab: TabType) => void;
  toggleGroup: (group: string) => void;
  toggleDir: (dirPath: string) => void;
  expandAllDirs: () => void;
  collapseAllDirs: (allDirPaths: string[]) => void;
  toggleGroupByDirectory: () => void;
  toggleShowUnversioned: () => void;
  refresh: () => Promise<void>;
}

export const useCommitStore = create<CommitStore>((set, get) => ({
  changes: [],
  selectedFiles: new Set<string>(),
  highlightedFiles: new Set<string>(),
  commitMessage: "",
  amend: false,
  shelves: [],
  ideaShelves: [],
  activeTab: "commit",
  loading: false,
  expandedGroups: new Set(["changes", "unversioned", "staged"]),
  groupByDirectory: true,
  showUnversioned: true,
  collapsedDirs: new Set<string>(),

  async fetchChanges() {
    set({ loading: true });
    const start = Date.now();
    try {
      const result = (await bridge.request(
        "getWorkingTreeChanges",
      )) as WorkingTreeFile[];
      if (Array.isArray(result)) {
        const newPaths = new Set(result.map((f) => `${f.path}:${f.staged}`));
        const { selectedFiles, changes } = get();
        if (changes.length === 0) {
          // First load — no auto-selection (user manually selects files)
          set({ changes: result, selectedFiles: new Set<string>() });
        } else {
          // Refresh — preserve user's selection state (only keep existing selections)
          const preserved = new Set<string>();
          for (const p of selectedFiles) {
            if (newPaths.has(p)) preserved.add(p);
          }
          set({ changes: result, selectedFiles: preserved });
        }
      }
    } catch (err) {
      console.error("fetchChanges failed:", err);
    } finally {
      // Ensure loading bar is visible for at least 300ms
      const elapsed = Date.now() - start;
      if (elapsed < 300) {
        await new Promise((r) => setTimeout(r, 300 - elapsed));
      }
      set({ loading: false });
    }
  },

  async fetchShelves() {
    try {
      const result = (await bridge.request("getShelves")) as ShelveEntry[];
      if (Array.isArray(result)) {
        set({ shelves: result });
      }
    } catch (err) {
      console.error("fetchShelves failed:", err);
    }
  },

  setCommitMessage(msg: string) {
    set({ commitMessage: msg });
  },

  setAmend(amend: boolean) {
    set({ amend });
    if (amend) {
      // Load last commit message
      void (async () => {
        try {
          const result = (await bridge.request("getAmendMessage")) as {
            message: string;
          };
          if (result?.message) {
            set({ commitMessage: result.message });
          }
        } catch {
          // ignore
        }
      })();
    }
  },

  toggleFileSelection(key: string) {
    const { selectedFiles } = get();
    const next = new Set(selectedFiles);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    set({ selectedFiles: next });
  },

  setFileKeys(keys: string[], selected: boolean) {
    const { selectedFiles } = get();
    const next = new Set(selectedFiles);
    for (const key of keys) {
      if (selected) {
        next.add(key);
      } else {
        next.delete(key);
      }
    }
    set({ selectedFiles: next });
  },

  selectAllFiles() {
    const { changes } = get();
    const allPaths = new Set(changes.map((f) => `${f.path}:${f.staged}`));
    set({ selectedFiles: allPaths });
  },

  deselectAllFiles() {
    set({ selectedFiles: new Set() });
  },

  highlightFile(key: string, mode: "single" | "toggle") {
    const { highlightedFiles } = get();
    if (mode === "single") {
      set({ highlightedFiles: new Set([key]) });
    } else {
      // toggle (Cmd+click)
      const next = new Set(highlightedFiles);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      set({ highlightedFiles: next });
    }
  },

  async stageFile(filePath: string) {
    try {
      await bridge.request("stageFile", { filePath });
      await get().fetchChanges();
    } catch (err) {
      console.error("stageFile failed:", err);
    }
  },

  async unstageFile(filePath: string) {
    try {
      await bridge.request("unstageFile", { filePath });
      await get().fetchChanges();
    } catch (err) {
      console.error("unstageFile failed:", err);
    }
  },

  async stageAll() {
    try {
      await bridge.request("stageAll");
      await get().fetchChanges();
    } catch (err) {
      console.error("stageAll failed:", err);
    }
  },

  async unstageAll() {
    try {
      await bridge.request("unstageAll");
      await get().fetchChanges();
    } catch (err) {
      console.error("unstageAll failed:", err);
    }
  },

  async commit() {
    const { commitMessage, amend, changes, selectedFiles } = get();
    if (!commitMessage.trim()) return false;

    // Get selected file paths (only unstaged ones need to be staged)
    const filesToStage = changes
      .filter((f) => !f.staged && selectedFiles.has(`${f.path}:${f.staged}`))
      .map((f) => f.path);

    try {
      set({ loading: true });
      await bridge.request("commitChanges", {
        message: commitMessage,
        amend,
        filePaths: filesToStage,
      });
      set({ commitMessage: "", amend: false });
      await get().fetchChanges();
      return true;
    } catch (err) {
      console.error("commit failed:", err);
      return false;
    } finally {
      set({ loading: false });
    }
  },

  async commitAndPush() {
    const { commitMessage, amend, changes, selectedFiles } = get();
    if (!commitMessage.trim()) return false;

    const filesToStage = changes
      .filter((f) => !f.staged && selectedFiles.has(`${f.path}:${f.staged}`))
      .map((f) => f.path);

    try {
      set({ loading: true });
      await bridge.request("commitAndPush", {
        message: commitMessage,
        amend,
        filePaths: filesToStage,
      });
      set({ commitMessage: "", amend: false });
      await get().fetchChanges();
      return true;
    } catch (err) {
      console.error("commitAndPush failed:", err);
      return false;
    } finally {
      set({ loading: false });
    }
  },

  async rollbackFile(filePath: string) {
    try {
      await bridge.request("rollbackFile", { filePath });
      await get().fetchChanges();
    } catch (err) {
      console.error("rollbackFile failed:", err);
    }
  },

  async showDiff(filePath: string, staged?: boolean) {
    try {
      await bridge.request("showDiffForWorkingFile", { filePath, staged });
    } catch (err) {
      console.error("showDiff failed:", err);
    }
  },

  async shelveChanges(message?: string, filePaths?: string[]) {
    try {
      set({ loading: true });
      await bridge.request("shelveChanges", { message, filePaths });
      await get().fetchChanges();
      await get().fetchShelves();
    } catch (err) {
      console.error("shelveChanges failed:", err);
    } finally {
      set({ loading: false });
    }
  },

  async unshelveChanges(stashId: string, drop = true) {
    try {
      set({ loading: true });
      await bridge.request("unshelveChanges", { stashId, drop });
      await get().fetchChanges();
      await get().fetchShelves();
    } catch (err) {
      console.error("unshelveChanges failed:", err);
    } finally {
      set({ loading: false });
    }
  },

  async deleteShelve(stashId: string) {
    try {
      await bridge.request("deleteShelve", { stashId });
      await get().fetchShelves();
    } catch (err) {
      console.error("deleteShelve failed:", err);
    }
  },

  async fetchIdeaShelves() {
    try {
      const result = (await bridge.request(
        "getIdeaShelves",
      )) as IdeaShelfEntry[];
      if (Array.isArray(result)) {
        set({ ideaShelves: result });
      }
    } catch (err) {
      console.error("fetchIdeaShelves failed:", err);
    }
  },

  async ideaShelveChanges(message?: string, filePaths?: string[]) {
    try {
      set({ loading: true });
      await bridge.request("ideaShelveChanges", { message, filePaths });
      await get().fetchChanges();
      await get().fetchIdeaShelves();
    } catch (err) {
      console.error("ideaShelveChanges failed:", err);
    } finally {
      set({ loading: false });
    }
  },

  async ideaUnshelveChanges(shelfName: string, drop = true) {
    try {
      set({ loading: true });
      await bridge.request("ideaUnshelveChanges", { shelfName, drop });
      await get().fetchChanges();
      await get().fetchIdeaShelves();
    } catch (err) {
      console.error("ideaUnshelveChanges failed:", err);
    } finally {
      set({ loading: false });
    }
  },

  async deleteIdeaShelf(shelfName: string) {
    try {
      await bridge.request("deleteIdeaShelf", { shelfName });
      await get().fetchIdeaShelves();
    } catch (err) {
      console.error("deleteIdeaShelf failed:", err);
    }
  },

  setActiveTab(tab: TabType) {
    set({ activeTab: tab });
    if (tab === "stash") {
      get().fetchShelves();
    } else if (tab === "shelf") {
      get().fetchIdeaShelves();
    }
  },

  toggleGroup(group: string) {
    const { expandedGroups } = get();
    const next = new Set(expandedGroups);
    if (next.has(group)) {
      next.delete(group);
    } else {
      next.add(group);
    }
    set({ expandedGroups: next });
  },

  toggleDir(dirPath: string) {
    const { collapsedDirs } = get();
    const next = new Set(collapsedDirs);
    if (next.has(dirPath)) {
      next.delete(dirPath);
    } else {
      next.add(dirPath);
    }
    set({ collapsedDirs: next });
  },

  expandAllDirs() {
    set({ collapsedDirs: new Set() });
  },

  collapseAllDirs(allDirPaths: string[]) {
    set({ collapsedDirs: new Set(allDirPaths) });
  },

  toggleGroupByDirectory() {
    const next = !get().groupByDirectory;
    // When toggling to directory mode, reset collapsed state so DirectoryTree will collapse all on mount
    if (next) {
      set({ groupByDirectory: true, collapsedDirs: new Set() });
    } else {
      set({ groupByDirectory: false, collapsedDirs: new Set() });
    }
  },

  toggleShowUnversioned() {
    set({ showUnversioned: !get().showUnversioned });
  },

  async refresh() {
    await Promise.all([
      get().fetchChanges(),
      get().fetchShelves(),
      get().fetchIdeaShelves(),
    ]);
  },
}));

// Listen for commit state changes
bridge.onEvent((event) => {
  if (event === "commitStateChanged" || event === "gitStateChanged") {
    useCommitStore.getState().fetchChanges();
    useCommitStore.getState().fetchIdeaShelves();
    useCommitStore.getState().fetchShelves();
  }
});
