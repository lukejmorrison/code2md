// src/config.ts

/**
 * Get default ignored directories from VS Code settings.
 */
import * as vscode from "vscode";

export function getDefaultIgnoredDirs(): string[] {
  const config = vscode.workspace.getConfiguration("code2md");
  return config.get<string[]>("ignoredDirs", [
    "node_modules",
    ".git",
    ".vs",
    ".idea",
    "bin",
    "obj",
    "dist",
    "build",
    "target",
    "venv",
    ".venv",
    "__pycache__",
    "coverage",
    "logs",
    "log",
    "**/codereview/",
  ]);
}

/**
 * Get default file extensions from VS Code settings.
 */
export function getDefaultExtensions(): string[] {
  const config = vscode.workspace.getConfiguration("code2md");
  return config.get<string[]>("defaultExtensions", [
    "ts",
    "js",
    "jsx",
    "tsx",
    "py",
    "java",
    "cpp",
    "hpp",
    "c",
    "h",
    "cs",
    "go",
    "rs",
    "php",
    "rb",
    "swift",
    "kt",
    "html",
    "css",
    "scss",
    "json",
    "yaml",
    "yml",
    "md",
    "txt",
    "xml",
    "sql",
    "sh",
    "bash",
    "ps1",
    "mk",
  ]);
}

/**
 * Map from file extension to Markdown code-block language identifier.
 */
export const LANGUAGE_MAP: Record<string, string> = {
  ts: "typescript",
  js: "javascript",
  py: "python",
  cpp: "cpp",
  java: "java",
  cs: "csharp",
  rb: "ruby",
  swift: "swift",
  kt: "kotlin",
  go: "go",
  php: "php",
  html: "html",
  css: "css",
  json: "json",
  md: "markdown",
  rs: "rust",
  toml: "toml",
  sql: "sql",
  xml: "xml",
  bash: "bash",
  ps1: "powershell",
  mk: "mk",
};
