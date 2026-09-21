# Rotepad

Rotepad is an offline writing application with formatted editing, Markdown source, a note library, search, history and backups. The same shared editor supports a standalone browser file and a Windows desktop application.

The desktop package version is **0.8.1**, as declared in [desktop/package.json](desktop/package.json). Windows builds are unsigned previews. macOS/Linux packaging and phone sync remain planned.

## Open Rotepad

- **Browser:** open [Rotepad.html](Rotepad.html) in a browser. No server or build is required. Browser notes are stored separately from desktop notes.
- **Windows:** after building, use the installer or portable executable in dist. See the [desktop guide](desktop/README.md) for prerequisites, build commands and launch details.

## Writing and notes

The Windows app uses a borderless writing area, one compact row of flat controls and a slim status bar. More tools remain under » and app commands under Menu. The footer's Formatted/Markdown switch remains clickable.

Formatted view is the default for fresh users. The footer switches between Formatted and Markdown; View also offers Split and Preview. Automatic Markdown conversion is optional and off by default. Formatting shortcuts, numbered lists, indentation, tables, text-only zoom, fonts and spellcheck are available.

In Formatted view, Enter continues a list or splits it at the cursor. Typed prefixes such as `1. ` or `- ` work even with automatic inline Markdown conversion off. Shift+Enter adds a line within the item. Backspace at the start of an item removes its marker while retaining its text; for a nested item it reduces the indentation by one level. Enter or Backspace on an empty top-level item exits the list; on an empty nested item it moves out one level. Backspace within text deletes normally.

On desktop, notes automatically save to managed Markdown files. Ctrl+S flushes pending saves. Closing a note keeps it in Library; moving it to Trash allows recovery. The app restores workspace and editing position on launch, subject to the [known issues](ROADMAP.md#known-workspace-issues).

Import Markdown creates a managed copy; Export Markdown creates an additional copy. Opening an existing managed file reuses its note. The default notes folder is Documents/Rotepad Docs unless changed in Settings; changing it does not relocate existing notes.

Desktop Ctrl+P opens print preview with paper size, orientation and PDF export. Physical printer output still needs manual verification.

## Data and portability

Desktop Markdown files hold current text. The app profile holds workspace information, history, mappings and recovery text. Browser storage is specific to its browser profile and origin; browser file saving depends on browser support and permissions.

Use Backup/Restore to transfer browser notes to desktop or to another browser. Markdown export does not include history. Keep separate backups. External files are not watched live, dropping a file into the notes folder does not import it, and phone synchronization is not implemented.

See [storage details](docs/ARCHITECTURE.md#storage-and-recovery) before changing data handling.

## Project documentation

- [AGENTS.md](AGENTS.md): standing instructions for Codex.
- [Architecture](docs/ARCHITECTURE.md): source layout, storage and implementation constraints.
- [Testing](docs/TESTING.md): prerequisites, commands and verification limits.
- [Editing behavior skill](skills/rotepad-editing-behavior/SKILL.md): interaction rules and regression scenarios for future editor work.
- [Regression review skill](skills/rotepad-regression-review/SKILL.md): feature coverage, boundary scenarios and evidence required when checking updates.
- [Desktop development](desktop/README.md): Electron builds and Windows packaging.
- [Roadmap](ROADMAP.md): remaining issues and proposed work.
- [Changelog](changelog.md): completed changes and historical verification.
- [Archived handoff](docs/archive/HANDOFF-2026-09-20.md) and [0.5.1 QA report](docs/archive/QA-0.5.1.md): historical context, not current instructions.

Embedded Iosevka fonts and their license are included in [FONT-LICENSE.txt](FONT-LICENSE.txt). No font installation or network access is required to use them.
