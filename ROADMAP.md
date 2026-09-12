# Rotepad roadmap

Updated: 9/12/26 6:20 PM GMT+8.

## Direction

Keep an offline, uncomplicated Notepad-meets-Notion editor. Prioritize predictable editing and reliability over new features. Retain icon controls, Settings-only spacing, text-only zoom, two modest heading tiers, same-file saving, and three-minute-minimum History.

Proposals below are not blanket authorization. Follow the user's next requested scope.

## Completed

- [x] Embedded Iosevka SS03 Extended (default) and Iosevka Fixed SS03, each with real bold and italic faces; preserve text zoom on font changes.

- [x] File/View/Help menus and compact toolbar.
- [x] Active formatting, paragraph selector, compact Find/Replace.
- [x] Grouped typing undo and selected inline clearing.
- [x] Sidebar/undo/redo/quote/find/link icons.
- [x] Plain-domain links and paste-to-link.
- [x] Spaced per-note major-change History.
- [x] Save location picker, same-file Ctrl+S, Save as, file handles and fallback.
- [x] Enter exits an empty quote line.
- [x] Enter/Backspace exits an empty list item without merging into earlier text.
- [x] Text-only zoom and adjusted Find/Outline scrolling.
- [x] Timestamped changelog and refreshed handoff.

## Priority 1: Interactive reliability checks

Use disposable notes, isolated browser storage and test files; preserve the user's real data.

- [ ] Number items 1-3; Enter to 4; verify Backspace and Enter each exit numbering into a paragraph.
- [ ] Test bullets, checkboxes, nested lists, lists inside quotes, and middle-of-list exits.
- [ ] Test quotes, heading-to-paragraph transitions, Shift+Enter and blank blocks.
- [ ] Check toolbar selection, mixed formatting, clear formatting, links and clipboard paste.
- [ ] Check undo after typing, paste, formatting, list/quote exit and history restore.
- [ ] Check cursor/scroll restoration across notes, views and zoom levels.
- [ ] Test native Save/Save as/Open pickers, cancellation, failed writes, permission renewal and file-handle reload.
- [ ] Check unsupported/in-app-browser fallback explains its limits.
- [ ] Check History spacing across note switching/reload and minor edits.

## Priority 2: Layout and portability

- [ ] Verify text zoom at 80-150% leaves toolbar, sidebar and dialogs unchanged.
- [ ] Check themes, narrow windows, wrapping, split resizing and outline.
- [ ] Review print output and decide/document whether screen text zoom should affect print size.
- [ ] Round-trip nested lists, multiline quotes, code, blank lines and ordered start numbers.
- [ ] Verify backup preference/metadata/revision-label retention.

## Priority 3: Maintenance

- [ ] Consolidate superseded handlers and function wrappers without changing behavior.
- [ ] Clarify boundaries between note state, UI preferences, undo history and persistent revisions.
- [ ] Add actual browser editing tests when authorized/available.
- [ ] Correct stale fixed test-count labels or remove them.
- [ ] Document browser-storage portability and migration.

## Documentation rule

After each completed change batch, append the actual date/time in GMT+8 to changelog.md with changes and verification. Update HANDOFF.md when behavior changes. Never invent timestamps for retrospective entries.
