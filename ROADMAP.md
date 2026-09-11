# Rotepad roadmap

Updated: 2026-09-11

## Completed in the September 11 update

The user authorized priorities 1–7 below, grouped typing undo, and selection-only Clear formatting. These have been implemented:

- File, View, and Help menus; simplified toolbar with spacing still visible.
- Active/mixed bold, italic, and underline indicators.
- Paragraph style selector: Normal text, Heading 1–3, Quote.
- Download note wording; browser save status with file-export details in its tooltip.
- File actions removed from Settings, leaving appearance/editing preferences.
- Compact Find bar with opt-in replacement controls; Ctrl+H reveals replacement.
- Hidden permanent help strip and reduced pane captions.
- Typing bursts grouped into undo steps with a 900 ms inactivity threshold and action boundaries.
- Clear formatting removes selected inline styling while preserving heading, quote, and list containers.
- Find exits Focus mode so its controls are visible.

Existing logic tests and new simplification tests pass. This is not an interactive-browser verification claim. The browser checklist and remaining editing items below still apply.

## Direction

History cadence refinement implemented: significant automatic savepoints at least three minutes apart per note; no short writing-session entries. Manual savepoints also respect the interval. Quote/Find toolbar buttons now use icons with tooltips.

September 11 follow-up implemented: fixed text size with toolbar Zoom; Sidebar at the left and Find at the right; spacing moved to Settings at the user's request; two modest heading tiers; scheme-free website entry; visible History with automatic, manual, and restoreable per-note savepoints. This supersedes the older recommendation to keep spacing on the toolbar.

Keep Rotepad a simple, local, Notepad-meets-Notion writing tool. It has enough features for now. Prioritize clarity, predictable editing, and reliability over adding more controls.

These are proposed future changes, not completed work. The user requested that they be saved for later; this document does not authorize implementing them automatically.

## Next recommended pass

- [x] Simplify the toolbar while keeping frequently used formatting easy to reach.
- [x] Show active bold, italic, and underline states at the cursor or selection.
- [ ] Make normal paragraphs, headings, quotes, and lists behave predictably.
- [ ] Perform an interactive browser check of typing, selection, undo, view switching, and note switching.

## UI improvements, in priority order

1. **Simplify the toolbar.** Keep Undo/Redo, font, size, line spacing, bold, italic, underline, Quote, Link, and More visible. Consolidate Focus, Outline, and the four editing views into one View menu. Preserve the default single formatted Write view and access to the other views.
2. **Show active formatting.** Visually indicate whether bold, italic, or underline is active. Account for mixed selections and provide accessible pressed states.
3. **Replace H with a paragraph menu.** Offer Normal text, Heading 1, Heading 2, Heading 3, and Quote. Make returning to normal text obvious. Retain convenient access to Quote.
4. **Clarify saving.** Consider renaming Save .md to Download note. Keep browser autosave as the primary status and put detailed export information in a tooltip. Never imply that a requested download was verified on disk.
5. **Separate actions from preferences.** Put print, backup, restore, and download in a File menu. Keep appearance and editing preferences in Settings. Review placement of Help/shortcuts and draft recovery.
6. **Simplify Find.** Show a small Find bar first; reveal replacement controls only when Replace is requested.
7. **Reduce repeated instructions.** Remove the permanent shortcuts strip and unnecessary pane captions from normal Write view. Keep help in tooltips and a shortcuts guide.

**Important preference:** Keep the three-tier vertical line-spacing control directly accessible. Simplifying the UI should not bury a control the user explicitly requested.

## Editing improvements

- [ ] Enter on an empty quote or list item should return to a normal paragraph consistently.
- [x] Group a short burst of typing into one undo action, with sensible boundaries for formatting, paste, replacement, and note changes.
- [x] Fix Find in Focus mode: reveal the panel or leave focus mode when searching.
- [x] Keep Clear formatting scoped to the intended selection without paragraph conversion.
- [ ] Verify cursor and scroll restoration across notes, modes, blank lines, and formatted blocks.
- [ ] Verify multiline quote selection, toggling formatting, and continuing normal text after formatting.

## Browser verification checklist

Use disposable notes and preserve the user's existing notes. Avoid modifying or overwriting their browser storage during tests.

- [ ] Type, select, format, and undo/redo in Write and Markdown views.
- [ ] Check toolbar actions preserve the selection.
- [ ] Check Enter/Backspace in headings, quotes, lists, and checkboxes.
- [ ] Check automatic links, paste-to-link, editing/removing links, and clear formatting.
- [ ] Switch views and notes without losing content or cursor position.
- [ ] Check Find/Replace, including Focus mode and formatted selections.
- [ ] Check narrow windows, interface zoom, dark mode, line spacing, and split resizing.
- [ ] Export/import Markdown and restore a backup using disposable data.
- [ ] Verify Trash, pinning, sorting, and recovery copies.
- [ ] Inspect print output without initiating an unwanted print job.

## Acceptance criteria

A user should be able to start writing immediately, understand where notes are saved, apply and remove formatting without surprises, and find occasional tools without a crowded interface. Preserve existing notes and keep the HTML app self-contained and usable offline.
