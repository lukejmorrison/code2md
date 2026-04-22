# Changelog

## [1.2.1] - 2026-04-22
### Changed
- Added `.vscodeignore` to exclude dev files (src, docs, AGENTS.md, etc.) from VSIX, reducing package noise.
- Aligned `@types/vscode` dev dependency to `^1.116.0` and bumped `engines.vscode` to `^1.116.0` (latest types).

## [1.2.0] - 2026-04-21
### Changed
- Bumped minimum VS Code engine to `^1.90.0` for current compatibility and to suppress deprecation warnings.
- Clean packaging with updated `vsce`.

### Added
- This CHANGELOG.md for better release hygiene (per PROJECTS.md).

## [1.1.29] - 2025-06-30
- Initial stable release (prior version).

See Git history for full details.