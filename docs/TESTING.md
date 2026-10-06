# Rotepad testing

## Scope and prerequisites

Run commands from the repository root unless stated otherwise. Use Node.js for the root tests. Desktop development requires pnpm and the dependencies installed from desktop/pnpm-lock.yaml; see the [desktop guide](../desktop/README.md).

Browser and Electron smoke tests require Playwright. It is not declared in desktop/package.json: provide an existing installation through PLAYWRIGHT_PATH, or install it in a separate tooling directory. PLAYWRIGHT_PATH must be an absolute path that Node can require. Browser smoke tests launch installed Microsoft Edge using the msedge channel.

Set the path in PowerShell using your actual installation:

```powershell
$env:PLAYWRIGHT_PATH = 'C:\path\to\node_modules\playwright'
```

The single-row smoke script requires this environment variable explicitly; most other scripts also support resolving playwright as a normal dependency.

## Isolation

Use only disposable notes, profiles and files. Electron smoke scripts create unique profiles below desktop/test-profile and pass ROTEPAD_TEST_DATA. In development, main.cjs places the default notes directory inside that profile unless test settings override it.

Do not point test settings to real notes. ROTEPAD_TEST_DATA is honored only when Electron reports that the app is not packaged. Running an installed or portable executable is not automatically isolated by this variable.

Native pickers, Explorer and printing are mocked in relevant tests. Do not interpret those checks as verification of real system dialogs, installation or printer output.

## Root regression tests

These tests use Node built-ins and extracted functions or minimal fixtures. Run the relevant script directly, for example:

```powershell
node tests/formatting.cjs
node tests/file-save.cjs
```

To run the current root suite in PowerShell, stopping on failure:

```powershell
Get-ChildItem tests -Filter '*.cjs' | Sort-Object Name | ForEach-Object {
    & node $_.FullName
    if ($LASTEXITCODE -ne 0) { throw "Failed: $($_.Name)" }
}
```

| Script in tests/ | Main area |
| --- | --- |
| formatting.cjs | Markdown parsing and serialization |
| library.cjs | Library state and recovery |
| backup.cjs | Backup validation and restoration |
| comfort.cjs | Editing conveniences and undo behavior |
| simplification.cjs | Simplified controls |
| history-url.cjs | History spacing and URL behavior |
| quote-exit.cjs | Empty quote exit |
| file-save.cjs | Mocked browser file saving |
| list-zoom.cjs | List exit and text zoom |
| fonts.cjs | Embedded fonts, defaults and zoom retention |
| window-merge.cjs | Concurrent note edits, conflict copies, deletion, workspace isolation and merged history limits |

These fixtures do not establish real contenteditable, selection, layout or native dialog behavior.

## Browser smoke tests

These scripts live in desktop but open the root Rotepad.html directly in headless Edge. They do not require desktop/app preparation.

```powershell
node desktop/formatted-smoke.cjs
node desktop/toolbar-smoke.cjs
node desktop/bold-smoke.cjs
node desktop/numbering-smoke.cjs
node desktop/list-interactions-smoke.cjs
node desktop/tab-smoke.cjs
node desktop/highlight-smoke.cjs
node desktop/dash-smoke.cjs
node desktop/font-smoke.cjs
node desktop/quote-literal-smoke.cjs
node desktop/bullet-literal-smoke.cjs
node desktop/data-safety-smoke.cjs
```

They cover formatted defaults and view switching, literal typing and opt-in conversion, tables and indentation, responsive toolbar selection, inline formatting reversal, numbered continuation and empty-item exits. Select scripts according to the changed behavior.

numbering-smoke.cjs also covers Backspace at the start of nonempty numbered/bulleted items, preserved inline formatting and following numbers, middle-item removal, undo, nested outdent and view round trips.

list-interactions-smoke.cjs exercises typed numbered and parsed numbered/bullet prefixes with automatic conversion on/off, middle/start/end splits, menu-created lists, literal prefix removal, styles, Undo/Redo, soft-line round trips, selection deletion, paste, beforeinput/composition guards, source bullets/tasks/code, nested empty exit and reload. Add `--desktop` to run the same scenarios in Electron after preparing desktop/app; it explicitly configures a disposable notes folder. These checks do not establish exact parity with every Notepad version or verify a physical IME/mobile keyboard.

tab-smoke.cjs checks Tab insertion and caret placement, Shift+Tab, Undo/Redo, inline styles, list nesting, code, table cell navigation, source/Split mode, multiline selection, modifier/composition guards, UI focus navigation, view conversion and reload. Use `--desktop` after preparing desktop/app for the same checks in isolated development Electron with a disposable notes folder.

## Electron smoke tests

highlight-smoke.cjs verifies equals-sign dividers, literal highlight syntax, intentional highlights, typing/paste/parsed input, conversion off/on, view round trips, Backspace reversal, code, links and neighboring styles. With `--desktop` it uses a disposable profile/notes folder, checks the managed Markdown file and restarts development Electron. Otherwise it checks browser reload. Prepare desktop/app before the desktop variant.

dash-smoke.cjs verifies literal two/three/long hyphen runs in Formatted/Markdown/Split, optional conversion on/off, ordinary Backspace, deletion, selection, middle insertion, styles, Undo/Redo, code/table text, literal paste/import, explicit divider round trips and reload. Its `--desktop` variant checks the managed file in an isolated profile before reload. Synthetic composition guards do not establish physical IME behavior. Blank-note multiline paste is covered by data-safety-smoke.cjs.

font-smoke.cjs checks the fresh Fixed Extended default and loading all four embedded faces. It counts separate ink groups in screenshots of hyphen runs, so font joining cannot pass merely because the underlying characters are correct. It covers typed runs, regular/bold/italic text, a combined-style rendering fixture, Formatted/Markdown/Split/Preview, print CSS, upgrading the previous default, preserved zoom and later font choices. Add `--desktop` for isolated development Electron. Print-media screenshots do not verify physical printing or exported PDF pixels; the combined-style fixture does not certify nested Markdown parsing or consecutive formatting shortcuts.

data-safety-smoke.cjs covers the fixed data-loss findings from the [2026-10-06 QA](QA-2026-10-06.md):
- Find: Enter, ↓ and typing keep focus and leave the note unchanged in Formatted and Markdown views; Escape selects the match; a wrapped, far-down Markdown match scrolls into view.
- Lists: selected nested items with Shift+Tab/Tab and Undo for numbers and bullets, a partial-word selection, the first-item no-op and caret Shift+Tab.
- Code: Enter, Shift+Enter and paste in code blocks.
- Tasks: Backspace, Delete, Ctrl+Backspace and selection deletion across task items, with no ☐/☑ in the Markdown.
- Saving: Clear formatting and Replace all never write empty markers; multiline paste into a blank note keeps every line; literal `#` and `~~` survive; file names are not auto-linked while web addresses are; reload.

Add `--desktop` to also check the managed Markdown file.

bullet-literal-smoke.cjs checks that typed and pasted `- `, `* ` and `+ ` prefixes stay plain text with auto-Markdown off/on: space and Enter, middle split and caret, ordinary Backspace, empty marker lines, Undo/Redo, tabs, soft breaks, multiline paste after a paragraph, escapes (`\-`, `\+`, `\*`), views and reload. It also confirms unchanged neighbors: mid-line and repeated hyphens, typed numbered lists, typed headings with auto-Markdown on, the Bullet list command, Markdown-view bullets and continuation, and existing Markdown bullets. Add `--desktop` after preparation to also check the managed Markdown file in an isolated profile.

quote-literal-smoke.cjs checks literal `> text` typing and plain-text paste with auto-Markdown off/on, first/following paragraphs, Enter/Backspace, Undo/Redo, view changes and reload. It also checks manual/source/existing quotes, exiting an empty quote created with the toolbar, styles, link-label escaping and code. Add `--desktop` after preparation to check the same interactions and actual managed-file contents in an isolated development profile. It does not migrate previously formatted quotes or certify physical IME behavior.

Refresh the generated desktop app first:

```powershell
pnpm --dir desktop run prepare-app
node desktop/library-smoke.cjs
node desktop/markdown-files-smoke.cjs
node desktop/multi-window-smoke.cjs
node desktop/note-tabs-smoke.cjs
node desktop/shell-ui-smoke.cjs
```

| Script in desktop/ | Main area |
| --- | --- |
| library-smoke.cjs | Migration, autosave, quiet close, workspace restoration, recovery and failed-write retry |
| markdown-files-smoke.cjs | Managed Markdown migration, collisions, renames, Trash, startup reconciliation and recovery |
| multi-window-smoke.cjs | New-window menu/shortcut, actual second process launch, shared notes and independent workspaces, conflicts/retry, token isolation, interrupted drafts and independent close |
| smoke.cjs | Native integration with mocked pickers, import/export, folder preferences and file opening |
| reveal-smoke.cjs | Show in File Explorer, including unsaved/invalid/missing-file cases |
| single-row-smoke.cjs | Desktop header geometry at 650–1800px, menu selection preservation, light/dark borderless workspace and 26px status bar |
| note-tabs-smoke.cjs | Tab creation/switching/closing/reopening/renaming/restart, keyboard/caret, multi-window tab isolation, formatting-button selection/Undo, failed-close recovery and compact light/dark layout |
| shell-ui-smoke.cjs | Windows title-bar safe area, themes/resize/Focus and window-state changes, About version/copyright, mocked default-app action, invalid-theme rejection and TXT startup/second-window opening |
| print-preview-smoke.cjs | Preview, PDF export, mocked printing, errors and empty-workspace guard |
| close-smoke.cjs | Delegates to library-smoke.cjs; does not need a duplicate run |

Storage changes should include both library-smoke.cjs and markdown-files-smoke.cjs. Printing and layout changes need the corresponding desktop checks.

note-tabs-smoke.cjs checks the 34px tab strip above the 38px toolbar, long-title overflow and selected-tab visibility at 650/850/1250px, plus Focus/print hiding and an empty workspace. Focus retains the Windows native title-bar area while hiding its tabs. It writes screenshots into its disposable profile for visual inspection. It uses actual mouse/keyboard controls for tabs and the existing Remove formatting button; source/rich selection fixtures verify partial clearing and Undo. An injected metadata-write failure must leave the tab and its text available until retry succeeds. tab-smoke.cjs continues to cover text indentation; in desktop, Ctrl+Tab is now note navigation (covered by note-tabs-smoke.cjs), and ordinary UI focus navigation starts from the new-note button instead of the hidden title field.

shell-ui-smoke.cjs is Windows-only and resizes actual BrowserWindows to check the Window Controls Overlay safe area. It invokes maximize/minimize/restore through Electron, exercises menu and tab controls, and mocks shell.openExternal so Windows Settings is not opened. Native dragging, Snap layouts, caption-button mouse targets, Windows scaling/multiple monitors, installation/uninstall and real default-app selection remain manual checks. Compile the NSIS installer when installer.nsh changes and review registration/unregistration for quoted paths, preserved existing defaults and application-owned keys; compilation does not verify the Windows registry outcome.

Font checks also cover both removed Iosevka choices in older saved workspaces, fallback to Fixed Extended, retained zoom and a standard font choice surviving reload. Embedded font payloads must remain intact.

Multi-window changes also need multi-window-smoke.cjs. It holds broadcasts to reproduce competing saves, checks actual managed files, injects a metadata-write failure to verify stable conflict-copy IDs on retry, and interrupts the process with an unsaved secondary-window draft. It checks remote rename/Trash/new-note updates, selection and Undo isolation for other-note changes, the real menu/keyboard entry points and a second development Electron process. Native open/print interactions are mocked for token-ownership checks. smoke.cjs checks a simulated Explorer file launch opens in another window; real Windows associations and packaged installation remain manual checks.

## Packaged payload review

desktop/review-smoke.cjs is an exploratory report, not a comprehensive pass/fail regression suite. It reads dist/win-unpacked/resources/app.asar under the development Electron runtime. Build first, check the reported payload version, and confirm isolation before using it:

```powershell
pnpm --dir desktop run dist
node desktop/review-smoke.cjs
```

It records workspace observations. An exit code of zero does not establish that the old QA findings are fixed. The [archived 0.5.1 report](archive/QA-0.5.1.md) records historical reproductions; the [roadmap](../ROADMAP.md) tracks unresolved findings.

## Reporting results

Use the [regression review skill](../skills/rotepad-regression-review/SKILL.md) and its feature map to select scenarios and record passed, failed, not-run and not-applicable coverage. The map complements these commands; it is not evidence that any scenario has been tested.

Record the scripts actually run, the source/build version tested, failures and checks left undone. Historical changelog results apply to their recorded changes only. Avoid fixed total-test claims based on old printed labels.

Use manual checks for fresh installation/upgrades, file associations, real dialogs, accessibility, physical printing and prolonged use. For documentation-only changes, validate paths, links, commands and consistency; no application test run or rebuild is necessary.
