> Historical QA report for version 0.5.1, archived on 2026-09-20. This is not a fresh audit of 0.7.1. See ../../ROADMAP.md for unresolved findings and ../../changelog.md for later changes. Original content retained below.

# Rotepad 0.5.1 review

Date: 9/15/26, 10:51 PM GMT+8. Review only: no application fixes or installer rebuild in this batch.

## Scope and results

- All ten tests/*.cjs suites passed, covering backup validation, sorting/outline, file saving, fonts, formatting/serialization, links/history, library recovery, lists/zoom, quote exit and toolbar simplification.
- Desktop library-smoke.cjs and smoke.cjs passed: migration/history retention, actual automatic disk writes, immediate quiet exit, view/cursor restoration, close/reopen, Trash flags, cache recovery, failed write/retry, Markdown export/import and Explorer handoff.
- formatted-smoke.cjs, toolbar-smoke.cjs and bold-smoke.cjs passed in headless Edge, including formatting, tables, nested indentation and responsive widths.
- Added desktop/review-smoke.cjs. It exercised the actual dist/win-unpacked/resources/app.asar payload, reporting version 0.5.1, under the development Electron runtime with a disposable profile. Four reproducible workspace issues are below. No user notes were accessed or altered.
- No note-content loss was observed in these scenarios. This does not establish that the app is bug-free. Not tested: a fresh installed upgrade, physical power failure, real printer output, huge libraries, prolonged use, native Windows accessibility, or comparative performance with Notepad. Print was intercepted before sending anything to a printer.

## Confirmed issues

### 1. Print still uses the closed note — medium priority

Resolved in desktop 0.7.0: print preview checks for an open, non-trashed note. Covered by desktop/print-preview-smoke.cjs. Original reproduction below retained for context.

Steps: type a note; close the last open note; choose File → Print.

Expected: Print disabled or a request to open a note. Actual: the print command runs and the prepared print document contains the last closed note's text, despite the empty workspace.

Cause: desktop/library.js workspaceState hides the editor but leaves File printing active; Rotepad.html preparePrint uses editor.value regardless of workspace membership. Suggested fix: guard both the print action and print preparation when there is no open note. Reproduction confirmed twice.

### 2. Restoring the last deleted note does not reopen it — medium priority

Steps: with one note, move it to Trash; restore it from note options.

Expected: restore and open the note, consistent with restoring other notes. Actual: trashed becomes false, closed remains true, and the workspace stays empty. The text is retained and can be reopened from Library.

Cause: the existing restore handler calls switchNote with the same activeId; that function returns early. Suggested fix: explicitly activate the restored note, including the same-ID case. Existing tests checked the Trash flag but not editor visibility; extend coverage.

### 3. Deleting every note does not preserve the empty workspace — low priority

Steps: move all notes to Trash; close and reopen the app.

Expected: empty workspace, deleted notes still in Trash. Actual: the deleted notes remain safely in Trash, but startup creates and opens a new Untitled.md automatically.

Cause: the original editor startup requires a non-trashed active note. Suggested fix: represent empty workspace deliberately in desktop startup without manufacturing a saved library note.

### 4. Creating a note while browsing Trash leaves the sidebar on Trash — low priority

Steps: select Trash; create a new note.

Expected: switch to Open or Library and show the new note selected. Actual: the editor displays the new note while the sidebar still lists deleted notes. No content is lost.

Cause: createNote/activateNote do not switch prefs.libraryFilter. Suggested fix: choose Open on new-note creation without changing filter behavior for unrelated actions.

## Windows Notepad comparison

Rotepad is a local note library with Open/Library/Trash, pinning, search, backup and per-note recovery history. Windows Notepad is centered on files and tabs. Rotepad automatically saves library content; Markdown is an explicit import/export copy. Notepad session restoration can remember unsaved edits without updating the corresponding file.

Both support formatted and Markdown views. Modern Notepad also has tables, nested lists, spellcheck and optional AI writing features; formatting alone is not a unique Rotepad advantage. Rotepad additionally exposes Split/Preview, outline and focus tools, and tailored fonts/spacing. Notepad's documented table controls include adding/removing rows and columns; Rotepad currently offers insertion and Tab-to-add-row but lacks dedicated row/column management.

Rotepad phone sync is planned, not implemented. Its current Windows preview should be treated as an evolving application; no performance/stability superiority over Notepad was established.

Microsoft primary references (availability can vary by installed version):

- Tabs: https://blogs.windows.com/windows-insider/2023/01/19/tabs-in-notepad-begins-rolling-out-to-windows-insiders/
- Session restoration: https://blogs.windows.com/windows-insider/2023/08/31/new-updates-for-snipping-tool-and-notepad-for-windows-insiders/
- Formatting: https://blogs.windows.com/windows-insider/2025/05/30/text-formatting-in-notepad-begin-rolling-out-to-windows-insiders/
- Tables: https://blogs.windows.com/windows-insider/2025/11/21/notepad-update-begins-rolling-out-to-windows-insiders/
- Nested lists and AI: https://blogs.windows.com/windows-insider/2026/01/21/notepad-and-paint-updates-begin-rolling-out-to-windows-insiders/
- Spellcheck: https://blogs.windows.com/windows-insider/2024/03/21/spellcheck-in-notepad-begins-rolling-out-to-windows-insiders/
