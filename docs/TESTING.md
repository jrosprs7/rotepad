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

These fixtures do not establish real contenteditable, selection, layout or native dialog behavior.

## Browser smoke tests

These scripts live in desktop but open the root Rotepad.html directly in headless Edge. They do not require desktop/app preparation.

```powershell
node desktop/formatted-smoke.cjs
node desktop/toolbar-smoke.cjs
node desktop/bold-smoke.cjs
node desktop/numbering-smoke.cjs
node desktop/list-interactions-smoke.cjs
```

They cover formatted defaults and view switching, literal typing and opt-in conversion, tables and indentation, responsive toolbar selection, inline formatting reversal, numbered continuation and empty-item exits. Select scripts according to the changed behavior.

numbering-smoke.cjs also covers Backspace at the start of nonempty numbered/bulleted items, preserved inline formatting and following numbers, middle-item removal, undo, nested outdent and view round trips.

list-interactions-smoke.cjs exercises typed and parsed prefixes with automatic conversion on/off, middle/start/end splits, menu-created lists, literal prefix removal, styles, Undo/Redo, soft-line round trips, selection deletion, paste, beforeinput/composition guards, source bullets/tasks/code, nested empty exit and reload. Add `--desktop` to run the same scenarios in Electron after preparing desktop/app; it explicitly configures a disposable notes folder. These checks do not establish exact parity with every Notepad version or verify a physical IME/mobile keyboard.

## Electron smoke tests

Refresh the generated desktop app first:

```powershell
pnpm --dir desktop run prepare-app
node desktop/library-smoke.cjs
node desktop/markdown-files-smoke.cjs
```

| Script in desktop/ | Main area |
| --- | --- |
| library-smoke.cjs | Migration, autosave, quiet close, workspace restoration, recovery and failed-write retry |
| markdown-files-smoke.cjs | Managed Markdown migration, collisions, renames, Trash, startup reconciliation and recovery |
| smoke.cjs | Native integration with mocked pickers, import/export, folder preferences and file opening |
| reveal-smoke.cjs | Show in File Explorer, including unsaved/invalid/missing-file cases |
| single-row-smoke.cjs | Desktop header geometry at 650–1800px, menu selection preservation, light/dark borderless workspace and 26px status bar |
| print-preview-smoke.cjs | Preview, PDF export, mocked printing, errors and empty-workspace guard |
| close-smoke.cjs | Delegates to library-smoke.cjs; does not need a duplicate run |

Storage changes should include both library-smoke.cjs and markdown-files-smoke.cjs. Printing and layout changes need the corresponding desktop checks.

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
