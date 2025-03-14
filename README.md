# Code to Markdown VS Code Extension

The "Code to Markdown" extension (`code2md`) lets you convert selected code files in VS Code into a single Markdown file. Each file's content is wrapped in a syntax-highlighted code block, making it ideal for documentation, sharing, or archiving code snippets.

## Why Use Code to Markdown for AI Prompts?

Interacting with AI assistants effectively requires optimizing both your time and costs. The `code2md` extension is specifically designed to prepare your code in the most AI-friendly format.

### Why Markdown (.md) is the Best Choice for AI Prompts

- **Efficient Token Usage**  
  Markdown uses a lightweight syntax (e.g., `#` for headers, ``` for code blocks) that adds minimal extra characters compared to raw text. This keeps token counts low, as AI models process every character—including formatting—as a token. Unlike heavier formats like PDFs or HTML, which include complex markup or metadata, Markdown focuses on the code and context, maximizing the space for meaningful content.

- **Easy for AI to Understand**  
  As a plain-text format with simple markup, Markdown is straightforward for AI to parse. It avoids the need to extract text from binary formats (like PDFs) or navigate intricate structures. Plus, adding language identifiers (e.g., ```python) to code blocks gives the AI clear context about the programming language, improving its ability to provide accurate responses without extra clarification.

- **Organized and Readable**  
  Markdown lets you structure your input with headers, sections, and comments, making it easy to present large codebases clearly. This helps both you and the AI navigate the content efficiently, reducing confusion and follow-up questions.

- **Faster Processing**  
  Since Markdown requires no extraction or preprocessing (unlike PDFs, which might need OCR), the AI can ingest it directly. Its clean format also allows the AI to load and understand context quickly, speeding up response times.

### How the "code2md" VS Code Extension Saves Tokens, Time, and Money

- **One-Click Markdown Creation**  
  The "code2md" extension automatically combines selected code files into a single `.md` file, complete with headers and language-specific code blocks (e.g., ```javascript). This saves you the effort of manually formatting your code, ensuring it's AI-ready in seconds.

- **Token Optimization**  
  By producing a clean, structured Markdown file, "code2md" eliminates unnecessary data or formatting that could inflate token counts. This efficiency reduces the number of tokens sent to the AI, directly lowering costs since many AI services charge per token.

- **Reduced Processing Time**  
  The structured output from "code2md" helps the AI grasp your codebase faster, leading to quicker and more accurate responses. Fewer misunderstandings mean less back-and-forth, saving both time and additional token usage.

- **Cost Savings for Programmers**  
  With lower token counts and faster interactions, you spend less on AI services. For programmers paying for AI coding assistance, this translates to tangible savings—both in money (fewer tokens billed) and time (less effort refining prompts or fixing responses).

## Features
- Generate Markdown files from multiple files via the Command Palette or Explorer context menu.
- **Table of Contents**: Automatically generates a TOC with links to each included file.
- Unique file naming with timestamps and versioning to prevent overwrites.
- Syntax highlighting based on file extensions (e.g., `.ts` → `typescript`, `.py` → `python`, `.rs` → `rust`).
- Display of relative file paths to provide better context for included files.
- Detailed logging for troubleshooting during development.

## Installation
Follow these steps to set up and test the extension locally:

1. **Clone or Create the Project**:
   - Clone this repository or create a folder at `C:\dev\code2md`.
   - Ensure you have `package.json` and `extension.ts` in the `src` subdirectory.

2. **Install Dependencies**:
   - Open a terminal in `C:\dev\code2md`.
   - Run `npm install` to install the required dev dependencies (`@types/node`, `@types/vscode`, `typescript`).

3. **Compile the Extension**:
   - Run `npm run compile` to build `out/extension.js` from `src/extension.ts`.
   - Alternatively, use `npm run watch` to automatically recompile on changes.

4. **Test the Extension**:
   - Open `C:\dev\code2md` in VS Code.
   - Press `F5` to launch a new VS Code window with the extension loaded.
   - Use the Command Palette or context menu to test Markdown generation.

## Usage

### Via Command Palette
1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS).
2. Type "Generate Markdown from Files" and select it.
3. Choose one or more files in the file picker.
4. A Markdown file (e.g., `2023-10-25_143022_MyProject_v01.md`) will be created in your workspace root or the directory of the first selected file.

### Via Folder Selection (Recommended for Multiple Files)
1. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P` on macOS).
2. Type "Generate Markdown from Folder" and select it.
3. Choose a folder containing the files you want to include.
   - **Important**: Select the folder itself, not individual files within it.
4. Enter the file extensions you want to include (e.g., `rs,toml,html`).
5. The extension will recursively find all matching files and generate a Markdown file with all of them.

### Via Context Menu
1. In the Explorer, select one or more files using `Ctrl + Click` for multiple selections.
2. Right-click and choose "Generate Markdown from Selected Files."
3. The Markdown file with a Table of Contents and all selected files will be generated in your workspace root.

**Note**: Due to VS Code context menu limitations, if you're having trouble with multiple file selection, please use the "Generate Markdown from Folder" command instead.

### Output Format
The generated Markdown includes:
- A project title based on the workspace name
- A Table of Contents with links to each file section
- File sections with relative paths and syntax-highlighted code blocks

## Troubleshooting
- **Log Files**: The extension now creates detailed log files in your workspace root with the naming pattern `code2md_YYYY-MM-DD_HHMMSS.log`. These logs contain detailed information about each operation and can help diagnose issues.

- **Output Panel**: Open the Output panel in VS Code (`Ctrl+Shift+U`), select "Extension Host" from the dropdown, and look for `[code2md]` prefixed messages.

- **Common Issues**:
  - **No files selected**: 
    - For the "Generate Markdown from Files" command, make sure to select files in the file picker.
    - For the "Generate Markdown from Folder" command, make sure to select a folder, not individual files.
    - For the context menu command, make sure to select files before right-clicking.
  
  - **Multiple file selection issues**: 
    - If selecting multiple files with Ctrl+Click doesn't work, use the "Generate Markdown from Folder" command instead.
    - Make sure to right-click on one of the selected files, not outside the selection.
    - Some VS Code versions may have limitations with multiple file selection in the context menu.
  
  - **Permission errors**: Check that VS Code has write access to the output directory.

## Development
- **Build**: `npm run compile` or `npm run watch`.
- **Folder Structure**:
```
code2md/
├── src/                 # Source code
│   └── extension.ts     # Main extension code
├── out/                 # Compiled JavaScript (generated)
│   ├── extension.js     # Compiled extension
│   └── extension.js.map # Source map
├── examples/            # Example files for testing
├── node_modules/        # Dependencies (generated)
├── .vscode/             # VS Code settings
├── package.json         # Project configuration and dependencies
├── package-lock.json    # Dependency lock file
├── tsconfig.json        # TypeScript compiler configuration
└── README.md            # Project documentation
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request