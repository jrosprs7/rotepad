# Rotepad changelog

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
