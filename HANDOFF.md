# Rotepad handoff

Updated: 9/12/26 6:20 PM GMT+8 (Asia/Manila).

## Latest font update

- Iosevka SS03 Extended is the default note font; Iosevka Fixed SS03 is also in the font menu. Existing common fonts remain available.
- Eight full WOFF2 faces are embedded in Rotepad.html: regular, bold, italic, and bold italic for each family. No font installation or network is needed. Font data adds roughly 6 MB to the HTML.
- A one-time prefs.iosevkaDefaultVersion migration selects Extended for existing users; subsequent user font choices persist.
- Font changes preserve text zoom. Underline continues to use the editor's text decoration.
- FONT-LICENSE.txt contains the original Iosevka 34.8.1 SIL OFL license, also embedded in the HTML. tools/embed-fonts.py reproduces the conversion from the supplied IosevkaSS03.ttc using fonttools and brotli. .font-build-deps is ignored local tooling.
- tests/fonts.cjs checks embedded face coverage, the default migration, and preservation of zoom. When editing HTML, verify embedded data remains intact; regenerate with the tool if needed.
- Validation for this batch: all ten test scripts passed. A fresh headless Edge session loaded all eight faces and selected Extended with no page errors. Broader interactive editing QA remains on the roadmap.

## Current state

Standalone offline Notepad-meets-Notion editor in Rotepad.html. Latest work: Backspace or Enter on an empty list item exits into a normal paragraph; Zoom affects note text only; changelog.md created and continuation documents refreshed.

## Project files

- Rotepad.html: all HTML/CSS/JavaScript; open directly in a browser. No build/server required.
- tests/*.cjs: Node syntax, isolated logic, mocked file-save, and minimal DOM fixture tests.
- changelog.md: append the actual GMT+8 date/time after EVERY completed future change batch. Do not fabricate timestamps for older work.
- HANDOFF.md: update when current behavior changes.
- ROADMAP.md: remaining proposals and verification work.
- Rotepad-Setup.exe: old unrelated installer; do not modify or commit it.

Original workspace: C:\Users\jrosp\Documents\Claude_Rotepad
User-created repository: https://github.com/jrosprs7/rotepad.git (verify remote before operations). Do not push without a request.

## Latest user preferences

- Simple, compact writing experience; avoid toolbar clutter.
- Default formatted Write; optional Markdown, Split, Preview under View.
- Only two modest heading tiers: H1 1.25em, H2 1.12em.
- Three-tier line spacing is Settings-only.
- Zoom affects ONLY note text, with 16px at 100%; no body/interface scaling or visible font-size control.
- Sidebar on left, Find on right. Sidebar/undo/redo/quote/find/link are icons with tooltips and accessible labels. Link is a small horizontal chain.
- Select text and click Quote/Link to format it.
- U/Ctrl+U underline uses Discord-style __text__; highlight uses ==text==. Other Markdown apps may differ.
- History records significant changes no less than 180,000 ms apart per note, including manual savepoints. Undo handles recent edits; browser draft autosave stays immediate.
- First Ctrl+S selects a file/location; subsequent Ctrl+S updates the same file.

## Implemented capabilities

Formatted and raw editing, basic Markdown parsing/serialization, fonts, bold/italic/underline and active states, paragraph selector, quotes, ordered/bullet/check lists, code, strike/highlight/divider, selection-only clear formatting, grouped undo, compact Find/Replace, automatic websites, link editing/removal, paste-to-link.

Notes search, pin/sort, rename/duplicate, Trash/restore, heading outline, remembered positions, draggable split, focus, themes, wrap, text zoom, spellcheck, shortcuts, printing.

Enter on an empty quote line exits the quote. Backspace/Enter on an empty list item exits into a normal paragraph without removing earlier/later items. List exit owns list items inside quotes. Ordered start numbers are now preserved. Nonempty items and Shift+Enter remain native behavior.

## Storage and saving

- localStorage key rotepad.library.v2; legacy rotepad.draft.v1 migration remains.
- Library stores notes, revisions, preferences, positions and metadata.
- File System Access API provides Save, Save as (Ctrl+Shift+S), and open-file association on supporting browsers.
- File handles cached per note and stored in IndexedDB rotepad-file-links / handles. Browser may request permission again after reopening.
- Unsupported browsers get an explanation and explicit Download a copy fallback.
- Successful stream close is required before marking disk content saved.
- History keeps up to 25 spaced savepoints per note. Restore in place or as copy. During cooldown, displaced content can be preserved in a separate (before restore).md note.
- JSON backup format rotepad-backup, version 1; restores add independent copies. Includes revisions and Trash. Markdown files contain current text only, not history.
- Browser storage is profile/origin specific. Export/import backup when moving browsers or environments.

## Architecture and cautions

One self-contained HTML file. Rich editor uses contenteditable/browser commands; source uses textarea; custom parser and serializer. Several incremental wrappers and old handlers coexist: read the full function/event chain before editing.

Text zoom adjusts --size, not body zoom. Find/Outline source scrolling uses the scaled size. List exit handles keydown/beforeinput; quote handler skips list items. Keep offline operation and existing user data intact. This is local app work, not a registered hosted Site.

## Tests and limits

All nine scripts passed after the latest change:

```powershell
node tests/formatting.cjs
node tests/library.cjs
node tests/backup.cjs
node tests/comfort.cjs
node tests/simplification.cjs
node tests/history-url.cjs
node tests/quote-exit.cjs
node tests/file-save.cjs
node tests/list-zoom.cjs
```

Tests cover serialization, storage/backup, history spacing, undo grouping, URL normalization, inline clearing, quote detection, mocked same-file saving, list splitting, and zoom calculations. Some printed counts are historical; do not report them as audited totals.

No comprehensive interactive browser QA has been performed. These tests do not establish native picker, selection, layout, or contenteditable behavior. Use isolated/disposable browser data for future checks; do not overwrite personal notes or files.

## Continuation protocol

1. Read this document, ROADMAP.md, and latest changelog entry.
2. Inspect repository state and relevant source; preserve unrelated work.
3. Follow the user's new scope and current preferences.
4. Test affected behavior and state verification limits honestly.
5. Append a real GMT+8 timestamp to changelog.md and refresh handoff/roadmap.
