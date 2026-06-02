import { Allotment } from "allotment";
import { CommitDetail } from "./CommitDetail";
import { FileChangeTree } from "./FileChangeTree";

export function DetailPanel() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <Allotment vertical>
        <Allotment.Pane minSize={60} preferredSize="40%">
          <div style={{ height: "100%", overflow: "hidden" }}>
            <FileChangeTree />
          </div>
        </Allotment.Pane>
        <Allotment.Pane minSize={60}>
          <div style={{ height: "100%", overflow: "auto" }}>
            <CommitDetail />
          </div>
        </Allotment.Pane>
      </Allotment>
    </div>
  );
}
