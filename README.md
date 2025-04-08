# Code2Markdown by Wizwam

Convert your code files into a consolidated markdown document for efficient communication with AI tools like GitHub Copilot.

## Features

- Generate markdown files from multiple code files via:
  - Command Palette
  - Explorer context menu
  - Folder selection
- Automatic Table of Contents generation
- Syntax highlighting based on file extensions
- Version control friendly output in `codereview` folder
- Detailed logging for troubleshooting

## Usage

### Using the Command Palette
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
2. Type "Generate Markdown from Files"
3. Select files in the file picker
4. Find your generated markdown in the `codereview` folder

### Using Folder Selection (Recommended for Multiple Files)
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
2. Type "Generate Markdown from Folder"
3. Select a folder containing your code files
4. Enter file extensions to include (e.g., "ts,js,py,java")
5. Find your generated markdown in the `codereview` folder

### Using the Context Menu
1. Select one or more files in the Explorer
2. Right-click and choose "Generate Markdown from Selected Files"
3. Find your generated markdown in the `codereview` folder

## Output Format

Generated files are stored in a `codereview` folder:
```
your-project/
├── codereview/
│   ├── YYYY-MM-DD_HHMMAM_Project_v01.md    # Generated markdown
│   └── YYYY-MM-DD_HHMMAM_Project_v01.log    # Log file
└── ...
```

The markdown includes:
- Project title
- Table of Contents with links
- File sections with syntax-highlighted code blocks

## Requirements

- Visual Studio Code version 1.85.0 or higher

## Extension Settings

This extension doesn't require any configuration.

## Known Issues

- None reported

## Release Notes

### 1.0.7

- Add dedicated `codereview` folder for output files
- Improve file naming with timestamps
- Add detailed logging
- Fix multiple file selection issues

## Contributing

Found a bug or have a feature request? Please visit our [GitHub repository](https://github.com/lukejmorrison/code2md).

## License

This extension is licensed under the [MIT License](LICENSE).