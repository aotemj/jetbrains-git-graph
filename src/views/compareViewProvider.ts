import * as vscode from "vscode";
import type { MessageRouter } from "../messages/messageRouter";
import { getWebviewHtml } from "./html";

export class CompareViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "git-brains.compareWithLocal";

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly messageRouter: MessageRouter,
  ) {}

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken,
  ): void {
    const webview = webviewView.webview;

    webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "dist")],
    };

    webview.html = getWebviewHtml(webview, this.extensionUri, "compare");

    const routerDisposable = this.messageRouter.registerWebview(webview);
    webviewView.onDidDispose(() => routerDisposable.dispose());
  }
}
