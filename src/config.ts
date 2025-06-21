// src/config.ts

/**
 * Default directories to ignore when scanning a workspace folder.
 */
export const DEFAULT_IGNORED_DIRS = [
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
];

/**
 * Default file extensions to include when scanning folders.
 */
export const DEFAULT_EXTENSIONS = [
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
];

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
