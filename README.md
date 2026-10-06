# Rotepad

Rotepad is an offline writing application with formatted editing, Markdown source, a note library, search, history and backups. The same shared editor supports a standalone browser file and a Windows desktop application.

The desktop package version is **0.11.0**, as declared in [desktop/package.json](desktop/package.json). Windows builds are unsigned previews. macOS/Linux packaging and phone sync remain planned.

## Open Rotepad

- **Browser:** open [Rotepad.html](Rotepad.html) in a browser. No server or build is required. Browser notes are stored separately from desktop notes.
- **Windows:** [download the 0.11.0 installer](https://github.com/jrosprs7/rotepad/releases/download/v0.11.0/Rotepad-0.11.0-Setup.exe), or visit the [testing release](https://github.com/jrosprs7/rotepad/releases/tag/v0.11.0) for details. This is an unsigned Windows x64 preview. For building locally, see the [desktop guide](desktop/README.md).

## Writing and notes

The Windows app uses a borderless writing area, note tabs inside the title bar beside the native window buttons, one compact toolbar, and a short status bar. Tabs and toolbar have separate backgrounds from the writing area. Drag the unused title-bar space to move the window. The sidebar button is at the far left of the toolbar. More tools remain under » and app commands under Menu. The footer's Formatted/Markdown switch remains clickable. Focus mode hides the tabs but retains the title bar and window controls.

Open notes appear as tabs in each window. Click a tab to switch, **+** or **Ctrl+N** to create a note, and a tab's **×** or **Ctrl+W** to close it while keeping it in Library. Double-click a tab (or right-click it) for note options and renaming. **Ctrl+Tab / Ctrl+Shift+Tab** cycles between open notes; a focused tab also supports arrow keys, Home/End and F2 for renaming. Long tab rows scroll horizontally. Closing the active tab selects the next tab, or the previous one at the end. Reopening a note from Library adds its tab at the end.

The **Remove formatting** toolbar button (the T× icon) removes inline formatting from selected text, preserving paragraphs and lists. It supports Undo and works in Formatted and Markdown/Split views; it is unavailable in Preview or without a selection.

Formatted view is the default for fresh users. The footer switches between Formatted and Markdown; View also offers Split and Preview. Automatic Markdown conversion is optional and off by default. Formatting shortcuts, numbered lists, indentation, tables, text-only zoom, fonts and spellcheck are available.

The Light appearance uses the **Pure Ink** palette, shared with SurBEE: near-black text and controls on an off-white paper page, a grey surrounding desk, and black pills for pressed formatting buttons and the selected view. Tabs, toolbars, the sidebar and the status bar carry a faint paper grain; the writing page stays smooth. Dark is unchanged. Settings → Appearance still offers Match computer, Light and Dark.

Equals-sign dividers such as `======` remain plain text after reopening. Highlight uses `==text==` in Markdown or the Highlight tool in Formatted view. With automatic Markdown conversion off, typing that syntax in Formatted view keeps it literal when saved and reopened.

Hyphens stay as typed: `--`, `---` and longer runs remain literal, with ordinary Backspace behavior. Automatic em-dash conversion is disabled. Hyphen-only lines do not become horizontal rules on reopening. The Horizontal divider command remains available and saves as `***` in Markdown.

In Formatted view, typing `> text` stays literal even when automatic Markdown conversion is enabled, including after saving and reopening. Use the Quote button or paragraph-style menu to create a quote deliberately. Markdown mode and imported Markdown still recognize explicit `> text` quote syntax.

The default font is **Iosevka Fixed SS03 Extended** (shown as **Iosevka Fixed Extended**), with embedded regular, bold, italic and bold italic faces. Its hyphens remain visually separate without disabling contextual font features. The two earlier Iosevka choices have been removed from the font menu; saved preferences using either adopt Fixed Extended. Standard font choices and text zoom are retained.

In Formatted view, Enter continues a list or splits it at the cursor. Typing a number prefix such as `1. ` starts a numbered list even with automatic inline Markdown conversion off. Typed `- `, `* ` and `+ ` stay plain text, even with automatic conversion on and after saving and reopening; use **Bullet list** (under ») to make bullets. Markdown view and imported Markdown still treat `- item` lines as bullets. Shift+Enter adds a line within the item. Backspace at the start of an item removes its marker while retaining its text; for a nested item it reduces the indentation by one level. Enter or Backspace on an empty top-level item exits the list; on an empty nested item it moves out one level. Backspace within text deletes normally.

On desktop, notes automatically save to managed Markdown files. Ctrl+S flushes pending saves. Closing a note keeps it in Library; moving it to Trash allows recovery. The app restores workspace and editing position on launch, subject to the [known issues](ROADMAP.md#known-workspace-issues).

Open multiple desktop windows with **Menu → File → New window**, **Ctrl+Shift+N**, or by launching Rotepad again. Each additional window starts a new blank note and shares the same Library. Open an existing note from Library to work on it alongside another note. Windows keep their own open notes, active note, view and cursor; closing one window leaves the others running. Changes appear in other windows automatically. If simultaneous edits conflict, Rotepad keeps a separate conflict copy and shows a status message. Restart restores one window and recovers pending drafts from the others; it does not reopen the previous number of windows.

Import Markdown creates a managed copy; Export Markdown creates an additional copy. Opening an existing managed file reuses its note. The default notes folder is Documents/Rotepad Docs unless changed in Settings; changing it does not relocate existing notes.

The Windows installer registers Rotepad for `.md`, `.markdown` and `.txt`. On its final page, select **Choose Rotepad for .md and .txt in Windows Settings**, then confirm the desired file defaults in Windows. This is also available later in Rotepad's Settings. Opening an external text file creates a managed Markdown copy, following the same import behavior as external Markdown files.

**Menu → Help → About Rotepad** shows the installed version and **© 2026, J.E. Rosaroso**.

Desktop Ctrl+P opens print preview with paper size, orientation and PDF export. Physical printer output still needs manual verification.

Tab inserts a tab at the text cursor (displayed with four-column tab stops). With multiple lines selected it indents them; in a list it nests the item. Shift+Tab decreases indentation. Tables retain Tab/Shift+Tab cell navigation. These editor shortcuts work in Formatted and Markdown/Split views; ordinary dialog and toolbar controls retain focus navigation.

## Data and portability

Desktop Markdown files hold current text. The app profile holds workspace information, history, mappings and recovery text. Browser storage is specific to its browser profile and origin; browser file saving depends on browser support and permissions.

Use Backup/Restore to transfer browser notes to desktop or to another browser. Markdown export does not include history. Keep separate backups. External files are not watched live, dropping a file into the notes folder does not import it, and phone synchronization is not implemented.

See [storage details](docs/ARCHITECTURE.md#storage-and-recovery) before changing data handling.

## Project documentation

- [AGENTS.md](AGENTS.md): standing instructions for coding agents ([CLAUDE.md](CLAUDE.md) imports it for Claude Code).
- [Architecture](docs/ARCHITECTURE.md): source layout, storage and implementation constraints.
- [Testing](docs/TESTING.md): prerequisites, commands and verification limits.
- [Editing behavior skill](skills/rotepad-editing-behavior/SKILL.md): interaction rules and regression scenarios for future editor work.
- [Regression review skill](skills/rotepad-regression-review/SKILL.md): feature coverage, boundary scenarios and evidence required when checking updates.
- [Desktop development](desktop/README.md): Electron builds and Windows packaging.
- [Roadmap](ROADMAP.md): remaining issues and proposed work.
- [2026-10-06 QA findings](docs/QA-2026-10-06.md): open bugs from exploratory browser testing, with reproductions.
- [Changelog](changelog.md): completed changes and historical verification.
- [Archived handoff](docs/archive/HANDOFF-2026-09-20.md) and [0.5.1 QA report](docs/archive/QA-0.5.1.md): historical context, not current instructions.

Embedded Iosevka fonts and their license are included in [FONT-LICENSE.txt](FONT-LICENSE.txt). No font installation or network access is required to use them.
