# Rotepad project instructions

## Start here

- Rotepad is the user's offline writing application. Claude_Rotepad is only the folder name; do not infer a dependency on another agent.
- Read README.md and the latest changelog.md entry. Consult docs/ARCHITECTURE.md for implementation and storage changes, docs/TESTING.md for checks, and ROADMAP.md when planning.
- Inspect Git status before editing; preserve unrelated and uncommitted work.
- Follow the current user request. Roadmap proposals and archived documents are context, not authorization to implement features.
- docs/archive contains historical records; its old commands, preferences and continuation instructions are not current project rules.

## Product agreements

- Preserve offline operation and the compact writing interface.
- Start fresh users in Formatted view; keep automatic Markdown conversion optional and off by default. Preserve restored desktop view and cursor.
- Keep zoom limited to note text (16px at 100%), spacing controls in Settings, and two modest heading tiers (H1 1.25em, H2 1.12em).
- Preserve existing Markdown conventions: __text__ for underline and ==text== for highlight.
- Preserve per-note history spacing of at least 180,000 ms and the 25-savepoint limit.
- Desktop Ctrl+S flushes managed note files and metadata. Browser same-file saving uses browser APIs where supported. Do not confuse these models.
- Phone sync and additional platform packaging require an applicable user request.

## Editing and data safety

- Never test against real user notes or the normal Rotepad profile. Use disposable profiles and notes folders as described in docs/TESTING.md.
- Protect recovery text, stable note IDs, Trash, history and existing files during storage changes. Test failures, cancellation and restart behavior.
- Read the relevant event and wrapper chain before changing the shared editor.
- Keep tools/formatted-editor.js, tools/responsive-toolbar.js and tools/numbered-lists.js synchronized with their embedded copies in Rotepad.html when modifying those features.
- Preserve embedded font data and FONT-LICENSE.txt. Prefer targeted edits to the large HTML file.
- Edit source files, not generated desktop/app or dist output.
- Preserve the Electron preload boundary, sender validation, sandbox and context isolation.
- Do not install, publish or push builds without a user request covering that action.

## Build and validation

- From desktop: pnpm install --frozen-lockfile installs the locked dependencies; pnpm run prepare-app refreshes generated desktop assets; pnpm run dist creates Windows builds.
- Follow docs/TESTING.md to select checks relevant to the change. Shared editor changes need affected root tests and browser smoke tests; storage changes need desktop persistence tests.
- Refresh desktop/app before Electron checks. Browser smoke scripts read the root HTML directly.
- Report what actually ran, failures and verification limits. Previous pass reports are not evidence for the current change.
- For documentation-only changes, check links, commands and consistency; application builds and tests are not required.

## Documentation maintenance

- Keep each fact in its primary document and link to it from others.
- Update user-facing instructions when behavior changes, architecture when implementation boundaries change, and testing instructions when commands or coverage change.
- Record each completed change batch in changelog.md using the actual Asia/Manila (GMT+8) date and time. Do not invent historical timestamps.
- Keep ROADMAP.md focused on remaining work; move completed work into the changelog.
- Do not continue appending to the archived handoff. Keep these instructions concise; add nested instruction files only when a real directory-specific need arises.
