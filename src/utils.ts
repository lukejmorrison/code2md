import * as vscode from "vscode";
import * as path from "path"; // Ensure this is correctly resolved
import { getDefaultIgnoredDirs, getDefaultExtensions, LANGUAGE_MAP } from "./config";
import ignore from "ignore";

export function setGlobalLogger(logger: any) {
  console.log("Global logger set:", logger);
}

export function getIgnorePatterns(): string[] {
  const config = vscode.workspace.getConfiguration("code2md");
  const ignorePatterns = config.get<string[]>("ignorePatterns", []);
  if (ignorePatterns.length > 0) {
    return ignorePatterns;
  }
  return getDefaultIgnoredDirs().map(dir => dir + '/**');
}

export function createIgnore(): ignore.Ignore {
  const patterns = getIgnorePatterns();
  const ig = ignore().add(patterns);
  return ig;
}

export async function getIncludedExtensions(): Promise<string[]> {
  const config = vscode.workspace.getConfiguration("code2md");
  const exts = config.get<string[]>("defaultExtensions", []);
  if (exts.length > 0) {
    return exts.map((e) => e.trim().replace(/^\./, "").toLowerCase());
  }
  return getDefaultExtensions();
}

export function getLanguage(ext: string): string | undefined {
  return LANGUAGE_MAP[ext.toLowerCase()];
}

export function toMarkdownId(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
}

export function sanitizePath(p: string): string {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (folder) {
    return path.relative(folder.uri.fsPath, p).split(path.sep).join("/");
  }
  return path.basename(p);
}