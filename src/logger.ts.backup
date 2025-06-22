// src/logger.ts
import * as vscode from "vscode";
import * as path from "path";
import { promises as fsp } from "fs";
import { sanitizePath } from "./utils";

/**
 * A robust logging utility for VS Code extensions.
 * Handles logging to VS Code's Output Channel, debug console, and a persistent file.
 */
export class Logger implements vscode.Disposable {
  private outputChannel: vscode.OutputChannel;
  private logBuffer: string[] = [];
  private logFilePath: string | undefined;
  private bufferFlushThreshold: number = 100;

  constructor(channelName: string) {
    this.outputChannel = vscode.window.createOutputChannel(channelName);
  }

  /**
   * Gets the first workspace folder, or returns undefined if none is open.
   * Making this public so other parts of the extension can use it for file path resolution.
   */
  public getWorkspaceFolderOrWarn(): vscode.WorkspaceFolder | undefined {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
      console.error(
        "[code2md Logger] No workspace folder open. Log files may be saved in extension directory.",
      );
      return undefined;
    }
    return folders[0];
  }

  /**
   * Returns a timestamp formatted as YYYY-MM-DD_HHMMAM/PM.
   * Ideal for filenames to ensure uniqueness and human readability.
   * Making this public as it's used by `getOutputPath`.
   */
  public getFileTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");

    let hours = now.getHours();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;

    return (
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
      `_${pad(hours)}${pad(now.getMinutes())}${ampm}`
    );
  }

  /**
   * Returns a timestamp in ISO 8601 format (e.g., "2025-06-10T10:25:50.000Z").
   * Ideal for log entry consistency and machine readability.
   */
  private getLogEntryTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Makes an absolute file path relative to the workspace, or returns just the basename.
   */
  public sanitizePath(p: string): string {
    const folder = this.getWorkspaceFolderOrWarn();
    return sanitizePath(p);
  }

  /**
   * Appends a timestamped message to the in-memory log buffer, VS Code Output channel, and console.
   * Automatically flushes to disk when the buffer threshold is reached.
   * @param message The log message.
   * @param level The log level (e.g., 'INFO', 'WARN', 'ERROR').
   * @param showChannel Whether to automatically show the output channel. Defaults to false.
   */
  public log(
    message: string,
    level: "INFO" | "WARN" | "ERROR" = "INFO",
    showChannel: boolean = false,
  ): void {
    const timestamped = `[${this.getLogEntryTimestamp()}] [${level}] ${message}`;

    this.logBuffer.push(timestamped);
    this.outputChannel.appendLine(timestamped);
    console.log(timestamped);

    if (showChannel) {
      this.outputChannel.show(true);
    }

    if (this.logBuffer.length >= this.bufferFlushThreshold) {
      this.flushLogs().catch((err) => {
        console.error(`Logger: Failed to auto-flush logs: ${err}`);
        vscode.window.showErrorMessage(
          `[code2md] Failed to auto-save logs: ${err.message}`,
        );
      });
    }
  }

  /**
   * Initializes the log file path and writes a start message.
   * This should typically be called once during activation.
   */
  public async initializeLogFile(): Promise<void> {
    if (this.logFilePath) {
      await this.flushLogs();
      this.logFilePath = undefined;
    }

    const folder = this.getWorkspaceFolderOrWarn();
    const base = folder?.uri.fsPath || path.join(__dirname, "..");
    const codereviewDir = path.join(base, "codereview");
    await fsp.mkdir(codereviewDir, { recursive: true });

    const projectName = folder?.name || "CodeExport";
    const timestamp = this.getFileTimestamp();
    this.logFilePath = path.join(
      codereviewDir,
      `${timestamp}_${projectName}_v01.log`,
    );

    await fsp.writeFile(
      this.logFilePath,
      `[code2md] Log Start - ${this.getLogEntryTimestamp()}\n\n`,
      "utf8",
    );
    this.log(
      `Log file initialized at: ${this.sanitizePath(this.logFilePath)}`,
      "INFO",
      false,
    );
  }

  /**
   * Persists the accumulated log buffer to disk, then clears the buffer.
   */
  public async flushLogs(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    if (!this.logFilePath) {
      await this.initializeLogFile();
    }

    if (!this.logFilePath) {
      this.log(
        "Cannot flush logs: logFilePath is not set and could not be initialized.",
        "ERROR",
        true,
      );
      return;
    }

    try {
      await fsp.appendFile(
        this.logFilePath,
        this.logBuffer.join("\n") + "\n",
        "utf8",
      );
      this.logBuffer = [];
    } catch (error) {
      this.log(
        `Failed to write logs to ${this.logFilePath}: ${error}`,
        "ERROR",
        true,
      );
      throw error;
    }
  }

  /**
   * Clears the VS Code output channel content.
   */
  public clearOutputChannel(): void {
    this.outputChannel.clear();
  }

  /**
   * Shows the VS Code output channel.
   * @param preserveFocus If true, keeps focus on the active editor.
   */
  public showOutputChannel(preserveFocus: boolean = false): void {
    this.outputChannel.show(preserveFocus);
  }

  /**
   * Logs a list of ignored files or folders based on ignore settings.
   * @param ignored Array of file or folder paths that were ignored.
   */
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

  /**
   * Disposes the output channel. Call this during extension deactivation.
   */
  public dispose(): void {
    this.flushLogs()
      .catch((err) => {
        console.error(`Logger: Error flushing logs during dispose: ${err}`);
      })
      .finally(() => {
        this.outputChannel.dispose();
      });
  }
}
