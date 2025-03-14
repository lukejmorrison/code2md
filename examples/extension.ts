import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('run-pdf-compiler.compile', (...args) => {
        let selectedFiles: string[] = [];
        if (args.length === 2 && Array.isArray(args[1]) && args[1].every(item => item instanceof vscode.Uri)) {
            // Multiple files selected
            selectedFiles = args[1].map((uri: vscode.Uri) => uri.fsPath);
        } else if (args.length === 1 && args[0] instanceof vscode.Uri) {
            // Single file selected
            selectedFiles = [args[0].fsPath];
        } else if (vscode.window.activeTextEditor) {
            selectedFiles = [vscode.window.activeTextEditor.document.uri.fsPath];
        }

        if (selectedFiles.length === 0) {
            vscode.window.showErrorMessage('No files selected');
            return;
        }

        // Log the selected files
        console.log(`Selected files: ${selectedFiles.join(', ')}`);

        const scriptPath = path.join(context.extensionPath, 'scripts', 'compile_to_pdf.py');
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0].uri.fsPath || path.dirname(selectedFiles[0]);
        const pythonPath = 'python'; // Change to 'py' or full path if needed
        const command = `${pythonPath} "${scriptPath}" ${selectedFiles.map(f => `"${f}"`).join(' ')}`;

        // Log the command being executed
        console.log(`Running command: ${command}`);

        child_process.exec(command, { cwd: workspaceFolder }, (error, stdout, stderr) => {
            if (error) {
                // Log any errors
                console.error(`Error: ${stderr}`);
                if (stderr.includes("No module named 'fpdf'")) {
                    vscode.window.showErrorMessage("Please install fpdf: pip install fpdf");
                } else {
                    vscode.window.showErrorMessage(`Error running script: ${stderr}`);
                }
            } else {
                // Log the script output
                console.log(`Script output: ${stdout}`);
                vscode.window.showInformationMessage('PDF compiled successfully');
            }
        });
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}