# Code to Markdown (Code2Markdown) Extension for Visual Studio Code

The Code2Markdown Extension lets you convert selected code files in VS Code into a single Markdown file. Each file's content is wrapped in a syntax-highlighted code block, making it ideal for documentation, sharing, or archiving code snippets. It's especially useful for preparing code in an AI-friendly format for prompts.

## What's New (v1.1.28)

- **Full Logging of Ignored Files/Folders**: All files and folders excluded by your ignore patterns are now logged and visible in the output/log file.
- **Improved Error and Warning Messages**: The extension now provides clearer feedback if no files are found, no workspace is open, or unsupported extensions are selected.
- **Better Context Menu and Folder Support**: Both commands now fully respect ignore patterns and log all exclusions.
- **General Bug Fixes & Improvements**: Minor bug fixes and improved error handling in scripts and extension code.

## Excluding Files and Folders from Markdown Generation

You can configure which files and folders to exclude from Markdown generation through VS Code settings:

1. Click the **cog icon** in the lower-left corner of VS Code and select **Settings**.
2. Search for `code2md.ignorePatterns`.
3. Add patterns in the same format as `.gitignore`. For example:

   ```bash
   node_modules
   test/
   *.log
   out/
   secret-config.json
   backup/**
   ```

   - To exclude a subfolder and all its contents, use the pattern `backup/**` (replace `backup` with your folder name).
4. Save your settings. These exclusions will apply when generating Markdown.

- Patterns support glob syntax (e.g., `*.log`, `folder/**`).
- Default exclusions include `node_modules`, `.git`, `out`, etc.
- **Ignored files/folders are now logged and can be reviewed in the output/log file.**

### .gitignore vs. code2md.ignorePatterns

- `.gitignore` affects version control (Git).
- `code2md.ignorePatterns` affects which files are included in Markdown generation by the extension.

### Detailed Exclusion Patterns

To give you more control over which files and folders are included in the generated Markdown, Code2Markdown supports a variety of exclusion patterns. These patterns are similar to those used in `.gitignore` files and allow you to specify exactly what should be ignored. Below, you'll find detailed explanations and examples of each pattern type.

#### 1. File or Directory Names

- **Description**: Directly specify a file or directory to ignore.
- **Examples**:
  - `secret.txt`: Ignores a file named `secret.txt`.
  - `build/`: Ignores a directory named `build`.
- **Usage**: Use this to exclude specific files or directories that you know should not be included in the Markdown output.

#### 2. Wildcards (`*`)

- **Description**: Match any sequence of characters within a single directory.
- **Examples**:
  - `*.log`: Ignores all files with the `.log` extension.
  - `temp/*`: Ignores all files directly inside the `temp` directory.
- **Usage**: Useful for excluding all files of a certain type or all files in a specific directory.

#### 3. Recursive Wildcards (`**`)

- **Description**: Match directories and their contents recursively.
- **Examples**:
  - `node_modules/**`: Ignores the entire `node_modules` directory and its contents.
  - `**/dist/`: Ignores any directory named `dist` at any level.
- **Usage**: Ideal for excluding entire directory trees, such as dependency folders or build outputs.

#### 4. Negation (`!`)

- **Description**: Include files that would otherwise be ignored.
- **Examples**:
  - `!important.config`: Ensures `important.config` is not ignored, even if it matches another pattern.
- **Usage**: Use this to make exceptions for specific files that should be included despite broader ignore rules.

#### 5. Directory-Specific Patterns

- **Description**: Limit patterns to specific directories.
- **Examples**:
  - `logs/*.log`: Ignores `.log` files only in the `logs` directory.
  - `src/**/*.ts`: Ignores `.ts` files in `src` and its subdirectories.
- **Usage**: Useful for excluding files of a certain type only within specific directories.

#### 6. Anchored Patterns (`/`)

- **Description**: Match only at the root of the workspace.
- **Examples**:
  - `/config.json`: Ignores only the `config.json` file in the root directory.
  - `/build/`: Ignores only the `build` directory in the root directory.
- **Usage**: Use this to exclude files or directories only at the top level of your project.

#### 7. Character Classes (`[ ]`)

- **Description**: Match specific characters or ranges.
- **Examples**:
  - `file[0-9].txt`: Ignores files like `file1.txt`, `file2.txt`, etc.
  - `image.[png|jpg]`: Ignores `image.png` and `image.jpg`.
- **Usage**: Useful for excluding files with names following a specific pattern.

#### 8. Range Negation (`[^ ]`)

- **Description**: Match characters not in the specified set.
- **Examples**:
  - `[^a-z].txt`: Ignores files that don't start with a lowercase letter.
- **Usage**: Use this to exclude files that don't match a certain naming convention.

#### 9. Escaping Special Characters (`\`)

- **Description**: Match special characters literally.
- **Examples**:
  - `\*.txt`: Ignores a file named `*.txt`.
  - `logs[\[]`: Ignores a directory named `logs[`.
- **Usage**: Necessary when you need to exclude files or directories with names containing special characters.

**Note on Pattern Order**: Patterns are applied in the order they appear in the `code2md.ignorePatterns` setting. Later patterns can override earlier ones, especially when using negation (`!`).

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
- **Workspace Cleanup**: Use provided PowerShell scripts to keep your project tidy and ready for publishing.

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

   ```text
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

   ```tree
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

  ```tree
  your-project/
  ├── codereview/
  │   ├── 2025-03-19_0257PM_MyProject_v01.md    # Generated markdown file
  │   └── 2025-03-19_0257PM_MyProject_v01.log    # Corresponding log file
  ├── src/
  └── ...
  ```

## VS Code Selection Limitations

**Important:** Due to limitations in the VS Code API, you cannot select both files and folders at the same time in a single dialog. When using the Command Palette command `Code2MD: Generate from Files or Folders`, you will be prompted to choose either files or folders, not both. If you select both files and folders in the Explorer and use the context menu, only files will be processed.

- The file picker allows multiple file selection, but not folders at the same time.
- The folder picker allows multiple folder selection, but not files at the same time.
- The context menu command (`Code2MD: Generate from Selection (If both file and folders are selected only files will be processed) (Context Menu)`) will process only files if both files and folders are selected.
- This is a limitation of the VS Code API and not the extension itself.

## Workspace Cleanup & Publishing

- **Cleanup Before Publishing**: Use your own local scripts or manual steps to move temp/log files to backup, clean dependencies, and generate a build checklist if needed.
- **Remove Unneeded Files**: Use your own local scripts or manual steps to delete old VSIX, backup, codereview, examples, and test scripts if needed.
- **Publish**: Use `vsce` to build, package, and publish to the VS Code Marketplace and GitHub.

## Troubleshooting

- **Log Files**: Check detailed logs in the `codereview` folder (e.g., `codereview/2025-03-19_0257PM_MyProject_v01.log`).
- **Output Location**: All generated files are stored in a `codereview` folder in your workspace.
- **Output Panel**: Open the Output panel in VS Code (`Ctrl+Shift+U`), select "Extension Host," and look for `[code2md]` messages.
- **Common Issues**:
  - **No files selected**: Ensure you select files or a folder as required by the command.
  - **Multiple file selection issues**: Use the "Generate Markdown from Folder" command if `Ctrl+Click` fails.
  - **Permission errors**: Verify VS Code has write access to create and write to the `codereview` directory.
  - **TypeScript/Build Errors**: Run `npm run compile` and check for errors before publishing.
  - **Cleanup Issues**: Use the provided PowerShell scripts to keep your workspace clean and avoid publishing unnecessary files.

## Development

- **Build**: Run `npm run compile` or `npm run watch`.
- **Folder Structure**:

  ```tree
  code2md/
  ├── src/                 # Source code
  │   └── extension.ts     # Main extension code
  ├── out/                 # Compiled JavaScript (generated)
  │   ├── extension.js     # Compiled extension
  │   └── extension.js.map # Source map
  ├── examples/            # Example files for testing
  ├── images/              # Extension icon
  │   └── code2md-icon.png
  ├── node_modules/        # Dependencies (generated)
  ├── .vscode/             # VS Code settings
  ├── package.json         # Project configuration and dependencies
  ├── tsconfig.json        # TypeScript compiler configuration
  └── README.md            # Project documentation
  ```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
