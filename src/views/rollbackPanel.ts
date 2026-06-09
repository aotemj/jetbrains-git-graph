import * as vscode from "vscode";
import type { MessageRouter } from "../messages/messageRouter";
import { getWebviewHtml } from "./html";

export interface RollbackFileInfo {
  path: string;
  status: string;
  staged: boolean;
}

/**
 * Opens a "Rollback Changes" webview panel in an editor tab,
 * similar to IntelliJ IDEA's rollback dialog.
 */
export class RollbackPanel {
  private panel: vscode.WebviewPanel | undefined;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly messageRouter: MessageRouter,
  ) {}

  open(files: RollbackFileInfo[]): void {
    const filesJson = JSON.stringify(files);

    if (this.panel) {
      this.panel.reveal();
      // Re-send init data with updated file list
      this.panel.webview.postMessage({
        type: "event",
        event: "rollbackPanelInit",
        data: { files },
      });
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      "git-brains.rollbackPanel",
      "Rollback Changes",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "dist")],
        retainContextWhenHidden: false,
      },
    );

    this.panel.webview.html = getWebviewHtml(
      this.panel.webview,
      this.extensionUri,
      "rollback",
      { files: filesJson },
    );

    const routerDisposable = this.messageRouter.registerWebview(
      this.panel.webview,
    );

    this.panel.onDidDispose(() => {
      routerDisposable.dispose();
      this.panel = undefined;
    });
  }

  close(): void {
    this.panel?.dispose();
  }
}
