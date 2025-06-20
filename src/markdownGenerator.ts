// src/markdownGenerator.ts
import * as vscode from "vscode";
import * as fs from "fs";
import { promises as fsp } from "fs";
import * as path from "path";
import { once } from "events";
import { getLanguage, toMarkdownId, sanitizePath } from "./utils";
import { Logger } from "./logger";

/**
 * Generate a unique Markdown filename under `codereview`:
 * <timestamp>_<workspace>_vXX.md
 * @param files The array of file URIs to process.
 * @param loggerInstance The logger instance to use for logging messages.
 */
function getOutputPath(files: vscode.Uri[], loggerInstance: Logger): string {
  const folder = loggerInstance.getWorkspaceFolderOrWarn();
  const timestamp = loggerInstance.getFileTimestamp();

  const baseDir = folder?.uri.fsPath || path.dirname(files[0].fsPath);
  const projectName = folder?.name || "CodeExport";
  const codereviewDir = path.join(baseDir, "codereview");
  fs.mkdirSync(codereviewDir, { recursive: true });

  const datePrefix = timestamp.split("_")[0];
  const existing = fs
    .readdirSync(codereviewDir)
    .filter(
      (f) =>
        f.startsWith(datePrefix) &&
        f.includes(projectName) &&
        f.endsWith(".md"),
    );

  const maxVer = existing.reduce<number>((max, filename) => {
    const m = filename.match(/_v(\d+)\.md$/);
    return m ? Math.max(max, parseInt(m[1], 10)) : max;
  }, 0);

  const nextVer = (maxVer + 1).toString().padStart(2, "0");
  return path.join(codereviewDir, `${timestamp}_${projectName}_v${nextVer}.md`);
}

/**
 * Generate a single Markdown file that includes all provided URIs.
 * Uses asynchronous I/O, batching, and a write stream for performance.
 *
 * @param files The array of file URIs to process.
 * @param progress Optional Progress object to report progress to VS Code.
 * @param loggerInstance The logger instance to use for logging messages.
 */
export async function generateMarkdown(
  files: vscode.Uri[],
  progress: vscode.Progress<{ message?: string; increment?: number }>,
  loggerInstance: Logger,
): Promise<string> {
  const folder = loggerInstance.getWorkspaceFolderOrWarn();
  if (!folder) {
    throw new Error("No workspace folder open. Cannot generate markdown.");
  }
  if (files.length === 0) {
    throw new Error("The 'files' array is empty. Cannot generate markdown.");
  }

  const outputPath = getOutputPath(files, loggerInstance);
  const projectName = folder.name.replace(/[^\w\s-]/g, "");

  const header =
    `# Project: ${projectName}\n\n` +
    `## Table of Contents\n\n` +
    files
      .map((f) => {
        const rel = sanitizePath(f.fsPath);
        return `- [${rel}](#file-${toMarkdownId(rel)})`;
      })
      .join("\n") +
    "\n\n";

  const writeStream = fs.createWriteStream(outputPath, { encoding: "utf8" });
  writeStream.write(header);

  const BATCH_SIZE = 10;
  const totalFiles = files.length;
  let processedFiles = 0;

  for (let i = 0; i < totalFiles; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);

    for (const file of batch) {
      const rel = sanitizePath(file.fsPath);
      const id = toMarkdownId(rel);
      try {
        const content = await fsp.readFile(file.fsPath, "utf8");
        const ext = path.extname(file.fsPath).slice(1);
        const lang = getLanguage(ext) || "";
        const section =
          `## File: ${rel} <a id="file-${id}"></a>\n\n` +
          "```" +
          `${lang}\n` +
          `${content}\n` +
          "```\n\n";

        const writePromise = new Promise<void>((resolve, reject) => {
          if (!writeStream.write(section)) {
            writeStream.once("drain", resolve);
          } else {
            resolve();
          }
        });
        await writePromise;
        loggerInstance.log(`✅ Processed: ${rel}`, "INFO");
      } catch (err) {
        loggerInstance.log(
          `⚠️ Failed to read ${file.fsPath}: ${err}`,
          "ERROR",
          true,
        );
      }
    }

    processedFiles += batch.length;
    progress.report({
      message: `Processed ${processedFiles}/${totalFiles} files`,
    });
  }

  writeStream.end();
  await once(writeStream, "finish");

  loggerInstance.log(
    `✅ Markdown generated at: ${sanitizePath(outputPath)}`,
    "INFO",
  );
  return outputPath;
}
