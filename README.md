# Code to Markdown (Code2Markdown) Extension for Visual Studio Code

The Code2Markdown Extension lets you convert selected code files in VS Code into a single Markdown file. Each file's content is wrapped in a syntax-highlighted code block, making it ideal for documentation, sharing, or archiving code snippets. It's especially useful for preparing code in an AI-friendly format for prompts.

## Why use Code2Markdown?

### Benefits for AI Prompts
- **Efficient Token Usage**: Markdown's lightweight syntax minimizes token counts, reducing costs with AI services.
- **Easy for AI to Understand**: Plain-text format with language identifiers (e.g., ```python) helps AI parse code accurately.
- **Organized and Readable**: Structure your codebase with headers and sections for clarity.
- **Faster Processing**: Markdown requires no preprocessing, speeding up AI response times.

### How Code2Markdown Saves Time and Money
- **One-Click Markdown Creation**: Automatically formats code into Markdown with proper code blocks.
- **Token Optimization**: Clean output reduces token usage, lowering costs.
- **Reduced Processing Time**: Structured Markdown helps AI understand your code faster.
- **Cost Savings**: Lower token counts and quicker interactions save money for programmers using AI services.

## Features
- Generate Markdown files from multiple files via the Command Palette or Explorer context menu.
- **Table of Contents**: Automatically generates a TOC with links to each included file.
- Unique file naming with timestamps and versioning to prevent overwrites.
- Syntax highlighting based on file extensions (e.g., `.ts` → `typescript`, `.py` → `python`, `.rs` → `rust`).
- Display of relative file paths for better context.
- Detailed logging for troubleshooting.

## Installation from VS Code

You can install the Code2Markdown Extension directly from the VS Code Marketplace within VS Code:

1. Open VS Code.
2. Click the Extensions icon in the Activity Bar or press `Ctrl+Shift+X` (Windows/Linux) or `Cmd+Shift+X` (macOS).
3. Search for `Code2Markdown`.
4. Look for "Code2Markdown Extension" by WIZWAM.
5. Click **Install**.

Alternatively, you can install it via the VS Code Quick Open command:
1. Open Quick Open with `Ctrl+P` (Windows/Linux) or `Cmd+P` (macOS).
2. Paste the following command and press Enter:
   ```
   ext install WIZWAM.Code2Markdown-Wizwam
   ```

## Installation from GitHub Repository

To install and test the extension directly from the GitHub repository, follow these steps:

1. **Clone the Repository**:
   - Clone the repository to your local machine:
     ```bash
     git clone https://github.com/lukejmorrison/code2md.git
     ```
   - Alternatively, download the repository as a ZIP file and extract it to a folder named `code2md`.

2. **Install Dependencies**:
   - Open a terminal in the `code2md` directory.
   - Run the following command to install the required dependencies:
     ```bash
     npm install
     ```

3. **Compile the Extension**:
   - Compile the TypeScript code into JavaScript:
     ```bash
     npm run compile
     ```
   - Alternatively, use `npm run watch` to automatically recompile on changes.

4. **Test the Extension in VS Code**:
   - Open the `code2md` folder in VS Code.
   - Press `F5` to launch a new VS Code window with the extension loaded.
   - Use the Command Palette or context menu to test Markdown generation.

## Usage

### Using the Command Palette
1. Open the Command Palette (`Ctrl+Shift+P` on Windows/Linux, `Cmd+Shift+P` on macOS).
2. Type `Generate Markdown from Files` and select it.
3. Choose one or more files in the file picker.
4. A Markdown file (e.g., `2023-10-25_0230PM_MyProject_v01.md`) will be created in the `codereview` folder.

### Using Folder Selection (Recommended for Multiple Files)
1. Open the Command Palette (`Ctrl+Shift+P` on Windows/Linux, `Cmd+Shift+P` on macOS).
2. Type `Generate Markdown from Folder` and select it.
3. Choose a folder containing the files you want to include.  
   **Note**: Select the folder itself, not individual files within it.
4. Enter the file extensions to include (e.g., `rs,toml,html`).
5. The extension will recursively find all matching files and generate a Markdown file in the `codereview` folder.

### Using the Context Menu
1. In the Explorer, select one or more files using `Ctrl+Click` (Windows/Linux) or `Cmd+Click` (macOS) for multiple selections.
2. Right-click and choose `Generate Markdown from Selected Files`.
3. A Markdown file with a Table of Contents and all selected files will be generated in the `codereview` folder:
   ```
   your-project/
   └── codereview/
       ├── 2025-03-19_0257PM_MyProject_v01.md    # Generated markdown file
       └── 2025-03-19_0257PM_MyProject_v01.log    # Corresponding log file
   ```
   **Note**: If multiple file selection doesn't work, use the "Generate Markdown from Folder" command instead.

### Output Format
The generated Markdown includes:
- A project title based on the workspace name.
- A Table of Contents with links to each file section.
- File sections with relative paths and syntax-highlighted code blocks.
- All output files are stored in a `codereview` folder:
  ```
  your-project/
  ├── codereview/
  │   ├── 2025-03-19_0257PM_MyProject_v01.md    # Generated markdown file
  │   └── 2025-03-19_0257PM_MyProject_v01.log    # Corresponding log file
  ├── src/
  └── ...
  ```

## Troubleshooting
- **Log Files**: Check detailed logs in the `codereview` folder (e.g., `codereview/2025-03-19_0257PM_MyProject_v01.log`).
- **Output Location**: All generated files are stored in a `codereview` folder in your workspace.
- **Output Panel**: Open the Output panel in VS Code (`Ctrl+Shift+U`), select "Extension Host," and look for `[code2md]` messages.
- **Common Issues**:
  - **No files selected**: Ensure you select files or a folder as required by the command.
  - **Multiple file selection issues**: Use the "Generate Markdown from Folder" command if `Ctrl+Click` fails.
  - **Permission errors**: Verify VS Code has write access to create and write to the `codereview` directory.

## Development
- **Build**: Run `npm run compile` or `npm run watch`.
- **Folder Structure**:
  ```
  code2md/
  ├── src/                 # Source code
  │   └── extension.ts     # Main extension code
  ├── codereview/          # Generated markdown and log files
  │   ├── YYYY-MM-DD_HHMMAM_Project_v01.md
  │   └── YYYY-MM-DD_HHMMAM_Project_v01.log
  ├── out/                 # Compiled JavaScript (generated)
  │   ├── extension.js     # Compiled extension
  │   └── extension.js.map # Source map
  ├── examples/            # Example files for testing
  ├── images/              # Extension icon
  │   └── code2md-icon.png
  ├── node_modules/        # Dependencies (generated)
  ├── .vscode/             # VS Code settings
  ├── package.json         # Project configuration and dependencies
  ├── package-lock.json    # Dependency lock file
  ├── tsconfig.json        # TypeScript compiler configuration
  └── README.md            # Project documentation
  ```

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.