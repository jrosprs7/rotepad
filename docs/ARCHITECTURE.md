# Rotepad architecture

## Shared editor

Rotepad.html contains the standalone HTML, CSS, JavaScript and embedded WOFF2 fonts. It runs directly from a browser without a server. The formatted editor uses contenteditable and browser editing commands; the source editor uses a textarea. A custom Markdown parser and serializer connect the views.

Several incremental function wrappers and event handlers coexist. Inspect the complete relevant chain before editing. List exits use keydown/beforeinput handling; quote exits must not consume list-item events. Text zoom changes the editor size variable, not body zoom. Source Find/Outline scrolling accounts for that size.

tools/formatted-editor.js, tools/responsive-toolbar.js and tools/numbered-lists.js are editable references to code embedded in Rotepad.html. Updating a reference alone does not update the app; keep both copies synchronized. Numbered-list continuation works independently of optional automatic inline Markdown conversion.

Eight Iosevka faces (two families, four styles each) account for much of the HTML file size. Preserve their embedded data. tools/embed-fonts.py reproduces font embedding from the required source TTC using fonttools and brotli; the source font and conversion environment must be available before regenerating.

## Desktop assembly

desktop/prepare.cjs reads the root HTML and writes desktop/app/Rotepad.html. It inserts library-bootstrap.js before editor initialization, enables compact desktop menus, and appends integration.js, library.js, single-row.js and print-preview.js. It also copies the font license and icon assets. The preparation step does not edit the root HTML.

| Source | Responsibility |
| --- | --- |
| desktop/main.cjs | Electron lifecycle, native dialogs, validated IPC, serialized persistence and printing |
| desktop/preload.cjs | Restricted renderer bridge exposed as rotDesktop |
| desktop/library-bootstrap.js | Load desktop library state before shared editor initialization |
| desktop/integration.js | Native integration and desktop adaptations |
| desktop/library.js | Library, workspace membership, autosave and close coordination |
| desktop/markdown-store.cjs | Managed Markdown files, stable mapping, names, migration and reconciliation |
| desktop/single-row.js | Desktop header and toolbar arrangement |
| desktop/print-preview.js | Print preview UI and print/PDF workflow |

Generated desktop/app, dist, dependencies and test profiles are ignored by Git. Regenerate desktop/app after source changes before launching development Electron tests or packaging.

## Storage and recovery

### Browser

The library uses localStorage key rotepad.library.v2, with migration from rotepad.draft.v1. It holds notes, history, preferences and metadata. Supporting browsers use the File System Access API for file picking and same-file saving. Handles are cached per note and persisted in IndexedDB rotepad-file-links / handles; permissions may need renewal. Unsupported browsers offer an explicit download fallback.

A save is acknowledged only after the output stream closes successfully. Browser storage is scoped to a browser profile/origin. Transfer data with JSON Backup/Restore.

### Desktop

Since 0.6.0, current note content lives in one managed .md file per note. The default location is Documents/Rotepad Docs, or the user's saved preference. Existing notes retain their locations when the default changes. Untouched empty Untitled notes wait for content or a title before file creation. Duplicate names receive safe suffixes; Trash uses a .Trash subfolder under the note's root.

The normal profile is %APPDATA%/Rotepad:

- library.json: metadata, preferences, revisions, workspace and recovery text.
- managed-notes.json: stable note-ID-to-file mapping.
- library-before-markdown.json: retained pre-migration library snapshot.
- desktop-settings.json: default notes folder.
- note-files.json: older import/export associations, separate from managed-file mapping.

The main process serializes library-save operations. Managed Markdown files save first, followed by library.json. The renderer acknowledges success only after both finish. Existing file writes use temporary replacement; new names use exclusive creation. Rename/Trash transitions create the destination and commit the index before removing the old managed copy.

Renderer changes are coalesced, with a flush before normal close. Write failure keeps the window open for retry or backup. Browser localStorage acts as a recovery cache in desktop, not the sole durable copy.

Startup reads managed Markdown and preserves conflicting recovered text in a separate recovered-draft note. Missing managed files may recover from stored text. This is startup reconciliation: there is no live external-file watcher. Untracked files in the notes folder require Import Markdown.

Close note and Move to Trash are separate operations. Closing retains the note in Library. Desktop Ctrl+S flushes managed files and metadata; Ctrl+Shift+S exports another copy. Historical 0.4.x close prompts and 0.5.x JSON-only saving descriptions are superseded.

### History and backups

History retains up to 25 spaced savepoints per note, at least 180,000 ms apart. Undo covers recent edits. Restore supports replacing the current note or creating a copy; displaced text can be preserved in a before-restore note during cooldown.

JSON backups use rotepad-backup version 1 and include revisions and Trash; restores add independent copies. Markdown files contain current text without the app's history.

## Security and printing

Electron runs with nodeIntegration disabled, contextIsolation enabled and sandbox enabled. main.cjs validates IPC sender, main frame and app URL. The preload exposes specific operations rather than unrestricted filesystem access. Show in File Explorer resolves a note ID through the managed mapping instead of accepting renderer-supplied paths.

Print preview freezes the prepared document, waits for fonts and obtains PDF output from the main process. PDF export uses the cached preview bytes; native printing opens system settings and may differ based on printer options. Empty-workspace printing is guarded in desktop 0.7.0 and later. Physical printer output remains unverified.

Development tests can select an isolated profile through ROTEPAD_TEST_DATA. Packaged launches ignore that override; never treat it as a guarantee of isolation for a shipped executable. See [testing](TESTING.md).

## Product boundaries

The Windows desktop app and standalone browser file share editing behavior but have different storage integrations. Neither is a hosted Site. Mobile sync, live external-file watching, macOS/Linux builds, signing and automatic updates are not implemented. Remaining issues and proposed work are tracked in the [roadmap](../ROADMAP.md).
