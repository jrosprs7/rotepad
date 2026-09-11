# Rotepad handoff

Updated: 2026-09-11

## Current status and latest request

Latest follow-up: Quote and Find are now icon-only with accessible labels/tooltips. History no longer creates savepoints every few seconds. All newly added savepoints have a minimum 180,000 ms interval per note; automatic entries additionally require significant changes. Manual savepoints honor that interval too. Existing history is retained. If an in-place restore occurs during the cooldown, displaced work is preserved as a separate `(before restore).md` note when needed. Undo and browser autosave remain immediate.

The user resumed and authorized all seven UI simplification suggestions, grouped typing undo, and selection-only Clear formatting. These are implemented. Read the completed-update section of ROADMAP.md before proposing additional work; do not repeat already completed changes.

The September 11 update adds File/View/Help menus, active formatting indicators, a paragraph-style selector, Download note wording, a compact Find bar with optional replacement, less instructional text, grouped typing history, and selected inline-format removal that preserves block structure. Find also exits Focus mode to reveal its controls. Line spacing remains directly accessible.

## Files

- `Rotepad.html` — the complete standalone app. Open it directly in a browser; no installation, server, or internet is required for the app.
- `ROADMAP.md` — proposed simplification and reliability work from the latest review.
- `HANDOFF.md` — this document.
- `tests/formatting.cjs`, `tests/library.cjs`, `tests/backup.cjs`, `tests/comfort.cjs` — Node-based checks.
- `Rotepad-Setup.exe` — pre-existing file; not created or modified during this work.

Workspace: `C:\Users\jrosp\Documents\Claude_Rotepad`

The user's in-app browser was displaying `file:///C:/Users/jrosp/Documents/Claude_Rotepad/Rotepad.html`. Source changes require refreshing/reopening that page.

## User preferences

Latest September 11 refinements override earlier toolbar preferences: font size is fixed at 16 with interface Zoom in its place; line spacing is Settings-only; Sidebar toggle sits at the left of the toolbar; Find sits at the right; only Heading 1 and Heading 2 are offered, with modest sizing. Plain domains in the link dialog normalize to HTTPS.

History now has a visible toolbar button. It keeps the latest 25 savepoints per note, labels major edit boundaries and writing sessions, supports a manual savepoint, previews saved text, and can restore in place (saving the current version first) or restore as a copy. It remains browser-local and included in JSON backups, not downloaded Markdown. New tests: `node tests/history-url.cjs`. Interactive browser testing remains pending.

- Basic Markdown notes with compact, Notepad-like vertical spacing.
- A few familiar fonts and a small font-size range.
- Default to one editable formatted view, similar to the simple writing experience in Notion.
- Keep optional Markdown, Split, and Preview views.
- Recognize typed website addresses automatically.
- Offer click-to-format controls, including selecting text and clicking Quote.
- Underline button and Ctrl+U; the app uses Discord-style `__text__` for underline.
- Keep three line-spacing tiers directly accessible: Compact 1.3, Normal 1.5, Relaxed 1.8.
- Keep the interface understandable and uncomplicated.
- Standalone local HTML was explicitly chosen over hosting.

## Implemented features

### Editing

Formatted Write, raw Markdown, Split, and read-only Preview; basic Markdown rendering; fonts and sizes; bold/italic/underline; headings; quotes; lists; inline/fenced code; checkboxes; strikethrough; highlights; dividers; clear formatting; undo/redo; Find/Replace; automatic website links; link options; paste a URL onto selected text.

Quote is a visible toolbar button. Underline has Ctrl+U. Rich editing uses contenteditable and browser editing commands; raw editing uses a textarea. Markdown is serialized from the formatted DOM.

### Navigation and display

Searchable notes sidebar; sort by recently edited, alphabetical, or newest; pinning; rename/duplicate; Trash and restore; heading outline; remembered cursor/scroll positions; resizable split view; focus mode; font/size controls; three line-spacing tiers; full-width or centered column; dark/light/system theme; word wrap; interface zoom; spellcheck toggle; shortcuts guide.

### Saving and recovery

Browser autosave; open Markdown/plain-text files as notes; download Markdown; per-note file-export comparison indicator; draft revisions and restore-as-new-note; JSON backup/restore of all notes, including Trash and revisions; print/Save as PDF layout.

Backup restore adds separate copies rather than replacing existing notes. There is no permanent-delete flow. A requested file download is not proof the browser saved the file successfully.

## Storage and architecture

- One HTML file contains the CSS and JavaScript; do not introduce required network dependencies casually.
- Primary localStorage key: `rotepad.library.v2`.
- Legacy draft key: `rotepad.draft.v1`; migration exists.
- Library includes notes, active note ID, preferences, font, size, and view mode.
- Notes may include revisions, pinned/trashed state, creation/update times, remembered positions, and a file-export signature.
- Browser storage is specific to the browser/profile/origin. Do not promise that opening the HTML in another browser transfers notes. Use backup export/import for transfer.
- Backup format identifier: `rotepad-backup`, version 1.
- Underline and highlight are extensions: `__text__` and `==text==`. Other Markdown apps may interpret them differently.
- Source has accumulated wrappers and event handlers over several iterations. Read the full relevant flow before changing a function. Older rich-history code coexists with newer per-note history handling.

## Verification so far

The existing Node checks passed during development, including recent underline, quote, and spacing edits. These are syntax and isolated logic tests, with minimal node fixtures for serialization. They are **not** end-to-end browser tests.

Run from the workspace:

```powershell
node tests/formatting.cjs
node tests/library.cjs
node tests/backup.cjs
node tests/comfort.cjs
node tests/simplification.cjs
```

Some test output labels contain historical test counts that were not updated when assertions were added. Do not report those labels as an audited total.

No comprehensive interactive browser QA has been completed. The last review was explicitly code-based. Do not claim that cursor behavior, visual layout, or browser editing was verified through interaction.

## Known review findings / next work

See ROADMAP.md for priorities and acceptance criteria. Specific findings:

- The prior toolbar, Settings, active-formatting, paragraph-menu, Find/Focus, grouped-undo, and Clear-formatting issues were addressed on September 11; verify behavior interactively before considering the UX fully audited.
- Grouping uses beforeinput metadata, an inactivity threshold of 900 ms, and pointer/navigation/command boundaries. Tests cover grouping and redo-branch replacement.
- Clear formatting lifts selected text out of inline wrappers, retaining unselected styled siblings and block containers. The new test includes partial unwrapping within a heading inside a quote.
- Quote/list exit behavior and selection preservation need browser checks.
- Custom parsing/serialization and repeated DOM transformations deserve round-trip and typing checks before expanding formatting support.

Preserve existing notes and backups. Use disposable data for verification. The user has requested a simple tool; the next suggested direction is consolidation and reliability, not another large feature batch.
