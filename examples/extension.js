"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const child_process = __importStar(require("child_process"));
const path = __importStar(require("path"));
function activate(context) {
    let disposable = vscode.commands.registerCommand('run-pdf-compiler.compile', (...args) => {
        let selectedFiles = [];
        if (args.length === 2 && Array.isArray(args[1]) && args[1].every(item => item instanceof vscode.Uri)) {
            // Multiple files selected
            selectedFiles = args[1].map((uri) => uri.fsPath);
        }
        else if (args.length === 1 && args[0] instanceof vscode.Uri) {
            // Single file selected
            selectedFiles = [args[0].fsPath];
        }
        else if (vscode.window.activeTextEditor) {
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
                }
                else {
                    vscode.window.showErrorMessage(`Error running script: ${stderr}`);
                }
            }
            else {
                // Log the script output
                console.log(`Script output: ${stdout}`);
                vscode.window.showInformationMessage('PDF compiled successfully');
            }
        });
    });
    context.subscriptions.push(disposable);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map