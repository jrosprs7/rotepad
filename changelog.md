# Rotepad changelog

## 9/21/26 8:02 PM GMT+8 — Feature and scenario regression-review skill

- Added skills/rotepad-regression-review/SKILL.md with a feature coverage map, reproduction-first workflow, checks for related features, and explicit passed/failed/not-run/not-applicable evidence. Whole-app reviews must account for each supported feature group; focused fixes select affected paths and explain exclusions.
- Expanded the existing editing/list guidance for freshly typed versus parsed prefixes, middle/start splits, empty nested outdent, task items, list toggles, wrapped text and source-mode boundaries. It links to the broader review without duplicating its checklist.
- Linked the new skill from AGENTS.md, README.md and the testing guide so future application changes use it. Existing product rules and unrelated uncommitted work were preserved.
- Documentation-only change: no application code edits, runtime tests or installer rebuild in this batch. Fallback flat-frontmatter/name/scaffold checks passed for both skills; 39 local links including anchors passed, as did git diff --check. The bundled validator could not run because PyYAML is unavailable; no application coverage is claimed from these document checks.

## 9/21/26 7:53 PM GMT+8 — Consistent list splitting and continuation (0.8.1)

- Fixed Enter in the middle of typed numbered/bullet paragraphs: convert the prefix and split at the actual caret while preserving inline formatting. This works with optional automatic inline Markdown conversion off or on and through the beforeinput path. Backspace directly after a literal list prefix removes that prefix and retains the text.
- Extended source-mode continuation to bullets and task items, including splitting immediately after a marker, while retaining fenced-code protection.
- Scenario testing also found and fixed two related issues: indented Shift+Enter continuation lines lost their list association on view conversion, and Enter on an empty nested item did not outdent correctly.
- Added list-interactions-smoke.cjs: 75 counted checks passed in Edge and 75 in isolated development Electron. Existing numbering-smoke.cjs, formatted-smoke.cjs, formatting.cjs, list-zoom.cjs and quote-exit.cjs also passed. Initial failures guided fixes for soft-line round trips and nested empty-item exit; a selection-deletion assertion was corrected to retain the preceding space.
- Tests cover the reported split, different creation paths and prefixes, first/middle/end positions, preserved styles, Undo/Redo, pasted prefixes, source lists/tasks, nested empty exit and reload. Physical IME/mobile keyboard behavior and exact parity with every Notepad version remain unverified. Real user notes and unrelated uncommitted work were preserved.
- Rebuilt the unsigned Windows x64 installer and portable package for 0.8.1 successfully. Installation/upgrade was not performed.

## 9/21/26 7:22 PM GMT+8 — Minimalist desktop UI (0.8.0)

- Removed the desktop writing area's outer frame, rounded corners and surrounding gutters. Reduced the command row to 38px and status bar to 26px; retained the clickable view switch and save status.
- Flattened toolbar/menu controls while retaining hover, active and keyboard-focus indicators. Added a neutral charcoal desktop dark palette. Extra tools remain in the overflow menu.
- Isolated Electron layout checks passed at 650/850/1250/1800px, including selection preservation through overflow, Settings access, light/dark screenshots and border/status-bar dimensions. Corrected test startup timing and subpixel rounding assumptions during validation.
- Desktop screen styling only; no editor interaction, persistence or print-output changes. Existing uncommitted work was preserved.

## 9/21/26 7:14 PM GMT+8 — Editor behavior skill

- Added skills/rotepad-editing-behavior/SKILL.md and a focused list-scenario reference for future editing changes. Explicit criteria include nonempty first-document-line Backspace, bullets, nested items, selection boundaries, Enter, Undo/Redo and formatted/source round trips.
- Linked the project skill from AGENTS.md and README.md. It requires scenario-specific evidence and verification limits rather than promises of zero bugs or assumed parity with other apps.
- Documentation-only batch; no application behavior change, installer rebuild or application test run.
- Relative links and fallback metadata/name/placeholder checks passed. The bundled skill validator could not run because its Python environment lacks PyYAML; its full validation remains unrun.

## 9/21/26 7:06 PM GMT+8 — Backspace at the start of list items (0.7.2)

- Backspace at the start of a nonempty numbered or bulleted item now removes the marker while retaining its text and inline formatting. Nested items move out by one level. Existing empty-item Enter/Backspace behavior is retained.
- Continued list segments retain their starting numbers. The change is shared by browser and desktop editors; source and embedded copies are synchronized.
- Expanded numbering-smoke.cjs passed for first/middle items, starting at 4, bullets, bold text, undo, nested outdent and view round trips, plus existing continuation checks. The initial nested-outdent test failed with the native browser command; explicit list handling fixed it and the test passed. Existing formatted-smoke.cjs, list-zoom.cjs and formatting.cjs also passed during this batch.

## 9/20/26 10:13 PM GMT+8 — Project documentation organization

- Added root AGENTS.md and README.md, plus architecture and testing guides with separate browser and desktop storage descriptions.
- Focused the desktop README on development and packaging; reorganized the roadmap around remaining work and retained the three unresolved workspace findings.
- Archived the previous handoff and 0.5.1 QA report with historical notices. Retained the existing changelog filename and release history.
- Checked documented commands against package scripts and test sources; reviewed relative links and archive preservation. No application code changes, build or application test run in this documentation batch.

## 9/20/26 9:42 PM GMT+8 — Numbered lists (0.7.1)

- Added Numbered list to the overflow formatting menu in both browser and desktop editors.
- Enter after a typed numbered line starts/continues a numbered list even with optional Markdown-as-you-type formatting off. Markdown source mode also continues numbers, including 9 to 10; fenced code is excluded.
- Preserved Enter/Backspace exit from empty list items. Backspace on empty item 4 leaves a normal paragraph below item 3. Inline Markdown conversion remains optional.
- Numbering regression tests and existing formatted-editor/comfort checks passed, covering menu insertion, multi-item continuation, empty-item exit and optional formatting enabled/disabled.

## 9/16/26 5:05 PM GMT+8 — Windows 0.7.0 build completed

- Successfully built the installer and portable executable with the tested print-preview changes. Build completed with exit code 0; installation remains user-controlled.

## 9/16/26 4:38 PM GMT+8 — Desktop print preview (0.7.0)

- Ctrl+P and Print now open a paginated PDF preview inside Rotepad. Choose A4, Letter, Legal or A5, portrait or landscape, then Print or Save as PDF.
- PDF export saves the exact preview. Printer output uses the selected paper/orientation, then opens Windows printer settings. Canceling keeps the preview open; failures show a message and allow retry.
- Print uses a fixed note snapshot while preview is open. Empty workspaces now ask the user to open a note rather than printing the last closed note. Added print-only table borders and long-code wrapping.
- Verified the visible preview, formatted text/table output, multi-page pagination, PDF dimensions/content, exact PDF export, native-print options, cancel/error handling and empty-workspace guard. Printer dialogs were mocked; physical printing has not been tested.


## 9/16/26 3:40 PM GMT+8 — Show in File Explorer (0.6.1)

- Added Show in File Explorer to desktop Note options. Pending edits save before selecting the managed Markdown file, including renamed notes and notes in Trash.
- Untouched empty notes explain that writing or naming the note creates its file. Failed saves and missing files report an error.
- Targeted tests passed for pending text/rename, inactive notes, Trash, empty notes, unknown IDs and missing files. Explorer was mocked and test files stayed inside a disposable profile.


## 9/16/26 3:16 PM GMT+8 — Automatic per-note Markdown files (0.6.0)

- Notes now save automatically as individual .md files, initially in Documents/Rotepad Docs (or the user's existing chosen folder). Untouched blank Untitled notes wait until edited/named. Ctrl+S and closing flush pending file writes.
- Renaming updates the managed filename. Duplicate/unsafe titles use safe unique filenames without overwriting unrelated files. Trash moves files into .Trash; restore moves them back safely. Existing notes keep their locations when changing the default folder.
- Existing library notes migrate; library-before-markdown.json preserves a pre-migration copy. Separate app data keeps history, workspace, a managed-file index and recovery text. Markdown content is read on startup; conflicting newer cache text is kept as a recovered-draft note. Missing managed files can be recreated from recovery text.
- Importing external Markdown still creates a managed copy; opening an already-managed file reuses its note. Export creates an additional copy. Titles in the UI remain extension-free.
- Tests passed for migration/history backup, real file writes, filename collisions/renames, Trash/restore, safe Windows filenames, managed-file reopening, disk hydration, cache conflict preservation, missing-file recovery, changed folder defaults and failed-write retry; existing library/desktop regression suites passed. All test writes use disposable profiles.
- No phone sync or fixes to the four outstanding QA issues in this release.


## 9/16/26 2:13 PM GMT+8 — One-row desktop controls (0.5.3)

- Combined the desktop header and formatting toolbar into one 46px row. Kept the icon, note title and Close note together, with tools alongside them; File/View/Help/Settings are under Menu.
- Tools that do not fit move into the existing » overflow menu. Compact text formatting controls can overflow too; existing listeners and editor selections are retained.
- Checked 650/850/1250/1800px widths, overflow link selection, Settings access, and visuals. The library lifecycle regression suite passed. No saving/editor behavior or outstanding QA fixes changed.



## 9/16/26 1:36 PM GMT+8 — Note titles without extensions (0.5.2)

- Removed recognized trailing .md/.markdown/.txt extensions from desktop note titles in the header, sidebar and rename dialog. Existing notes retain IDs, content and history; ordinary dots such as Version 1.2 remain.
- New, renamed, duplicated, imported and restored-library notes normalize their titles. Markdown exports still receive the .md extension through the existing filename helper.
- Checked title/rename/duplicate/export behavior and reran the desktop regression suite. No changes to the four outstanding QA findings.



## 9/15/26 10:51 PM GMT+8 — QA review (no app changes)

- Reran the existing regression suites and explored the packaged 0.5.1 payload in an isolated profile. Existing suites passed; four workspace/Trash/Print issues reproduced.
- Added QA-REPORT.md and desktop/review-smoke.cjs; recorded fixes in ROADMAP.md. No installer rebuilt and no application behavior changed.



## 9/15/26 10:36 PM GMT+8 — Notepad app icon (0.5.1)

- Added an original notepad icon with teal backing, pale binding and a bold r. based on the user's reference. SVG source, transparent PNG and multi-size Windows ICO are in desktop/assets/.
- Applied the icon to the desktop window, app header and packaged Windows executable/installer. Enabled executable resource editing while keeping code signing disabled; no editor or saving behavior changed.
- render-icon.cjs rebuilds the PNG/ICO from the SVG using Playwright and Pillow. Visually checked the rendered icon.


## 9/15/26 10:09 PM GMT+8 — Automatic local saving and workspace restoration (0.5.0)

- Desktop notes, history and session now save automatically to an atomic local library.json in the existing Rotepad app-data folder. Existing app notes migrate on first launch; a newer local cache can recover edits after an interrupted write.
- Closing the app flushes the library and exits quietly. A save failure keeps it open with a retry option. Open notes, selected note, view and cursor are restored.
- Close note (× / Ctrl+W / note options) removes it from Open, keeps it in Library, and supports an empty workspace. Delete remains Move to Trash with restoration available.
- Ctrl+S is Save now; Ctrl+Shift+S exports Markdown. Imported/exported Markdown files are separate copies, not automatically overwritten by library autosave.
- Updated desktop help and tests. Phone synchronization remains planned, not implemented. Standalone Rotepad.html is unchanged.


## 9/15/26 8:43 PM GMT+8 — Simpler Windows save prompt (0.4.2)

- Simplified the close dialog to Rotepad, one save question naming the note, and Save / Don't save / Cancel. Removed the explanatory paragraph and question icon. Save and discard behavior unchanged. Exit regression checks passed.



## 9/15/26 8:33 PM GMT+8 — Save before closing (Windows 0.4.1)

- Added Save / Don't save / Cancel on exit for every note with unsaved file changes. Save writes the actual Markdown file; canceling a picker or a failed write keeps the window open.
- Don't save reloads linked notes from disk and moves never-saved notes to Trash. Discards wait until all prompts are accepted, so a later Cancel preserves drafts.
- Scope: desktop close handling, its regression tests, release version and documentation. Standalone HTML/editor behavior unchanged.
- Verified isolated Electron tests for saved/unsaved notes, restart, write failure, canceled save, and multiple-note cancellation.



## 9/14/26 6:38 PM GMT+8 — Formatted-first editing

- Formatted is now the startup view, with a Formatted/Markdown switch in the bottom bar. Split and Preview remain in View.
- Automatic Markdown conversion is opt-in under Settings and off by default; buttons and Ctrl+B/I/U continue working. Plain website autolinking remains enabled.
- Added Increase/Decrease indent (Ctrl+] / Ctrl+[), including nested Markdown lists; paragraph indentation uses tab spacing.
- Added Insert table with row/column choices, editable cells, Tab navigation and new rows at the end. Tables preserve escaped pipes and formatting through Markdown view/save round trips.
- Added Insert date and time (F5) as a fixed local timestamp. Existing Clear formatting remains in the overflow panel.
- Existing tests and Formatted, optional-bold, toolbar and desktop smoke checks passed. Table/footer/nested-list rendering was visually inspected.
- Rebuilt Windows installer and portable outputs as 0.4.0.

## 9/14/26 6:13 PM GMT+8 — Predictable automatic bold

- Fixed automatic bold carrying into subsequent normal text and causing nested bold phrases.
- Closing Markdown formatting now resets the browser's inline typing state; Enter immediately afterward no longer clones bold onto the next line.
- After Backspace cancels automatic formatting, new typing at the end of the canceled phrase moves outside its literal span so another bold phrase can format normally.
- Added real-keystroke regression coverage for trailing text, repeated phrases, insertion into existing text, Enter, cancellation then fresh bold, and round trips. Existing tests and desktop smoke passed.
- Windows installer and portable builds updated to 0.3.1.

## 9/13/26 6:09 PM GMT+8 — Compact responsive toolbar

- Kept the editor toolbar on one row with compact square icon controls and reduced padding.
- Added a single » overflow panel, replacing More. Less-used tools move into it as the window narrows and return when space is available; the panel overlays the editor.
- Kept Sidebar, Undo/Redo, Bold/Italic/Underline and Find visible. Shortened Iosevka font labels without changing stored font values.
- Collapsed File/View/Help/Settings into one Menu below 850px.
- Verified 360/700/850/1400px layouts, overflow link selection, font selection, Escape, and compact Settings. Ten existing tests and desktop smoke checks also passed. Inspected wide, narrow and open-overflow screenshots.
- Rebuilt the Windows installer and portable application as 0.3.0.

## 9/13/26 5:55 PM GMT+8 — Save folder, Markdown opening, and formatting reversal

- Added a desktop default save folder: Documents/Rotepad Docs, created when saving. Settings allows choosing another folder; existing file locations stay unchanged.
- Added a Windows installer with Markdown file registration, plus a refreshed portable build (0.2.0). Handles file arguments both on startup and when already running; reopening an active file preserves unsaved notes.
- Added immediate Backspace reversal for automatic Markdown formatting, preserving literal syntax through subsequent typing and reloads. Fixed premature italic conversion while typing bold delimiters.
- Clarified the existing real-time spellcheck setting and added a tooltip; its default remains enabled.
- All ten existing test scripts passed. Desktop tests passed for folder persistence, saving, startup and already-running file requests, spellcheck toggle, and real italic/bold Backspace keystrokes. Native picker results were mocked; installer registration is not tested by installing on this computer.

## 9/13/26 12:01 AM GMT+8 — Windows desktop preview

- Packaged the existing editor as a standalone Windows x64 application in `dist/Rotepad-0.1.0-Windows.exe`; no installer required.
- Added a separate `desktop/` wrapper and build instructions. The original Rotepad.html is unchanged.
- Added native desktop Save/Open dialogs, same-file saving, persistent file associations, and separate app storage under `%APPDATA%/Rotepad`.
- Desktop smoke checks passed for repeated saving, restart persistence, canceled Save As, Open, and embedded fonts. Picker results were mocked. The packaged app also launched successfully.
- This is an unsigned test build. Browser notes can be transferred through Backup/Restore. macOS, Linux, and mobile builds remain future work.

All timestamps use GMT+8 (Asia/Manila). Append an entry for each completed change batch. Never invent timestamps for older work. This file tracks the app, not private note contents.

## 9/12/26 6:20 PM GMT+8 — Iosevka fonts

- Added Iosevka SS03 Extended and Iosevka Fixed SS03 to the font menu.
- Made Extended the default with a one-time migration; later font choices remain saved.
- Embedded regular, bold, italic, and bold italic WOFF2 faces for both families, retaining all characters and font shaping tables. No system installation or internet connection is needed.
- Included the original font license in the HTML and FONT-LICENSE.txt; added a reproducible conversion tool.
- Fixed changing fonts resetting text zoom.
- Validation: all ten test scripts passed; headless Edge loaded all eight embedded faces with no page errors and selected Extended by default.

## 9/12/26 6:04 PM GMT+8 — List exit, text zoom, and documentation

- Backspace on an empty numbered item removes its numbering and leaves a normal paragraph without merging into the previous item.
- Enter on an empty list item also exits the list. Bullet and checkbox items share this behavior; nonempty items and Shift+Enter remain unchanged.
- Exiting in the middle of a list retains later items. Ordered-list start numbers are preserved in rendering and Markdown serialization.
- Zoom now resizes only note text across Write, Markdown, Split, and Preview. Toolbar, sidebar, dialogs, and window layout stay the same size.
- Settings now says Text zoom; Find/Outline scrolling accounts for the zoomed text size.
- Created this changelog and refreshed HANDOFF.md and ROADMAP.md.
- Validation: all nine Node test scripts passed, including new list-exit DOM fixtures and text-zoom checks. Interactive browser verification remains pending.

## Earlier work — retrospective summary (exact times not recorded)

### 9/12/26 — Save behavior

- First Ctrl+S chooses a file/location; later saves update that file.
- Added Save as, stored per-note file handles, open-file association, and an explicit download fallback.
- Canceled/failed writes do not mark new content as saved to disk.

### 9/11/26 — Interface and recovery

- Consolidated File/View/Help menus, active formatting indicators, paragraph styles, and compact Find/Replace.
- Added grouped typing undo and selection-only clear formatting.
- Reduced heading choices to two modest tiers and moved spacing to Settings.
- Compact icons for Sidebar, Undo/Redo, Quote, Find, and horizontal Link.
- Plain website entry, quote button, and quote exit on an empty line.
- Per-note History for major changes, with at least three minutes between new savepoints; Undo remains immediate.

### 9/10/26–9/11/26 — Initial app

- Standalone offline HTML editor with formatted Write, Markdown, Split, and Preview.
- Basic formatting, automatic links, fonts, lists, checkboxes, highlights, quotes, search/replace, and dividers.
- Notes sidebar, pinning/sorting, Trash, recovery, backup/restore, printing, focus mode, themes, and shortcuts.
- Outline, split resizing, remembered positions, paste-to-link, automated tests, roadmap, and handoff.








