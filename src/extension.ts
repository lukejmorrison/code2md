import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Create a log file in the extension's directory
let logFilePath: string;

// Helper function to ensure codereview directory exists
function ensureCodeReviewDir(baseDir: string): string {
    const codeReviewDir = path.join(baseDir, 'codereview');
    if (!fs.existsSync(codeReviewDir)) {
        try {
            fs.mkdirSync(codeReviewDir, { recursive: true });
            logToFile(`[code2md] Created codereview directory at: ${codeReviewDir}`);
        } catch (error) {
            console.error(`[code2md] Error creating codereview directory: ${error}`);
            throw error;
        }
    }
    return codeReviewDir;
}

// Helper function to write to log file
function logToFile(message: string): void {
    if (!logFilePath) {
        // Initialize log file path if not already set
        const timestamp = getFormattedTimestamp();
        const baseDir = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || path.join(__dirname, '..');
        const codeReviewDir = ensureCodeReviewDir(baseDir);
        
        // Use the same base name as the markdown file for the log file
        const baseFileName = `${timestamp}_${vscode.workspace.workspaceFolders?.[0]?.name || 'CodeExport'}_v01`;
        const logFileName = `${baseFileName}.log`;
        logFilePath = path.join(codeReviewDir, logFileName);
        
        // Create or clear the log file
        fs.writeFileSync(logFilePath, `Code2MD Extension Log - ${new Date().toISOString()}\n\n`);
        
        // Log sanitized path
        const sanitizedPath = vscode.workspace.workspaceFolders?.[0] ? 
            path.relative(vscode.workspace.workspaceFolders[0].uri.fsPath, logFilePath)
                .split(path.sep).join('/') : 
            path.basename(logFilePath);
        console.log(`[code2md] Log file created at: ${sanitizedPath}`);
    }
    
    // Append to log file
    try {
        const logMessage = `${new Date().toISOString()} - ${message}\n`;
        fs.appendFileSync(logFilePath, logMessage);
        console.log(message); // Also log to console
    } catch (error) {
        console.error(`[code2md] Error writing to log file: ${error}`);
    }
}

// Generates a timestamp for unique file naming
function getFormattedTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    
    // Convert to 12-hour format with AM/PM
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const hoursStr = hours.toString().padStart(2, '0');
    
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}_${hoursStr}${minutes}${ampm}`;
}

// Determines the output file path, ensuring uniqueness with versioning
function getOutputFilePath(files: vscode.Uri[]): string {
    const timestamp = getFormattedTimestamp();
    let rootFolderName: string;
    let baseDir: string;

    // Use workspace folder if available; otherwise, fall back to the directory of the first file
    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
        rootFolderName = vscode.workspace.workspaceFolders[0].name;
        baseDir = vscode.workspace.workspaceFolders[0].uri.fsPath;
    } else {
        rootFolderName = "CodeExport";
        baseDir = path.dirname(files[0].fsPath);
    }

    // Ensure codereview directory exists
    const codeReviewDir = ensureCodeReviewDir(baseDir);

    // Check existing files in the directory to determine the next version number
    // Get the date part of the timestamp (YYYY-MM-DD)
    const datePart = timestamp.split('_')[0];
    
    // Find all files that match the current date
    let version = 1;
    try {
        const existingFiles = fs.readdirSync(codeReviewDir);
        // Filter files that match the current date and pattern
        const todaysFiles = existingFiles.filter(file => 
            file.startsWith(datePart) && 
            file.includes(rootFolderName) && 
            file.endsWith('.md') &&
            file.match(/_v\d+\.md$/)
        );
        
        // Extract the highest version number from today's files
        if (todaysFiles.length > 0) {
            // Extract version numbers from filenames
            const versions = todaysFiles.map(file => {
                const match = file.match(/_v(\d+)\.md$/);
                return match ? parseInt(match[1], 10) : 0;
            });
            
            // Get the highest version number and increment it
            const highestVersion = Math.max(...versions);
            version = highestVersion + 1;
            logToFile(`[code2md] Found ${todaysFiles.length} existing files today, highest version: ${highestVersion}`);
        }
    } catch (error) {
        logToFile(`[code2md] Error reading directory for versioning: ${error}`);
        // Fallback to default version 1
    }
    
    const paddedVersion = version.toString().padStart(2, '0');
    const filename = `${timestamp}_${rootFolderName}_v${paddedVersion}.md`;
    const outputPath = path.join(codeReviewDir, filename);
    
    logToFile(`[code2md] Output path set to: ${outputPath} (Version: ${version})`);
    return outputPath;
}

// Generates Markdown content from selected files with syntax-highlighted code blocks
async function generateMarkdown(files: vscode.Uri[]): Promise<string> {
    // Sanitize file paths for logging
    const sanitizedPaths = files.map(f => {
        return vscode.workspace.workspaceFolders?.[0] ? 
            path.relative(vscode.workspace.workspaceFolders[0].uri.fsPath, f.fsPath)
                .split(path.sep).join('/') : // Convert to forward slashes
            path.basename(f.fsPath);
    });
    
    logToFile(`[code2md] Generating Markdown for files: ${sanitizedPaths.join(', ')}`);

    const outputPath = getOutputFilePath(files);
    
    // Sanitize workspace name
    const workspaceName = (vscode.workspace.workspaceFolders?.[0]?.name || 
        path.basename(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || 'NoWorkspace'))
        .replace(/[^\w\s-]/g, '') // Remove non-alphanumeric characters except spaces and hyphens
        .trim();

    let markdownContent = `# Project: ${workspaceName}\n\n`;
    
    // Add Table of Contents
    markdownContent += `## Table of Contents\n\n`;
    for (const file of files) {
        const fileName = path.basename(file.fsPath);
        const fileRelativePath = vscode.workspace.workspaceFolders?.[0] ? 
            path.relative(vscode.workspace.workspaceFolders[0].uri.fsPath, file.fsPath)
                .split(path.sep).join('/') : // Convert to forward slashes
            fileName;
        // Create a valid ID by replacing special characters
        const fileId = fileName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
        markdownContent += `- [${fileRelativePath}](#file-${fileId})\n`;
    }
    markdownContent += `\n`;

    // Process each file
    let processedCount = 0;
    for (const file of files) {
        const sanitizedPath = vscode.workspace.workspaceFolders?.[0] ? 
            path.relative(vscode.workspace.workspaceFolders[0].uri.fsPath, file.fsPath)
                .split(path.sep).join('/') : 
            path.basename(file.fsPath);
            
        logToFile(`[code2md] Processing file: ${sanitizedPath}`);
        try {
            const content = fs.readFileSync(file.fsPath, 'utf8');
            const fileExtension = path.extname(file.fsPath).substr(1);
            const language = getLanguageFromExtension(fileExtension);
            const fileName = path.basename(file.fsPath);
            const fileRelativePath = vscode.workspace.workspaceFolders?.[0] ? 
                path.relative(vscode.workspace.workspaceFolders[0].uri.fsPath, file.fsPath)
                    .split(path.sep).join('/') : 
                fileName;
            // Create a valid ID by replacing special characters
            const fileId = fileName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();

            markdownContent += `## File: ${fileRelativePath} <a id="file-${fileId}"></a>\n\n`;
            markdownContent += language ? `\`\`\`${language}\n${content}\n\`\`\`\n\n` : `\`\`\`\n${content}\n\`\`\`\n\n`;
            processedCount++;
        } catch (error) {
            logToFile(`[code2md] Error processing file ${sanitizedPath}: ${error}`);
            // Continue with other files
        }
    }

    try {
        fs.writeFileSync(outputPath, markdownContent);
        const sanitizedOutputPath = vscode.workspace.workspaceFolders?.[0] ? 
            path.relative(vscode.workspace.workspaceFolders[0].uri.fsPath, outputPath)
                .split(path.sep).join('/') : 
            path.basename(outputPath);
        logToFile(`[code2md] Markdown file written to: ${sanitizedOutputPath} with ${processedCount} of ${files.length} files`);
        return outputPath;
    } catch (error) {
        logToFile(`[code2md] Error writing Markdown file: ${error}`);
        throw new Error(`Failed to write Markdown file: ${error}`);
    }
}

// Maps file extensions to Markdown language identifiers for syntax highlighting
function getLanguageFromExtension(extension: string): string | undefined {
    const languageMap: { [key: string]: string } = {
        'ts': 'typescript',
        'js': 'javascript',
        'py': 'python',
        'cpp': 'cpp',
        'java': 'java',
        'cs': 'csharp',
        'rb': 'ruby',
        'swift': 'swift',
        'kt': 'kotlin',
        'go': 'go',
        'php': 'php',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'md': 'markdown',
        'rs': 'rust',
        'toml': 'toml'
    };
    return languageMap[extension.toLowerCase()];
}

// New helper function to get default extensions
function getDefaultExtensions(): string[] {
    return [
        'ts', 'js', 'jsx', 'tsx',  // JavaScript/TypeScript
        'py',                      // Python
        'java',                    // Java
        'cpp', 'hpp', 'c', 'h',    // C/C++
        'cs',                      // C#
        'go',                      // Go
        'rs',                      // Rust
        'php',                     // PHP
        'rb',                      // Ruby
        'swift',                   // Swift
        'kt',                      // Kotlin
        'html', 'css', 'scss',     // Web
        'json', 'yaml', 'yml',     // Data
        'md', 'txt',              // Documentation
        'xml',                    // XML
        'sql',                    // SQL
        'sh', 'bash', 'ps1'       // Scripts
    ];
}

// Activates the extension and registers commands
export function activate(context: vscode.ExtensionContext) {
    console.log('[code2md] Code to Markdown extension activated');

    // Command Palette command: Opens file picker and generates Markdown
    const commandPalette = vscode.commands.registerCommand('code2md.generateMarkdown', async () => {
        logToFile('[code2md] Command Palette: Generate Markdown triggered');
        const files = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectMany: true,
            openLabel: 'Select Files for Markdown'
        });

        if (!files || files.length === 0) {
            logToFile('[code2md] No files selected in Command Palette');
            vscode.window.showErrorMessage('No files selected.');
            return;
        }

        logToFile(`[code2md] Selected ${files.length} files via Command Palette`);
        
        try {
            const outputPath = await generateMarkdown(files);
            const successMessage = `Markdown file generated with ${files.length} files at: ${outputPath}`;
            logToFile(`[code2md] ${successMessage}`);
            vscode.window.showInformationMessage(successMessage);
            
            // Show the generated file
            const doc = await vscode.workspace.openTextDocument(outputPath);
            await vscode.window.showTextDocument(doc);
        } catch (error) {
            const errorMessage = `Error generating Markdown: ${error}`;
            logToFile(`[code2md] ${errorMessage}`);
            vscode.window.showErrorMessage(errorMessage);
        }
    });

    // New command: Generate Markdown from a folder
    const folderCommand = vscode.commands.registerCommand('code2md.generateMarkdownFromFolder', async () => {
        logToFile('[code2md] Folder Command: Generate Markdown from folder triggered');
        
        // Ask user to select a folder
        const folders = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Folder',
            title: 'Select Folder to Generate Markdown'
        });

        if (!folders || folders.length === 0) {
            logToFile('[code2md] No folder selected');
            vscode.window.showErrorMessage('Please select a folder to generate Markdown from.');
            return;
        }

        const folderPath = folders[0].fsPath;
        logToFile(`[code2md] Selected folder: ${folderPath}`);

        // Ask user for file extensions with improved default list
        const defaultExtensions = getDefaultExtensions().join(',');
        const extensionsInput = await vscode.window.showInputBox({
            prompt: 'Enter file extensions to include (comma separated)',
            value: defaultExtensions,
            placeHolder: 'e.g., ts,js,py,java,cpp',
            validateInput: (value) => {
                if (!value || value.trim().length === 0) {
                    return 'Please enter at least one file extension';
                }
                return null;
            }
        });

        if (!extensionsInput) {
            logToFile('[code2md] No extensions provided');
            vscode.window.showErrorMessage('No file extensions provided.');
            return;
        }

        const extensions = extensionsInput.split(',')
            .map(ext => ext.trim().toLowerCase())
            .filter(ext => ext.length > 0)
            .map(ext => ext.startsWith('.') ? ext.substring(1) : ext);

        logToFile(`[code2md] File extensions to include: ${extensions.join(', ')}`);

        // Find all matching files in the folder
        const files: vscode.Uri[] = [];
        
        // Improved helper function to recursively find files
        const findFiles = (dirPath: string) => {
            try {
                const entries = fs.readdirSync(dirPath, { withFileTypes: true });
                
                for (const entry of entries) {
                    const fullPath = path.join(dirPath, entry.name);
                    
                    // Skip hidden folders and specified directories
                    if (entry.isDirectory()) {
                        const skipDirs = ['node_modules', '.git', '.vs', '.idea', 'bin', 'obj', 'dist', 'build', 'target'];
                        if (!entry.name.startsWith('.') && !skipDirs.includes(entry.name)) {
                            findFiles(fullPath);
                        }
                    } else if (entry.isFile()) {
                        const ext = path.extname(entry.name).substring(1).toLowerCase();
                        if (extensions.includes(ext)) {
                            files.push(vscode.Uri.file(fullPath));
                            logToFile(`[code2md] Found matching file: ${fullPath}`);
                        }
                    }
                }
            } catch (error) {
                logToFile(`[code2md] Error reading directory ${dirPath}: ${error}`);
                throw error;
            }
        };

        try {
            findFiles(folderPath);
            
            if (files.length === 0) {
                const message = `No files with extensions ${extensions.join(', ')} found in the selected folder.`;
                logToFile(`[code2md] ${message}`);
                vscode.window.showErrorMessage(message);
                return;
            }

            // Sort files by path for consistent ordering
            files.sort((a, b) => a.fsPath.localeCompare(b.fsPath));
            
            logToFile(`[code2md] Found ${files.length} matching files`);
            
            // Show progress indicator for large folders
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: "Generating Markdown",
                cancellable: false
            }, async (progress) => {
                progress.report({ message: `Processing ${files.length} files...` });
                const outputPath = await generateMarkdown(files);
                const successMessage = `Markdown file generated with ${files.length} files at: ${outputPath}`;
                logToFile(`[code2md] ${successMessage}`);
                vscode.window.showInformationMessage(successMessage);
                
                // Show the generated file
                const doc = await vscode.workspace.openTextDocument(outputPath);
                await vscode.window.showTextDocument(doc);
            });
        } catch (error) {
            const errorMessage = `Error processing files: ${error}`;
            logToFile(`[code2md] ${errorMessage}`);
            vscode.window.showErrorMessage(errorMessage);
        }
    });

    // Context Menu command: Generates Markdown from Explorer-selected files
    const contextMenu = vscode.commands.registerCommand('code2md.generateMarkdownContext', async (...args: any[]) => {
        logToFile('[code2md] Context Menu: Generate Markdown triggered');
        logToFile(`[code2md] Raw args length: ${args.length}`);
        logToFile(`[code2md] Raw args: ${JSON.stringify(args.map(arg => typeof arg))}`);
        
        // Detailed logging of arguments
        for (let i = 0; i < args.length; i++) {
            logToFile(`[code2md] Arg ${i} type: ${typeof args[i]}`);
            logToFile(`[code2md] Arg ${i} is array: ${Array.isArray(args[i])}`);
            if (typeof args[i] === 'object') {
                const keys = Object.keys(args[i]).join(', ');
                logToFile(`[code2md] Arg ${i} keys: ${keys}`);
                if (args[i].fsPath) {
                    logToFile(`[code2md] Arg ${i} fsPath: ${args[i].fsPath}`);
                }
                if (args[i].length) {
                    logToFile(`[code2md] Arg ${i} length: ${args[i].length}`);
                    if (args[i][0] && args[i][0].fsPath) {
                        logToFile(`[code2md] Arg ${i}[0] fsPath: ${args[i][0].fsPath}`);
                    }
                }
            }
        }
        
        // From the example, we can see that multiple files might be passed as the second argument
        // if it's an array of vscode.Uri objects
        let selectedFiles: vscode.Uri[] = [];
        
        try {
            // Based on the example file, check if args follow the pattern [any, Uri[]]
            if (args.length === 2 && Array.isArray(args[1]) && 
                args[1].every((item: any) => item instanceof Object && item.fsPath)) {
                // Multiple files selected (same pattern as the example)
                selectedFiles = args[1];
                logToFile('[code2md] Files from second argument array');
            } 
            // If we have a single Uri as the first argument
            else if (args.length === 1 && args[0] instanceof Object && args[0].fsPath) {
                selectedFiles = [args[0]];
                logToFile('[code2md] Single file from first argument');
            }
            // Handle the case where an array is the first argument
            else if (args.length === 1 && Array.isArray(args[0]) && 
                    args[0].every((item: any) => item instanceof Object && item.fsPath)) {
                selectedFiles = args[0];
                logToFile('[code2md] Files from first argument array');
            }
            // Handle multiple URI arguments directly
            else if (args.length > 0 && args.every((arg: any) => arg instanceof Object && arg.fsPath)) {
                selectedFiles = args;
                logToFile('[code2md] Files from multiple arguments');
            }
            // Let's try one more approach, used by some VS Code extensions
            else if (args.length > 0 && args[0] && typeof args[0] === 'object' && args[0].scheme === 'file') {
                // Try to extract directly as Uri
                selectedFiles = [args[0] as vscode.Uri];
                logToFile('[code2md] Single file from first argument as direct Uri');
            }
            
            // If active text editor is available and we still don't have files, use that
            if (selectedFiles.length === 0 && vscode.window.activeTextEditor) {
                selectedFiles = [vscode.window.activeTextEditor.document.uri];
                logToFile('[code2md] Used active text editor document');
            }
            
            // Additional fallback: try to find an array of uris in the arguments
            if (selectedFiles.length === 0) {
                for (const arg of args) {
                    if (arg && Array.isArray(arg)) {
                        const uris = arg.filter((item: any) => item && typeof item === 'object' && item.fsPath);
                        if (uris.length > 0) {
                            selectedFiles = uris;
                            logToFile('[code2md] Found uris array in an argument');
                            break;
                        }
                    }
                }
            }
        } catch (error) {
            logToFile(`[code2md] Error during file selection: ${error}`);
        }
        
        // Log what we found
        logToFile(`[code2md] Selected files count: ${selectedFiles.length}`);
        if (selectedFiles.length > 0) {
            logToFile(`[code2md] Selected files: ${selectedFiles.map(f => f.fsPath).join(', ')}`);
        }
        
        if (!selectedFiles || selectedFiles.length === 0) {
            logToFile('[code2md] No files selected in Context Menu');
            vscode.window.showErrorMessage('No files selected. Please select one or more files before running this command, or use "Generate Markdown from Folder" instead.');
            return;
        }

        try {
            const outputPath = await generateMarkdown(selectedFiles);
            const successMessage = `Markdown file generated with ${selectedFiles.length} files at: ${outputPath}`;
            logToFile(`[code2md] ${successMessage}`);
            vscode.window.showInformationMessage(successMessage);
            
            // Show the generated file
            const doc = await vscode.workspace.openTextDocument(outputPath);
            await vscode.window.showTextDocument(doc);
        } catch (error) {
            const errorMessage = `Error generating Markdown: ${error}`;
            logToFile(`[code2md] ${errorMessage}`);
            vscode.window.showErrorMessage(errorMessage);
        }
    });

    context.subscriptions.push(commandPalette, folderCommand, contextMenu);
}

// Deactivates the extension (currently a no-op)
export function deactivate() {
    console.log('[code2md] Extension deactivated');
}