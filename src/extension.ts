import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

//
// === CONFIGURATION CONSTANTS ===
//

// Default folders to ignore when scanning a workspace folder
const DEFAULT_IGNORED_DIRS = [
    'node_modules', '.git', '.vs', '.idea', 'bin', 'obj',
    'dist', 'build', 'target'
];

// Default file extensions to include when scanning folders
const DEFAULT_EXTENSIONS = [
    'ts','js','jsx','tsx','py','java','cpp','hpp','c','h',
    'cs','go','rs','php','rb','swift','kt','html','css',
    'scss','json','yaml','yml','md','txt','xml','sql','sh',
    'bash','ps1'
];

// Mapping from file extensions to Markdown syntax language for highlighting
const LANGUAGE_MAP: Record<string,string> = {
    ts: 'typescript', js: 'javascript', py: 'python', cpp: 'cpp',
    java: 'java', cs: 'csharp', rb: 'ruby', swift: 'swift',
    kt: 'kotlin', go: 'go', php: 'php', html: 'html',
    css: 'css', json: 'json', md: 'markdown', rs: 'rust',
    toml: 'toml', sql: 'sql', xml: 'xml', bash: 'bash',
    ps1: 'powershell'
};

//
// === STATEFUL LOGGING BUFFER ===
//

let logFilePath: string | undefined;
let logBuffer: string[] = [];

/**
 * Add a timestamped message to the log buffer (console only).
 * Actual disk write happens later via `flushLogs()`.
 */
function log(message: string) {
    const line = `${new Date().toISOString()} - ${message}`;
    logBuffer.push(line);
    console.log(line);
}

/**
 * Ensure `logBuffer` is persisted to disk in a codereview log file.
 * Also notifies the user of the log file location.
 */
async function flushLogs() {
    if (!logFilePath) {
        const baseDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
            || path.join(__dirname, '..');
        const dir = path.join(baseDir, 'codereview');
        fs.mkdirSync(dir, { recursive: true });

        const name = vscode.workspace.workspaceFolders?.[0]?.name || 'CodeExport';
        const timestamp = getTimestamp();
        logFilePath = path.join(dir, `${timestamp}_${name}_v01.log`);

        fs.writeFileSync(logFilePath, `[code2md] Log - ${new Date().toISOString()}\n\n`);
    }

    fs.appendFileSync(logFilePath, logBuffer.join('\n') + '\n');
    logBuffer = [];

    const sanitized = sanitizePath(logFilePath);
    vscode.window.showInformationMessage(`Log file written to ${sanitized}`);
}

//
// === UTILITIES ===
/**
 * Format current time as YYYY-MM-DD_HHMMAM/PM
 */
function getTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');

    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`
         + `_${pad(hours)}${pad(now.getMinutes())}${ampm}`;
}

/**
 * Make a file path user-readable and relative to workspace, or just basename
 */
function sanitizePath(p: string): string {
    if (vscode.workspace.workspaceFolders?.[0]) {
        const ws = vscode.workspace.workspaceFolders[0].uri.fsPath;
        return path.relative(ws, p).split(path.sep).join('/');
    }
    return path.basename(p);
}

/**
 * Translate filename to safe Markdown heading ID
 */
function toMarkdownId(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
}

/**
 * Retrieve ignore folders list from VS Code settings
 */
function getIgnoredFolders(): string[] {
    const config = vscode.workspace.getConfiguration('code2md');
    const custom = config.get<string[]>('ignoreFolders');
    return Array.isArray(custom)
        ? custom.map(s => s.split('/')[0])
        : DEFAULT_IGNORED_DIRS;
}

/**
 * Map extension (without dot) to Markdown code-block language
 */
function getLanguage(ext: string): string | undefined {
    return LANGUAGE_MAP[ext.toLowerCase()];
}

//
// === FILE SCANNING ===
/**
 * Recursively find matching files under `dir`, respecting extensions and ignored directories
 */
function findFilesRecursively(
    dir: string,
    extensions: string[],
    out: vscode.Uri[],
    ignored: string[]
) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const f of entries) {
        const full = path.join(dir, f.name);
        if (f.isDirectory()) {
            if (!f.name.startsWith('.') && !ignored.includes(f.name)) {
                findFilesRecursively(full, extensions, out, ignored);
            }
        } else if (f.isFile()) {
            const ext = path.extname(f.name).slice(1).toLowerCase();
            if (extensions.includes(ext)) {
                out.push(vscode.Uri.file(full));
            }
        }
    }
}

//
// === OUTPUT FILE NAMING ===
/**
 * Generate unique Markdown filename <timestamp>_<workspace>_vXX.md
 */
function getOutputPath(files: vscode.Uri[]): string {
    const timestamp = getTimestamp();
    const baseDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
        || path.dirname(files[0].fsPath);
    const rootName = vscode.workspace.workspaceFolders?.[0]?.name || 'CodeExport';
    const dir = path.join(baseDir, 'codereview');
    fs.mkdirSync(dir, { recursive: true });

    const prefix = timestamp.split('_')[0];
    const todayFiles = fs.readdirSync(dir).filter(f =>
        f.startsWith(prefix) && f.includes(rootName) && f.endsWith('.md')
    );

    const maxVer = Math.max(0, ...todayFiles.map(f => {
        const m = f.match(/_v(\d+)\.md$/);
        return m ? parseInt(m[1], 10) : 0;
    }));
    const version = (maxVer + 1).toString().padStart(2, '0');

    return path.join(dir, `${timestamp}_${rootName}_v${version}.md`);
}

//
// === MARKDOWN GENERATION ===
/**
 * Generate a Markdown file containing all `files`, returns the output file path
 */
async function generateMarkdown(files: vscode.Uri[]): Promise<string> {
    const outputPath = getOutputPath(files);
    const workspaceName = (vscode.workspace.workspaceFolders?.[0]?.name || 'NoWorkspace')
        .replace(/[^\w\s-]/g, '');

    let md = `# Project: ${workspaceName}\n\n## Table of Contents\n\n`;
    for (const f of files) {
        const name = sanitizePath(f.fsPath);
        md += `- [${name}](#file-${toMarkdownId(name)})\n`;
    }
    md += '\n';

    for (const file of files) {
        const sanitizedName = sanitizePath(file.fsPath);
        const id = toMarkdownId(sanitizedName);
        md += `## File: ${sanitizedName} <a id="file-${id}"></a>\n\n`;
        try {
            const content = fs.readFileSync(file.fsPath, 'utf8');
            const ext = path.extname(file.fsPath).slice(1);
            const lang = getLanguage(ext) || '';
            md += `\`\`\`${lang}\n${content}\n\`\`\`\n\n`;
        } catch (err) {
            log(`⚠️ Failed to read file: ${file.fsPath} (${err})`);
        }
    }

    fs.writeFileSync(outputPath, md);
    log(`✅ Markdown file generated: ${sanitizePath(outputPath)}`);
    return outputPath;
}

//
// === ACTIVATION & COMMAND REGISTRATION ===
export function activate(context: vscode.ExtensionContext) {
    log('🚀 [code2md] activated');

    // -- Command: Select files manually --
    const fromFiles = vscode.commands.registerCommand('code2md.generateMarkdown', async () => {
        const files = await vscode.window.showOpenDialog({
            canSelectFiles: true, canSelectMany: true
        });
        if (!files || files.length === 0) { return; }
        log(`📂 ${files.length} files selected manually`);
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generating Markdown',
            cancellable: false
        }, async () => {
            const out = await generateMarkdown(files);
            await flushLogs();
            const doc = await vscode.workspace.openTextDocument(out);
            vscode.window.showTextDocument(doc);
        });
    });

    // -- Command: Select folder and enter extensions --
    const fromFolder = vscode.commands.registerCommand('code2md.generateMarkdownFromFolder', async () => {
        const folders = await vscode.window.showOpenDialog({
            canSelectFolders: true, canSelectMany: false
        });
        if (!folders || folders.length === 0) { return; }

        const defaultExt = DEFAULT_EXTENSIONS.join(',');
        const input = await vscode.window.showInputBox({
            prompt: 'Enter file extensions (comma-separated)',
            value: defaultExt
        });
        if (!input) { return; }

        const extensions = input.split(',')
            .map(e => e.trim().replace(/^\./, '').toLowerCase())
            .filter(Boolean);
        const ignored = getIgnoredFolders();

        const files: vscode.Uri[] = [];
        findFilesRecursively(folders[0].fsPath, extensions, files, ignored);
        if (files.length === 0) {
            vscode.window.showWarningMessage(`No matching files found`);
            return;
        }

        log(`📁 ${files.length} files found in folder`);
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generating Markdown',
            cancellable: false
        }, async () => {
            const out = await generateMarkdown(files);
            await flushLogs();
            const doc = await vscode.workspace.openTextDocument(out);
            vscode.window.showTextDocument(doc);
        });
    });

    // -- Command: Context menu (Explorer) --
    const fromContext = vscode.commands.registerCommand('code2md.generateMarkdownContext', async (...args: any[]) => {
        log('Context menu command triggered');
        let selected: vscode.Uri[] = [];
        try {
            if (args.length === 2 && Array.isArray(args[1])) {
                selected = args[1].filter((i: any) => i?.fsPath);
            } else if (args.length === 1 && args[0]?.fsPath) {
                selected = [args[0]];
            }
        } catch (err) {
            log(`⚠️ URI extraction failed: ${err}`);
        }
        if (selected.length === 0 && vscode.window.activeTextEditor) {
            selected = [vscode.window.activeTextEditor.document.uri];
        }
        if (selected.length === 0) {
            vscode.window.showWarningMessage('No files selected via context menu.');
            return;
        }

        log(`📄 ${selected.length} files from context menu`);
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Generating Markdown',
            cancellable: false
        }, async () => {
            const out = await generateMarkdown(selected);
            await flushLogs();
            const doc = await vscode.workspace.openTextDocument(out);
            vscode.window.showTextDocument(doc);
        });
    });

    context.subscriptions.push(fromFiles, fromFolder, fromContext);
}

/**
 * No special cleanup needed on deactivation,
 * logs are flushed after each command run.
 */
export function deactivate() {
    log('🛑 [code2md] deactivated');
}
