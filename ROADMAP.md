# Rotepad roadmap

Remaining work as of 2026-09-20. Completed releases and verification are recorded in the [changelog](changelog.md). These proposals are not blanket authorization; follow the user's requested scope.

## Direction

Keep an offline, uncomplicated writing application with predictable editing and reliable local saving. Desktop is the main home for notes; a phone companion is a future goal. Preserve compact controls, text-only zoom, Settings-only spacing and per-note recovery history.

## Known workspace issues

These findings remain unresolved in the documentation. Reproduce against the current version before fixing; do not assume historical severity or implementation details still apply.

- [ ] Restoring the last deleted note should reopen it, including the same-active-ID case.
- [ ] Preserve an empty workspace after all notes are moved to Trash and the app restarts.
- [ ] Creating a note while viewing Trash should switch the sidebar to Open/Library.
- [ ] Review combined bold/italic parsing and consecutive formatting shortcuts separately from fonts. The existing parser leaves literal asterisks in `***text***`; consecutive Ctrl+B/Ctrl+I scenarios during font checks also did not retain both styles and need an isolated interaction review. The combined font face itself loads and renders correctly.

- [ ] Triage the remaining [2026-10-06 exploratory QA findings](docs/QA-2026-10-06.md). Its data-loss items (D1–D7) and the `#`/`~~` and file-name link changes (F1–F2) are fixed. Next: format changes on reload (F3–F12), caret after list commands and Undo, Markdown-view Outline scrolling with wrapped lines, large-paste performance, and backup/Trash/keyboard issues.

Original reproductions are in the [0.5.1 QA report](docs/archive/QA-0.5.1.md). Its closed-note printing issue was resolved for desktop in 0.7.0 and is recorded in the changelog.

## Reliability and interactive checks

Use disposable notes, isolated profiles and test files.

- [ ] Verify fresh Windows installation/upgrades, default-app selection, native Save/Open dialogs, cancellation and failed writes.
- [ ] Verify physical printing, links, closing/reopening and prolonged desktop use.
- [ ] Broaden interactive checks for bullets, checkboxes, nested lists, lists inside quotes and middle-of-list exits.
- [ ] Verify heading/quote transitions, Shift+Enter, blank blocks, toolbar selection, mixed formatting, clipboard paste and clear formatting.
- [ ] Verify undo after typing, paste, formatting, list/quote exit and history restore.
- [ ] Verify cursor/scroll restoration across notes, views and zoom levels.
- [ ] Verify browser file-permission renewal, handle reload and download fallback.
- [ ] Verify history spacing across note switching/reload and minor edits, plus backup metadata/preferences/revision labels.
- [ ] Check themes, narrow windows, wrapping, split resizing, outline and zoom at 80-150%.
- [ ] Review print output and document whether screen text zoom should affect printing.
- [ ] Broaden round-trip coverage for nested lists, multiline quotes, code, blank lines and ordered start numbers.

Existing tests cover some of these scenarios; these tasks concern broader/manual coverage. See [testing](docs/TESTING.md).

## Editing feedback and maintenance

- [ ] Gather feedback on the formatted workflow, tables and which toolbar controls should remain visible at narrow widths.
- [ ] Consider explicit table row/column insertion and deletion controls.
- [ ] Evaluate notification/reconciliation when managed files change externally during a session; startup reconciliation already exists.
- [ ] Consolidate superseded handlers and wrappers while preserving behavior.
- [ ] Clarify code boundaries between note state, UI preferences, undo and persistent revisions.
- [ ] Extend browser interaction coverage as needed; remove stale fixed test-count labels.

## Platforms and distribution

- [ ] macOS/Linux packaging and platform-specific checks.
- [ ] Mobile layout and touch editing; evaluate PWA versus a mobile wrapper.
- [ ] Consider code signing before wider Windows distribution.
- [ ] Gather feedback from actual installer and portable use.

## Phone companion and synchronization

The eventual goal is automatic two-way sync with offline phone access and local PC storage preferred. Read-only phone viewing is an initial milestone. Storage, connection method, cloud/relay involvement and background behavior remain undecided; discuss these choices before implementation.

- [ ] Choose the initial phone platform.
- [ ] Evaluate authenticated pairing, encrypted transfers and device revocation over the same local network, without a required cloud account or hosted note storage.
- [ ] Pair devices, sync selected notes and support offline viewing/search of downloaded notes.
- [ ] Show last successful sync and pending updates. Both devices need to be awake, reachable and running the sync component to exchange new changes; cached phone notes should remain readable while the PC is off.
- [ ] Begin with foreground/manual sync and investigate Android/iOS background limits separately.
- [ ] Before phone editing, define stable IDs, versions, rename/deletion behavior, conflict preservation and recovery. Do not assume PC edits always win.
- [ ] Evaluate remote access separately: direct connections/VPN, optional relay or a user-owned always-on device. Distinguish no cloud note storage from no external infrastructure.
- [ ] Add phone editing and automatic two-way sync after the architecture and conflict rules are agreed.

Sync is not a substitute for backups. Desktop reliability stays the first priority.
