// src/utils.ts
import * as vscode from "vscode";
import * as path from "path";
import { LANGUAGE_MAP, getDefaultIgnoredDirs, getDefaultExtensions } from "./config";
import { Logger } from "./logger"; // Assuming logger is globally available or passed

let globalLogger: Logger; // Declare a variable to hold the logger instance

export function setGlobalLogger(loggerInstance: Logger) {
  globalLogger = loggerInstance;
}

/**
 * Retrieves the list of folders to ignore from user settings,
 * falling back to code2md.ignoredDirs setting.
 */
export function getIgnoredFolders(): string[] {
  const config = vscode.workspace.getConfiguration("code2md");
  const ignorePatterns = config.get<string[]>("ignorePatterns", []);
  if (ignorePatterns.length > 0) {
    return ignorePatterns.map((pattern) => pattern.split("/")[0].replace(/^\*\./, ""));
  }
  return getDefaultIgnoredDirs();
}

/**
 * Retrieves the list of file extensions to include from user settings,
 * falling back to code2md.defaultExtensions setting.
 */
export function getIncludedExtensions(): string[] {
  return getDefaultExtensions();
}

/**
 * Maps a file extension (without dot) to a Markdown language identifier.
 */
export function getLanguage(ext: string): string | undefined {
  return LANGUAGE_MAP[ext.toLowerCase()];
}

/**
 * Converts a filename to a safe Markdown heading ID by replacing
 * non-alphanumeric characters with hyphens and lowercasing.
 */
export function toMarkdownId(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
}

/**
 * Makes an absolute file path relative to the workspace, or returns basename.
 * This function now explicitly depends on a Logger instance being set.
 */
export function sanitizePath(p: string): string {
  const folder = globalLogger?.getWorkspaceFolderOrWarn();
  if (folder) {
    return path.relative(folder.uri.fsPath, p).split(path.sep).join("/");
  }
  return path.basename(p);
}
