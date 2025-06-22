import * as vscode from "vscode";
import * as path from "path";

export class Logger implements vscode.Disposable {
  private outputChannel: vscode.OutputChannel;
  private logFileUri: vscode.Uri | undefined;
  private logs: string[] = [];

  constructor(context: vscode.ExtensionContext) {
    this.outputChannel = vscode.window.createOutputChannel("Code2Markdown");
    context.subscriptions.push(this.outputChannel);
  }

  public log(message: string, level: "INFO" | "WARN" | "ERROR" = "INFO", showInOutput: boolean = false): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level}] ${message}`;
    this.logs.push(logEntry);
    if (showInOutput) {
      this.outputChannel.appendLine(logEntry);
    }
  }

  public logIgnoredItems(ignored: string[]): void {
    if (!ignored || ignored.length === 0) {
      this.log("No files or folders were ignored based on the ignore settings.", "INFO");
      return;
    }
    this.log(
      `Ignored files/folders based on ignore settings:\n${ignored.map((p) => `- ${this.sanitizePath(p)}`).join("\n")}`,
      "INFO"
    );
  }

  public getWorkspaceFolderOrWarn(): vscode.WorkspaceFolder | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      this.log("Warning: No workspace folder found.", "WARN");
      return undefined;
    }
    return folders[0];
  }

  public getFileTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const hours = now.getHours() % 12 || 12;
    const ampm = now.getHours() >= 12 ? "PM" : "AM";
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(hours)}${pad(now.getMinutes())}${ampm}`;
  }

  private sanitizePath(filePath: string): string {
    const folder = this.getWorkspaceFolderOrWarn();
    if (folder) {
      return path.relative(folder.uri.fsPath, filePath).replace(/\\/g, "/");
    }
    return filePath;
  }

  public async flushLogs(): Promise<vscode.Uri> {
    if (!this.logFileUri) {
      const folder = this.getWorkspaceFolderOrWarn();
      if (!folder) {
        throw new Error("No workspace folder found to save logs.");
      }
      const logDir = vscode.Uri.joinPath(folder.uri, "codereview");
      await vscode.workspace.fs.createDirectory(logDir);
      this.logFileUri = vscode.Uri.joinPath(logDir, `${this.getFileTimestamp()}_code2md_v01.log`);
    }
    const logContent = this.logs.join("\n");
    await vscode.workspace.fs.writeFile(this.logFileUri, Buffer.from(logContent, "utf8"));
    return this.logFileUri;
  }

  public dispose(): void {
    this.flushLogs().catch(err => console.error("Error flushing logs:", err));
    this.outputChannel.dispose();
  }
}