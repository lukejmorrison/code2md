import * as vscode from "vscode";
import { Logger } from "./logger";
import { setGlobalLogger, getIncludedExtensions } from "./utils";
import { findFilesRecursivelyAsync } from "./fileScanner";
import { generateMarkdown } from "./markdownGenerator";

let logger: Logger;

export function activate(context: vscode.ExtensionContext) {
  logger = new Logger(context);
  setGlobalLogger(logger);
  context.subscriptions.push(logger);

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

      const defaultExtList = (await getIncludedExtensions()).join(",");
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

      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        vscode.window.showErrorMessage("No workspace folder open.");
        return;
      }

      const files: vscode.Uri[] = [];
      logger.log(`Scanning folder: ${folders[0].fsPath}`, "INFO");
      const { files: foundFiles, ignored } = await findFilesRecursivelyAsync(
        folders[0].fsPath,
        extensions,
        files,
        logger,
        workspaceRoot
      );

      logger.logIgnoredItems(ignored);

      if (foundFiles.length === 0) {
        vscode.window.showWarningMessage("No matching files found.");
        logger.log("No matching files found during folder scan.", "WARN");
        return;
      }

      logger.log(`📁 ${foundFiles.length} files found in folder`, "INFO");
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Generating Markdown…",
          cancellable: false,
        },
        async (progress) => {
          const out = await generateMarkdown(foundFiles, progress, logger);
          await logger.flushLogs();
          const doc = await vscode.workspace.openTextDocument(out);
          vscode.window.showTextDocument(doc);
        },
      );
    },
  );

  const fromContext = vscode.commands.registerCommand(
    "code2md.generateMarkdownContext",
    async (...args: any[]) => {
      logger.log(`Context menu args received: ${JSON.stringify(args)}`, "INFO");

      // Attempt to get selected URIs from args
      let selectedUris: vscode.Uri[] = [];
      if (args.length > 0) {
        if (args[0] instanceof vscode.Uri) {
          selectedUris = [args[0]];
        } else if (Array.isArray(args[0])) {
          selectedUris = args[0].filter((item: any) => item instanceof vscode.Uri);
        } else if (Array.isArray(args)) {
          selectedUris = args.filter((item: any) => item instanceof vscode.Uri);
        }
      }

      // Fallback: Try to get selection from Explorer (not directly supported, but we can log for debugging)
      if (selectedUris.length === 0) {
        logger.log("No URIs found in args. Falling back to active selection.", "WARN");
        // Note: VS Code doesn't provide a direct API for Explorer selection.
        // This is a limitation, and we rely on args for now.
      }

      if (!selectedUris || selectedUris.length === 0) {
        vscode.window.showWarningMessage("No files or folders selected.");
        logger.log("No files or folders selected via context menu.", "WARN");
        return;
      }

      logger.log(`Processing ${selectedUris.length} selected URIs: ${selectedUris.map(uri => uri.fsPath).join(", ")}` , "INFO");

      const filesToProcess: vscode.Uri[] = [];
      const extensions = await getIncludedExtensions();
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        vscode.window.showErrorMessage("No workspace folder open.");
        return;
      }
      const ignoredItems: string[] = [];

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
            const { files: foundFiles, ignored } = await findFilesRecursivelyAsync(
              uri.fsPath,
              extensions,
              filesToProcess,
              logger,
              workspaceRoot
            );
            ignoredItems.push(...ignored);
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

      logger.logIgnoredItems(ignoredItems);

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
    },
  );

  const fromFiles = vscode.commands.registerCommand(
    "code2md.generateMarkdown",
    async () => {
      const files = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectMany: true,
        filters: {
          'All Files': ['*']
        }
      });
      if (!files?.length) {
        vscode.window.showWarningMessage("No files selected.");
        return;
      }

      const extensions = await getIncludedExtensions();
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        vscode.window.showErrorMessage("No workspace folder open.");
        return;
      }

      const filesToProcess: vscode.Uri[] = files.map(file => file);

      if (filesToProcess.length === 0) {
        vscode.window.showWarningMessage("No matching files found.");
        logger.log("No matching files found in selected files.", "WARN");
        return;
      }

      logger.log(`📄 ${filesToProcess.length} files selected for Markdown generation.`, "INFO");
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "Generating Markdown…",
          cancellable: false,
        },
        async (progress) => {
          const out = await generateMarkdown(filesToProcess, progress, logger);
          await logger.flushLogs();
          const doc = await vscode.workspace.openTextDocument(out);
          vscode.window.showTextDocument(doc);
        },
      );
    },
  );

  context.subscriptions.push(fromFolder, fromContext, fromFiles);
}

export function deactivate() {
  if (logger) {
    logger.dispose();
  }
}