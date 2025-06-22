// src/fileScanner.ts
import * as vscode from "vscode";
import { promises as fsp } from "fs";
import * as path from "path";
import { Logger } from "./logger";

/**
 * Recursively scan the given directory for files matching the provided
 * extensions, ignoring hidden and configured directories. Asynchronous.
 * @param dir The directory to scan.
 * @param extensions The list of file extensions to include.
 * @param out An array to push found file URIs into.
 * @param ignored A list of directory names to ignore.
 * @param loggerInstance The logger instance to use for logging messages.
 */
export async function findFilesRecursivelyAsync(
  dir: string,
  extensions: string[],
  out: vscode.Uri[],
  ignored: string[],
  loggerInstance: Logger,
): Promise<void> {
  try {
    const entries = (await fsp.readdir(dir, { withFileTypes: true }))
      .sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith(".") && !ignored.includes(entry.name)) {
          await findFilesRecursivelyAsync(
            fullPath,
            extensions,
            out,
            ignored,
            loggerInstance,
          );
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).slice(1).toLowerCase();
        if (extensions.includes(ext)) {
          out.push(vscode.Uri.file(fullPath));
        }
      }
    }
  } catch (error) {
    loggerInstance.log(
      `⚠️ Error reading directory ${dir}: ${error}`,
      "ERROR",
      true,
    );
  }
}
