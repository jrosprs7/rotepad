# Rotepad architecture

## Shared editor

Rotepad.html contains the standalone HTML, CSS, JavaScript and embedded WOFF2 fonts. It runs directly from a browser without a server. The formatted editor uses contenteditable and browser editing commands; the source editor uses a textarea. A custom Markdown parser and serializer connect the views.

Several incremental function wrappers and event handlers coexist. Inspect the complete relevant chain before editing. List exits use keydown/beforeinput handling; quote exits must not consume list-item events. Text zoom changes the editor size variable, not body zoom. Source Find/Outline scrolling accounts for that size.

The inline parser treats runs of three or more equals signs as literal text and uses distinct double-equals delimiters for highlights. The rich-text serializer escapes literal equals signs, while MARK nodes emit highlight delimiters; escaped equals signs are decoded by inline parsing and link labels. This preserves both literal typed syntax and intentional highlighting through reopening without changing stored notes on load.

Hyphen runs do not parse as horizontal rules. Explicit HR nodes and the divider command use `***` instead. There is no automatic hyphen-to-em-dash handler: typed/pasted hyphens stay literal and Backspace performs normal deletion. Existing em-dash characters are not rewritten.

Formatted typing does not convert the `> ` block prefix, even with optional auto-Markdown enabled. The rich-text serializer escapes literal greater-than signs as `\>`; inline parsing and link labels decode that escape. Deliberate BLOCKQUOTE nodes still serialize with an unescaped leading `> `, and the Markdown parser still recognizes those quotes. This keeps typed literal text stable through reopening without removing existing or explicitly applied quotes.

tools/formatted-editor.js, tools/responsive-toolbar.js and tools/numbered-lists.js are editable references to code embedded in Rotepad.html. Updating a reference alone does not update the app; keep both copies synchronized. Numbered-list continuation works independently of optional automatic inline Markdown conversion.

Typed numbered paragraphs convert to semantic lists on Enter at the actual DOM caret, using a bookmark to preserve inline boundaries. Typed `-`, `*` and `+` prefixes do not: neither the Enter handler nor the optional auto-Markdown space rule converts them. The rich-text serializer escapes a line-leading `-`/`+` followed by a space or tab in paragraphs as `\-`/`\+` (`*` is already escaped), and inline parsing decodes that line-leading escape, so literal text cannot reopen as a bullet. Markdown source, imports and the Bullet list command still produce real bullets. Existing semantic items retain native splitting; explicit handlers handle marker removal and nested outdent. keydown and beforeinput share typed-list logic. The Markdown parser groups indented continuation lines with their item, preserving ordinary Shift+Enter lines during view/reload conversion.

Twelve Iosevka faces (three families, four styles each) account for much of the HTML file size. Preserve their embedded data. Only Iosevka Fixed SS03 Extended is offered in the menu; it is the default. Its native font tables omit the contextual joining responsible for connected hyphens in Iosevka SS03 Extended. CSS does not disable contextual features. Font-default migration version 3 and the font setter replace removed/empty selections with Fixed Extended while retaining standard fonts and zoom. The two older families remain embedded for compatibility; no font payload was deleted when their menu entries were removed. tools/embed-fonts.py reproduces font embedding from the required source TTC using fonttools and brotli; the source font and conversion environment must be available before regenerating.

The shared formatted-editor helper handles Tab only inside the editing surfaces: insert text tabs, indent selected blocks/list items, or outdent with Shift+Tab. The earlier table handler retains cell navigation. Native tab spans are handled when removing indentation; a caret bookmark protects list indentation while normalizing nested list markup. Formatted tab stops use four columns, matching the source editor.

## Desktop assembly

desktop/prepare.cjs reads the root HTML and writes desktop/app/Rotepad.html. It inserts library-merge.cjs and library-bootstrap.js before editor initialization, enables compact desktop menus, and appends integration.js, library.js, single-row.js, note-tabs.js, shell-ui.js and print-preview.js. It also copies the font license and icon assets. The preparation step does not edit the root HTML.

| Source | Responsibility |
| --- | --- |
| desktop/main.cjs | Electron lifecycle, native dialogs, validated IPC, serialized persistence and printing |
| desktop/preload.cjs | Restricted renderer bridge exposed as rotDesktop |
| desktop/library-bootstrap.js | Load desktop library state before shared editor initialization |
| desktop/library-merge.cjs | Shared three-way merge for concurrent saves, incoming changes and cached draft recovery |
| desktop/integration.js | Native integration and desktop adaptations |
| desktop/library.js | Library, workspace membership, autosave and close coordination |
| desktop/markdown-store.cjs | Managed Markdown files, stable mapping, names, migration and reconciliation |
| desktop/single-row.js | Desktop header/toolbar arrangement and screen-only minimalist styling for workspace, controls and status bar |
| desktop/note-tabs.js | Compact tabs for this window's open notes, keyboard navigation, note-option access and tab-strip styling |
| desktop/shell-ui.js | Windows title-bar drag regions and theme, About dialog, and default-app Settings entry |
| desktop/installer.nsh | Named Open with handlers, Default Apps registration and optional Windows Settings finish-page action |
| desktop/print-preview.js | Print preview UI and print/PDF workflow |

Generated desktop/app, dist, dependencies and test profiles are ignored by Git. Regenerate desktop/app after source changes before launching development Electron tests or packaging.

The light theme is Pure Ink. Its colors are the light values of the CSS variables in Rotepad.html plus a block of `html:not([data-theme=dark])` overrides for colors that were previously hard-coded (primary/pressed buttons, dialog, focus, selection and grain). The paper grain is a `--grain` background image applied only to chrome elements (header, toolbar, sidebar, footer, find panel, outline and the desktop tab strip). single-row.js sets the desktop light chrome and tab-strip colors, and main.cjs sets the matching Windows caption-button overlay colors. Dark-theme values are separate and unchanged.

The desktop has a 34px tab strip above its 38px command row. On Windows, titleBarStyle hidden with titleBarOverlay puts this strip in the title bar beside native caption buttons. shell-ui.js reserves the Window Controls Overlay safe area, marks empty space as draggable and tab controls as non-draggable, and follows the current theme. Focus mode retains the Windows title bar but hides tabs; print media hides the entire strip. Other platforms retain their standard frame.

note-tabs.js wraps renderNotes and reuses existing note activation, creation, options and close operations; keyed tab nodes retain focus across saves. prefs.tabOrder is window-local workspace metadata, filtered against open/non-Trash notes. Closing the active tab uses that order to select a neighbor. The old title field remains as the editor's internal title binding, with visible renaming moved to tab options. A resize observer keeps the selected tab visible. single-row.js moves the existing sidebar and clear-format buttons, retaining their original listeners and formatting behavior.

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

The main process serializes library-save operations. Each window submits its snapshot and last acknowledged baseline; library-merge.cjs applies only its changes to the current library. Independent edits are combined. Competing text/title edits, edits against Trash, or edits to removed notes preserve the local version in a new conflict copy. Concurrent history merging retains the spacing and count limits. Managed Markdown files save first, followed by library.json. The renderer acknowledges success only after both finish. Conflict IDs survive a failed write and retry in the owning window. Existing file writes use temporary replacement; new names use exclusive creation. Rename/Trash transitions create the destination and commit the index before removing the old managed copy.

Renderer changes are coalesced, with a flush before normal close. Write failure keeps the window open for retry or backup. Browser localStorage acts as a recovery cache in desktop, not the sole durable copy.

The primary window uses rotepad.library.v2; additional windows use rotepad.library.v2.window.<slot>. Each cached snapshot contains its desktopBase in the same localStorage write so recovery cannot combine mismatched generations. The shared editor accepts the desktop-provided key, retaining its original browser key otherwise. Startup merges cached drafts from additional windows before clearing those secondary caches. Old caches without a baseline retain the legacy timestamp/reconciliation migration. A restart restores one workspace, not the count of previously open windows.

Successful saves broadcast the canonical library to other registered windows. Renderers merge it with pending edits while keeping their own open-note membership, positions and view/preferences. New notes from another window appear in Library without opening automatically. Incoming updates wait for an in-flight save, composition or open dialog to finish. Unchanged note objects retain identity across acknowledgments for asynchronous note actions. Remote content changes invalidate that note's local Undo stack; edits to other notes leave the active editor and selection alone.

Startup reads managed Markdown and preserves conflicting recovered text in a separate recovered-draft note. Missing managed files may recover from stored text. This is startup reconciliation: there is no live external-file watcher. Untracked files in the notes folder require Import Markdown.

Close note and Move to Trash are separate operations. Closing retains the note in Library. Desktop Ctrl+S flushes managed files and metadata; Ctrl+Shift+S exports another copy. Historical 0.4.x close prompts and 0.5.x JSON-only saving descriptions are superseded.

### History and backups

History retains up to 25 spaced savepoints per note, at least 180,000 ms apart. Undo covers recent edits. Restore supports replacing the current note or creating a copy; displaced text can be preserved in a before-restore note during cooldown.

JSON backups use rotepad-backup version 1 and include revisions and Trash; restores add independent copies. Markdown files contain current text without the app's history.

## Security and printing

Electron runs with nodeIntegration disabled, contextIsolation enabled and sandbox enabled. One main process retains the single-instance lock and owns a registry of BrowserWindows. New window and subsequent application launches create registered windows within that process; file launches open in the new window. The last closed window ends the process. main.cjs validates each IPC sender against the registry, main frame and app URL. The preload exposes specific operations rather than unrestricted filesystem access. Show in File Explorer resolves a note ID through the managed mapping instead of accepting renderer-supplied paths.

The desktop-info IPC reads app.getVersion for About. Title-bar theme IPC accepts only light/dark. The default-app action opens a fixed Windows Settings URI, never a renderer-provided URL; installed builds target the registered Rotepad application and portable builds use the general page. Startup argument filtering accepts .md/.markdown/.txt case-insensitively, retaining the existing managed-copy import behavior. Installer registration and Windows consent are described in the [desktop guide](../desktop/README.md#windows-integration).

Close state, parented native dialogs, opened-file tokens and print previews belong to their originating window. File-bind and print-output tokens cannot be reused by another window. Library and import/export-mapping writes are serialized in the main process. The default notes folder is shared, and changes are broadcast to open windows.

Print preview freezes the prepared document, waits for fonts and obtains PDF output from the main process. PDF export uses the cached preview bytes; native printing opens system settings and may differ based on printer options. Empty-workspace printing is guarded in desktop 0.7.0 and later. Physical printer output remains unverified.

Development tests can select an isolated profile through ROTEPAD_TEST_DATA. Packaged launches ignore that override; never treat it as a guarantee of isolation for a shipped executable. See [testing](TESTING.md).

## Product boundaries

The Windows desktop app and standalone browser file share editing behavior but have different storage integrations. Neither is a hosted Site. Mobile sync, live external-file watching, macOS/Linux builds, signing and automatic updates are not implemented. Remaining issues and proposed work are tracked in the [roadmap](../ROADMAP.md).
