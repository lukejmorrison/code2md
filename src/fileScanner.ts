import * as vscode from "vscode";
import { promises as fsp } from "fs";
import * as path from "path";
import { Logger } from "./logger";
import { createIgnore } from "./utils";

export async function findFilesRecursivelyAsync(
  dir: string,
  extensions: string[],
  out: vscode.Uri[],
  loggerInstance: Logger,
  workspaceRoot: string
): Promise<{ files: vscode.Uri[], ignored: string[] }> {
  const ig = createIgnore();
  const ignoredItems: string[] = [];

  async function scanDirectory(currentDir: string): Promise<void> {
    try {
      const entries = (await fsp.readdir(currentDir, { withFileTypes: true }))
        .sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relativePath = path.relative(workspaceRoot, fullPath).replace(/\\/g, '/');
        
        if (ig.ignores(relativePath)) {
          ignoredItems.push(fullPath);
          continue;
        }

        if (entry.isDirectory()) {
          await scanDirectory(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).slice(1).toLowerCase();
          if (extensions.includes(ext)) {
            out.push(vscode.Uri.file(fullPath));
          }
        }
      }
    } catch (error) {
      loggerInstance.log(
        `⚠️ Error reading directory ${currentDir}: ${error}`,
        "ERROR",
        true,
      );
    }
  }

  await scanDirectory(dir);
  return { files: out, ignored: ignoredItems };
}