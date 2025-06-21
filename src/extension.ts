// src/extension.ts
import * as vscode from "vscode";
import { Logger } from "./logger";
import { setGlobalLogger } from "./utils";
import { DEFAULT_EXTENSIONS } from "./config";
import { getIgnoredFolders } from "./utils";
import { findFilesRecursivelyAsync } from "./fileScanner";
import { generateMarkdown } from "./markdownGenerator";

// Global state
let logger: Logger;
let isCommandRunning = false;

export function activate(context: vscode.ExtensionContext) {
  logger = new Logger("code2md");
  setGlobalLogger(logger);
  context.subscriptions.push(logger);

  logger
    .initializeLogFile()
    .then(() => {
      logger.log("🚀 [code2md] activated", "INFO");
    })
    .catch((err) => {
      console.error("Failed to initialize log file:", err);
      vscode.window.showErrorMessage(
        "Failed to initialize logging for code2md. Check VS Code console.",
      );
    });

  // --- Command: Select files manually ---
  const fromFiles = vscode.commands.registerCommand(
    "code2md.generateMarkdown",
    async () => {
      const files = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectMany: true,
      });
      if (!files?.length) {
        return;
      }
      logger.log(`📂 ${files.length} files selected manually`, "INFO");
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Generating Markdown…",
          cancellable: false,
        },
        async (progress) => {
          const out = await generateMarkdown(files, progress, logger);
          await logger.flushLogs();
          const doc = await vscode.workspace.openTextDocument(out);
          vscode.window.showTextDocument(doc);
        },
      );
    },
  );

  // --- Command: Select folder and enter extensions ---
  const fromFolder = vscode.commands.registerCommand(
    "code2md.generateMarkdownFromFolder",
    async () => {
      const folders = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectMany: false,
      });
      if (!folders?.length) {
        return;
      }

      const defaultExtList = DEFAULT_EXTENSIONS.join(",");
      const input = await vscode.window.showInputBox({
        prompt: "Enter file extensions (comma-separated)",
        value: defaultExtList,
      });
      if (!input) {
        return;
      }

      const extensions = input
        .split(",")
        .map((e) => e.trim().replace(/^\./, "").toLowerCase())
        .filter(Boolean);

      const ignored = getIgnoredFolders();
      const files: vscode.Uri[] = [];

      logger.log(`Scanning folder: ${folders[0].fsPath}`, "INFO");
      await findFilesRecursivelyAsync(
        folders[0].fsPath,
        extensions,
        files,
        ignored,
        logger,
      );

      if (files.length === 0) {
        vscode.window.showWarningMessage("No matching files found.");
        logger.log("No matching files found during folder scan.", "WARN");
        return;
      }

      logger.log(`📁 ${files.length} files found in folder`, "INFO");
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Generating Markdown…",
          cancellable: false,
        },
        async (progress) => {
          const out = await generateMarkdown(files, progress, logger);
          await logger.flushLogs();
          const doc = await vscode.workspace.openTextDocument(out);
          vscode.window.showTextDocument(doc);
        },
      );
    },
  );

  // --- Command: Context menu (Explorer) ---
  const fromContext = vscode.commands.registerCommand(
    "code2md.generateMarkdownContext",
    async (...args: any[]) => {
      logger.log("Context menu command triggered", "INFO");
      if (isCommandRunning) {
        logger.log(
          "Command already running, ignoring context menu trigger.",
          "WARN",
        );
        return;
      }
      isCommandRunning = true;
      try {
        let selectedUris: vscode.Uri[] = [];

        if (args.length > 1 && Array.isArray(args[1])) {
          selectedUris = args[1].filter(
            (uri: any) => uri instanceof vscode.Uri,
          );
        } else if (args.length > 0 && args[0] instanceof vscode.Uri) {
          selectedUris = [args[0]];
        }

        if (selectedUris.length === 0 && vscode.window.activeTextEditor) {
          selectedUris = [vscode.window.activeTextEditor.document.uri];
        }

        if (selectedUris.length === 0) {
          vscode.window.showWarningMessage(
            "No files or folders selected via context menu.",
          );
          logger.log("No files or folders selected via context menu.", "WARN");
          return;
        }

        const filesToProcess: vscode.Uri[] = [];
        const ignoredFolders = getIgnoredFolders();
        const extensions = DEFAULT_EXTENSIONS;

        logger.log(
          `Processing ${selectedUris.length} items from context menu...`,
          "INFO",
        );

        for (const uri of selectedUris) {
          try {
            const stat = await vscode.workspace.fs.stat(uri);
            if (stat.type === vscode.FileType.File) {
              const ext = uri.path.split(".").pop()?.toLowerCase();
              if (ext && extensions.includes(ext)) {
                filesToProcess.push(uri);
              } else {
                logger.log(
                  `Skipping file (unsupported extension): ${uri.fsPath}`,
                  "INFO",
                );
              }
            } else if (stat.type === vscode.FileType.Directory) {
              logger.log(`Scanning folder: ${uri.fsPath}`, "INFO");
              await findFilesRecursivelyAsync(
                uri.fsPath,
                extensions,
                filesToProcess,
                ignoredFolders,
                logger,
              );
            }
          } catch (error) {
            logger.log(
              `⚠️ Error processing selected item ${uri.fsPath}: ${error}`,
              "ERROR",
              true,
            );
            vscode.window.showErrorMessage(
              `[code2md] Error processing ${uri.fsPath}: ${error}`,
            );
          }
        }

        if (filesToProcess.length === 0) {
          vscode.window.showWarningMessage(
            "No matching files found in the selected items.",
          );
          logger.log(
            "No matching files found after processing context menu selections.",
            "WARN",
          );
          return;
        }

        logger.log(
          `📄 ${filesToProcess.length} total files identified for Markdown generation.`,
          "INFO",
        );
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: "Generating Markdown…",
            cancellable: false,
          },
          async (progress) => {
            const out = await generateMarkdown(
              filesToProcess,
              progress,
              logger,
            );
            await logger.flushLogs();
            const doc = await vscode.workspace.openTextDocument(out);
            vscode.window.showTextDocument(doc);
          },
        );
      } finally {
        isCommandRunning = false;
      }
    },
  );

  // Register commands
  logger.log("Registering commands for code2md extension", "INFO");
  context.subscriptions.push(fromFiles, fromFolder, fromContext);
}

export function deactivate() {
  if (logger) {
    logger.log("🛑 [code2md] deactivated", "INFO");
    logger.dispose();
  }
}
