# Rotepad Windows development

The Windows application wraps the shared editor in Electron. Read the [main README](../README.md) for features and note behavior, [architecture](../docs/ARCHITECTURE.md) for implementation, and [testing](../docs/TESTING.md) for checks.

## Prerequisites and build

Use Node.js and pnpm on Windows. Dependency versions are recorded in package.json and pnpm-lock.yaml. From this desktop directory:

```powershell
pnpm install --frozen-lockfile
pnpm run prepare-app
```

To launch the development app with a disposable profile:

```powershell
$env:ROTEPAD_TEST_DATA = Join-Path $PWD ('test-profile/manual-' + [guid]::NewGuid().ToString('N'))
pnpm exec electron .
```

To produce Windows x64 installer and portable builds:

```powershell
pnpm run dist
```

dist runs prepare.cjs before electron-builder with publishing disabled. Output filenames use the version in [package.json](package.json):

- ../dist/Rotepad-<version>-Setup.exe
- ../dist/Rotepad-<version>-Windows.exe

Building does not install the app. These are unsigned previews with no automatic update or publishing setup.

## Assembly and generated files

prepare.cjs copies Rotepad.html into app and injects library bootstrap, desktop integration, library management, the single-row toolbar, note tabs, Windows title-bar/About controls and print preview. It copies icons and the font license as well. Always prepare after source changes before development runs or Electron tests.

Edit source files, not app. Generated app, node_modules and test-profile are ignored locally; root dist is ignored by the repository.

## Windows integration

The installer uses a per-machine NSIS setup, allows choosing the installation directory and requires administrator approval. [installer.nsh](installer.nsh) registers .md/.markdown/.txt handlers under the name Rotepad, plus Windows Default Apps capabilities. Its final page offers an unchecked option to open Windows Settings for the user's default-app choice. It does not overwrite extension defaults or UserChoice. The portable executable does not register associations; its Settings button opens the general Windows Default Apps page.

The explicit FriendlyAppName and application-name registration supply the Open with label. Executable paths are quoted so installation folders containing spaces work. This custom registration replaces electron-builder's fileAssociations configuration, which would also write extension defaults. The existing Markdown ProgID is retained for upgrades. Uninstall removes Rotepad's own registration while preserving other applications' registrations.

The installer is configured to retain app data on uninstall. Notes live in managed Markdown files, with recovery and metadata in the app profile; see [storage and recovery](../docs/ARCHITECTURE.md#storage-and-recovery).

Startup and already-running file opening, native pickers and Explorer integration are implemented. An additional launch opens another window in the same process; File → New window and Ctrl+Shift+N do the same. The windows share the library and save coordinator; see the [main README](../README.md#writing-and-notes) for workspace and conflict behavior. Automated checks mock external interactions; installation, upgrades, default-app selection and physical printing still require manual verification.

## Icons

assets/rotepad.svg is the source. render-icon.cjs produces the PNG and ICO using Playwright and Python with Pillow. Set PLAYWRIGHT_PATH and PYTHON_EXE to actual installed tool paths before regenerating. The PNG is used in the header; the ICO is used for Windows executable/window icons.

## Tests and other platforms

Follow [TESTING.md](../docs/TESTING.md) for commands and disposable-profile requirements. The installed and portable executables ignore the development test-profile override; use the development runtime for isolated tests.

macOS/Linux packaging and phone work remain in the [roadmap](../ROADMAP.md).

