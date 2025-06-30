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
    async (uri: vscode.Uri, uris: vscode.Uri[]) => {
      // Log the received arguments for debugging
      console.log("Received arguments - uri:", uri, "uris:", uris);
      logger.log(
        `Received uri: ${uri ? uri.fsPath : "none"}, uris: ${
          uris ? uris.map(u => u.fsPath).join(", ") : "none"
        }`,
        "INFO"
      );

      // Determine the list of URIs to process
      const selectedUris = uris && uris.length > 0 ? uris : uri ? [uri] : [];
      if (!selectedUris || selectedUris.length === 0) {
        vscode.window.showWarningMessage("No files or folders selected.");
        logger.log("No files or folders selected via context menu.", "WARN");
        return;
      }

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
      // Show user choice: Files or Folders
      const choice = await vscode.window.showQuickPick([
        { label: "📄 Select Files", value: "files" },
        { label: "📁 Select Folder", value: "folder" }
      ], {
        placeHolder: "What would you like to select?"
      });

      if (!choice) return;

      const extensions = await getIncludedExtensions();
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        vscode.window.showErrorMessage("No workspace folder open.");
        return;
      }

      let filesToProcess: vscode.Uri[] = [];

      if (choice.value === "files") {
        // Select individual files
        const files = await vscode.window.showOpenDialog({
          canSelectFiles: true,
          canSelectMany: true,
          filters: {
            'Supported Files': extensions.map(ext => ext),
            'All Files': ['*']
          }
        });
        
        if (!files?.length) {
          vscode.window.showWarningMessage("No files selected.");
          return;
        }

        // Filter by supported extensions
        filesToProcess = files.filter(file => {
          const ext = file.path.split(".").pop()?.toLowerCase();
          return ext && extensions.includes(ext);
        });

        if (filesToProcess.length === 0) {
          vscode.window.showWarningMessage("No supported files selected.");
          return;
        }
      } else {
        // Select folder(s)
        const folders = await vscode.window.showOpenDialog({
          canSelectFolders: true,
          canSelectMany: true,
        });
        
        if (!folders?.length) {
          vscode.window.showWarningMessage("No folders selected.");
          return;
        }

        // Scan all selected folders
        const ignoredItems: string[] = [];
        for (const folder of folders) {
          logger.log(`Scanning folder: ${folder.fsPath}`, "INFO");
          const { files: foundFiles, ignored } = await findFilesRecursivelyAsync(
            folder.fsPath,
            extensions,
            filesToProcess,
            logger,
            workspaceRoot
          );
          ignoredItems.push(...ignored);
        }

        logger.logIgnoredItems(ignoredItems);

        if (filesToProcess.length === 0) {
          vscode.window.showWarningMessage("No matching files found in selected folders.");
          return;
        }
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