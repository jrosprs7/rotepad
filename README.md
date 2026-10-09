# Rotepad

Rotepad is an offline writing application with formatted editing, Markdown source, a note library, search, history and backups. The same shared editor supports a standalone browser file and a Windows desktop application.

The desktop package version is **0.12.3**, as declared in [desktop/package.json](desktop/package.json). Windows builds are unsigned previews. macOS/Linux packaging and phone sync remain planned.

## Open Rotepad

- **Browser:** open [Rotepad.html](Rotepad.html) in a browser. No server or build is required. Browser notes are stored separately from desktop notes.
- **Windows:** [download the 0.12.2 installer](https://github.com/jrosprs7/rotepad/releases/download/v0.12.2/Rotepad-0.12.2-Setup.exe), or visit the [testing release](https://github.com/jrosprs7/rotepad/releases/tag/v0.12.2) for details. This is an unsigned Windows x64 preview. For building locally, see the [desktop guide](desktop/README.md).

## Writing and notes

The Windows app uses a borderless writing area, note tabs inside the title bar beside the native window buttons, one compact toolbar, and a short status bar. Tabs and toolbar have separate backgrounds from the writing area. Drag the unused title-bar space to move the window. The sidebar button is at the far left of the toolbar. More tools remain under » and app commands under Menu. The footer's Formatted/Markdown switch remains clickable. Focus mode hides the tabs but retains the title bar and window controls.

Open notes appear as tabs in each window. Click a tab to switch, **+** or **Ctrl+N** to create a note, and a tab's **×** or **Ctrl+W** to close it while keeping it in Library. Double-click a tab (or right-click it) for note options and renaming. **Ctrl+Tab / Ctrl+Shift+Tab** cycles between open notes; a focused tab also supports arrow keys, Home/End and F2 for renaming. Long tab rows scroll horizontally. Closing the active tab selects the next tab, or the previous one at the end. Reopening a note from Library adds its tab at the end.

The **Remove formatting** toolbar button (the T× icon) removes inline formatting from selected text, preserving paragraphs and lists. It supports Undo and works in Formatted and Markdown/Split views; it is unavailable in Preview or without a selection. In the browser version the same command is **Clear formatting** under »: select text first, then open » and choose it. Opening » keeps your selection, and Escape closes the menu.

Formatted view is the default for fresh users. The footer switches between Formatted and Markdown; View also offers Split and Preview. Automatic Markdown conversion is optional and off by default. Formatting shortcuts, numbered lists, indentation, tables, text-only zoom, fonts and spellcheck are available.

The Light appearance uses the **Pure Ink** palette, shared with SurBEE: near-black text and controls on an off-white paper page, a grey surrounding desk, and black pills for pressed formatting buttons and the selected view. Tabs, toolbars, the sidebar and the status bar carry a faint paper grain; the writing page stays smooth. Dark is unchanged. Settings → Appearance still offers Match computer, Light and Dark.

Equals-sign dividers such as `======` remain plain text after reopening. Highlight uses `==text==` in Markdown or the Highlight tool in Formatted view. With automatic Markdown conversion off, typing that syntax in Formatted view keeps it literal when saved and reopened.

Hyphens stay as typed: `--`, `---` and longer runs remain literal, with ordinary Backspace behavior. Automatic em-dash conversion is disabled. Hyphen-only lines do not become horizontal rules on reopening. The Horizontal divider command remains available and saves as `***` in Markdown.

With automatic Markdown conversion off, typed `# text` and `~~text~~` also stay literal after saving and reopening; use the paragraph-style menu or Strikethrough for real headings and strikethrough. Web addresses are linked as you type when they start with `http://`, `https://` or `www.`, or end in a common web ending such as `.com`, `.org`, `.ph` or `.ai`. File names such as `notes.md` or `node.js` and run-on sentences such as `end.Next` stay plain text.

Find (Ctrl+F) keeps the cursor in the Find box: Enter and Shift+Enter move between highlighted matches without changing the note, in every view. Escape closes Find and selects the current match in the note.

In Formatted view, typing `> text` stays literal even when automatic Markdown conversion is enabled, including after saving and reopening. Use the Quote button or paragraph-style menu to create a quote deliberately. Markdown mode and imported Markdown still recognize explicit `> text` quote syntax.

The default font is **Iosevka Fixed SS03 Extended** (shown as **Iosevka Fixed Extended**), with embedded regular, bold, italic and bold italic faces. Its hyphens remain visually separate without disabling contextual font features. The two earlier Iosevka choices have been removed from the font menu; saved preferences using either adopt Fixed Extended. Standard font choices and text zoom are retained.

In Formatted view, Enter continues a list or splits it at the cursor. Typing a number prefix such as `1. ` starts a numbered list even with automatic inline Markdown conversion off. Typed `- `, `* ` and `+ ` stay plain text, even with automatic conversion on and after saving and reopening; use **Bullet list** (under ») to make bullets. Markdown view and imported Markdown still treat `- item` lines as bullets. Shift+Enter adds a line within the item. Backspace at the start of an item removes its marker while retaining its text; for a nested item it reduces the indentation by one level. Enter or Backspace on an empty top-level item exits the list; on an empty nested item it moves out one level. Backspace within text deletes normally. For a checkbox item, Backspace at the start of its text removes the checkbox and marker together. With several items selected, Tab and Shift+Tab move the whole items one level and keep the selection.

On desktop, notes automatically save to managed Markdown files. Ctrl+S flushes pending saves. Closing a note keeps it in Library; moving it to Trash allows recovery. The app restores workspace and editing position on launch, subject to the [known issues](ROADMAP.md#known-workspace-issues).

Open multiple desktop windows with **Menu → File → New window**, **Ctrl+Shift+N**, or by launching Rotepad again. Each additional window starts a new blank note and shares the same Library. Open an existing note from Library to work on it alongside another note. Windows keep their own open notes, active note, view and cursor; closing one window leaves the others running. Changes appear in other windows automatically. If simultaneous edits conflict, Rotepad keeps a separate conflict copy and shows a status message. Restart restores one window and recovers pending drafts from the others; it does not reopen the previous number of windows.

Opening a `.md` or `.txt` file (double-click, Open with, or Import Markdown…) keeps the note linked to that file. Autosave and Ctrl+S save your edits back to it, and the status bar shows "Also saves to" with the file name. Rotepad also keeps its own library copy, which holds history and recovery.
- **Text files:** a `.txt` file opens as literal text, so lines such as `# TODO` or `1. step` stay exactly as typed. Rotepad keeps the file's line endings and byte-order mark. Formatting you add (bold, lists) can't be stored in a `.txt` file, so only the text is saved there.
- **Markdown files:** a `.md` file is saved as Markdown.
- **Safety:** if another program changed the file since Rotepad last saved it, Rotepad asks before replacing it; Cancel stops saving to that file. A file that was moved or deleted is not recreated. A text file that isn't UTF-8 is never changed.

Export Markdown creates an additional, unlinked copy. Opening an existing managed file reuses its note. The default notes folder is Documents/Rotepad Docs unless changed in Settings; changing it does not relocate existing notes.

The Windows installer registers Rotepad for `.md`, `.markdown` and `.txt`. Its **Default apps** page, shown after you choose the folder, offers two boxes, both unticked: **Markdown files (.md)** and **Text files (.txt)**. For each box you tick, Windows shows its own "How do you want to open…" window after installation. Choose Rotepad there and confirm; Windows only lets you, not the installer, change a default app. You can also do this later from Rotepad's Settings, which opens Windows Settings.

**Menu → Help → About Rotepad** shows the installed version and **© 2026, J.E. Rosaroso**.

Desktop Ctrl+P opens print preview with paper size, orientation and PDF export. Physical printer output still needs manual verification.

Tab inserts a tab at the text cursor (displayed with four-column tab stops). With multiple lines selected it indents them; in a list it nests the item. Shift+Tab decreases indentation. Tables retain Tab/Shift+Tab cell navigation. These editor shortcuts work in Formatted and Markdown/Split views; ordinary dialog and toolbar controls retain focus navigation.

Right-click in the desktop app's text for Undo, Redo, Cut, Copy, Paste and Select All. Right-click a link to open or copy it, and a word marked as misspelled for spelling suggestions or Add to dictionary. Right-clicking a tab still opens its note options. The browser version uses the browser's own right-click menu.

## Data and portability

Desktop Markdown files hold current text. The app profile holds workspace information, history, mappings and recovery text. Browser storage is specific to its browser profile and origin; browser file saving depends on browser support and permissions.

Use Backup/Restore to transfer browser notes to desktop or to another browser. Markdown export does not include history. Keep separate backups. External files are not watched live (an outside change to a linked file is noticed the next time Rotepad saves it), dropping a file into the notes folder does not import it, and phone synchronization is not implemented.

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
- [Session handoff 2026-10-09](docs/HANDOFF-2026-10-09.md): current state, local build/test setup and open items for the next session.
- [Changelog](changelog.md): completed changes and historical verification.
- [Archived handoff](docs/archive/HANDOFF-2026-09-20.md) and [0.5.1 QA report](docs/archive/QA-0.5.1.md): historical context, not current instructions.

Embedded Iosevka fonts and their license are included in [FONT-LICENSE.txt](FONT-LICENSE.txt). No font installation or network access is required to use them.
