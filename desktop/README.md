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

dist also writes ../dist/latest.yml and ../dist/Rotepad-<version>-Setup.exe.blockmap. Building does not install or publish anything. The builds are unsigned previews.

## Assembly and generated files

prepare.cjs copies Rotepad.html into app and injects library bootstrap, desktop integration, library management, the single-row toolbar, note tabs, Windows title-bar/About controls and print preview. It copies icons and the font license as well. Always prepare after source changes before development runs or Electron tests.

Edit source files, not app. Generated app, node_modules and test-profile are ignored locally; root dist is ignored by the repository.

## Windows integration

Since 0.13.0 the installer is a per-user NSIS setup: it installs to %LOCALAPPDATA%ProgramsRotepad by default, allows choosing the installation directory, needs no administrator approval and skips electron-builder's "only for me / anyone" page (`customInstallMode`). Earlier versions installed for all users in Program Files. When the installer finds such a copy, it offers to remove it first (`customInit`): Rotepad must be closed, a copy of the old uninstaller then runs from the temporary folder with `/allusers` and asks Windows for permission itself, and app data is kept. If the user declines or removal fails, the new copy is installed for the user alongside the old one, which stays listed in Windows Settings > Apps. Silent installs never ask and always install for the user. [installer.nsh](installer.nsh) registers .md/.markdown/.txt handlers under the name Rotepad, plus Windows Default Apps capabilities. After the folder page, an opt-in **Default apps** page (`customPageAfterChangeDir`) offers Markdown (.md) and Text (.txt) boxes, both unticked. For each ticked type, the install step calls `SHOpenWithDialog` with `OAIF_REGISTER_EXT|OAIF_FORCE_REGISTRATION`. That is Windows' own picker with "Always" pre-ticked, and the user's choice there records the default. No file is opened (no `OAIF_EXEC`), and silent installs skip it.

The installer itself never writes extension defaults or UserChoice. Registrations go to SHCTX, the current user's hive in a per-user install, and the picker records the choice for the signed-in user. The earlier finish-page Settings shortcut was replaced by this page. The portable executable does not register associations; its Settings button opens the general Windows Default Apps page.

The explicit FriendlyAppName and application-name registration supply the Open with label. Executable paths are quoted so installation folders containing spaces work. This custom registration replaces electron-builder's fileAssociations configuration, which would also write extension defaults. The existing Markdown ProgID is retained for upgrades. Uninstall removes Rotepad's own registration while preserving other applications' registrations.

The installer is configured to retain app data on uninstall. Notes live in managed Markdown files, with recovery and metadata in the app profile; see [storage and recovery](../docs/ARCHITECTURE.md#storage-and-recovery).

Startup and already-running file opening, native pickers and Explorer integration are implemented. An additional launch opens another window in the same process; File → New window and Ctrl+Shift+N do the same. The windows share the library and save coordinator; see the [main README](../README.md#writing-and-notes) for workspace and conflict behavior. Automated checks mock external interactions; installation, upgrades, default-app selection and physical printing still require manual verification.

## Updates

Installed copies (0.13.0 and later) update themselves with [electron-updater](https://www.electron.build/auto-update) from this repository's GitHub releases. The `publish` block in [package.json](package.json) is written into the app as resources/app-update.yml; `--publish never` keeps building from uploading anything. Every Rotepad release is a GitHub pre-release, so the updater allows pre-releases and takes the newest release; without that it would look only at GitHub's "latest" release, which excludes pre-releases.

For installed copies to see a release, attach three files from ../dist to it: Rotepad-<version>-Setup.exe, latest.yml and Rotepad-<version>-Setup.exe.blockmap (the block map lets later updates download only the changed parts). The asset names must stay exactly as built, because latest.yml names the Setup file and its SHA-512. The portable executable does not update itself.

Behavior and its implementation are described in the [main README](../README.md#updates) and the [architecture](../docs/ARCHITECTURE.md#security-and-printing). Builds are unsigned, so the updater checks the download against the SHA-512 in latest.yml rather than a publisher signature.

## Icons

assets/rotepad.svg is the source. render-icon.cjs produces the PNG and ICO using Playwright and Python with Pillow. Set PLAYWRIGHT_PATH and PYTHON_EXE to actual installed tool paths before regenerating. The PNG is used in the header; the ICO is used for Windows executable/window icons.

## Tests and other platforms

Follow [TESTING.md](../docs/TESTING.md) for commands and disposable-profile requirements. The installed and portable executables ignore the development test-profile override; use the development runtime for isolated tests.

macOS/Linux packaging and phone work remain in the [roadmap](../ROADMAP.md).

