import { useEffect } from "react";
import { useCommitStore } from "../shared/store/commit-store";
import { CommitTab } from "./components/CommitTab";
import { IdeaShelfTab } from "./components/IdeaShelfTab";
import { ShelfTab } from "./components/ShelfTab";
import "./commit.css";

function ProgressBar({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="commit-progress-bar">
      <div className="commit-progress-bar-inner" />
    </div>
  );
}

export function CommitApp() {
  const {
    activeTab,
    setActiveTab,
    loading,
    fetchChanges,
    fetchShelves,
    fetchIdeaShelves,
  } = useCommitStore();

  useEffect(() => {
    fetchChanges();
    fetchShelves();
    fetchIdeaShelves();
  }, [fetchChanges, fetchShelves, fetchIdeaShelves]);

  return (
    <div className="commit-app">
      <div className="commit-tabs">
        <button
          type="button"
          className={`commit-tab ${activeTab === "commit" ? "active" : ""}`}
          onClick={() => setActiveTab("commit")}
        >
          Commit
        </button>
        <button
          type="button"
          className={`commit-tab ${activeTab === "shelf" ? "active" : ""}`}
          onClick={() => setActiveTab("shelf")}
        >
          Shelf
        </button>
        <button
          type="button"
          className={`commit-tab ${activeTab === "stash" ? "active" : ""}`}
          onClick={() => setActiveTab("stash")}
        >
          Stash
        </button>
      </div>
      <ProgressBar visible={loading} />
      <div className="commit-content">
        {activeTab === "commit" && <CommitTab />}
        {activeTab === "shelf" && <IdeaShelfTab />}
        {activeTab === "stash" && <ShelfTab />}
      </div>
    </div>
  );
}
