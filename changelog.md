# Rotepad changelog

## 10/17/26 8:40 AM GMT+8 — Windows build 0.13.0 (not published): per-user install and automatic updates

- **Requested:** a build that installs per user instead of in Program Files, so it can update itself. Chosen with the user: check once at startup and ask before restarting; offer to remove an older all-users copy.
- **Installer** (desktop/package.json, desktop/installer.nsh): per-user NSIS, by default in %LOCALAPPDATA%\Programs\Rotepad, with no administrator prompt and without electron-builder's "only for me / anyone" page. File-type and Default Apps registrations moved from HKLM to the install context (the user's hive); the Markdown ProgID name is unchanged, so an existing default keeps working. If an all-users copy from 0.12.x is installed, the installer offers to remove it. Rotepad must be closed first, and the old uninstaller asks Windows for permission. App data is kept; if the user declines or removal fails, both copies stay. Settings' Default apps button now opens the per-user registration.
- **Updates** (desktop/main.cjs, preload.cjs, shell-ui.js; new dependency electron-updater 6.8.9). Installed copies check this repository's GitHub releases once per start, pre-releases included. A newer version downloads in the background, then Rotepad asks Restart now / Later. Restart now closes every window through the normal save path before starting the installer silently, which then reopens Rotepad; Later installs on close. Also new: Help → Check for updates… and Settings → Check for updates when Rotepad starts (saved as `updateChecks:false` when off). The portable build does not update. Details are in the [README](README.md#updates), the [desktop guide](desktop/README.md#updates) and the [architecture](docs/ARCHITECTURE.md#security-and-printing). The lockfile also re-resolved `@types/node` and `semver` for the build tools.
- **Releases:** an update is found only when the release has Rotepad-X-Setup.exe, latest.yml and the block map attached; the release procedure in the handoff now says so. 0.13.0 supersedes the unpublished 0.12.7 build and includes everything in it.
- Built with `pnpm run dist`. Rotepad-0.13.0-Setup.exe is 107,639,883 bytes, SHA-256 `2c211fdc6146868bc61e0e4cf74e4a53f3bd580163eecc12f189a5fa4e81fd31`. Rotepad-0.13.0-Windows.exe is 107,378,875 bytes, SHA-256 `9728475789b9b8cbc9b4ffff46ce3acdf85a24dfce51281000b3e11a3ec12ccf`. dist/latest.yml names the Setup file with its SHA-512.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Update flow | New desktop/update-smoke.cjs in development Electron with a disposable profile, a local test feed and the download cache inside the profile: real check, download and SHA-512 verification; message boxes answered from a queue; only the hand-over to the installer recorded instead of run. Startup check and download; Restart now saves typing made just before it to the managed file and asks for a silent install that restarts Rotepad; Later asks for a silent install on close without restart; up to date; unreachable feed; switch off (saved, save folder kept, no startup request, manual check still works, non-booleans rejected); a copy without updates | Passed (9 checks). It does not contact GitHub, run the packaged app or install anything. |
| Packaged payload | Extracted app.asar: version 0.13.0; main.cjs, preload.cjs, library-merge.cjs, markdown-store.cjs and the prepared app files byte-identical to the tested sources; node_modules holds electron-updater 6.8.9 and its dependencies. resources/app-update.yml names the GitHub repository, pre-release type. The NSIS script compiled with the per-user mode and the removal step | Passed. Compiling does not verify the installer's behavior. |
| Neighbors | All root tests; every browser smoke; the editor suites with `--desktop`; every desktop smoke, including shell-ui (now expecting the per-user Default apps link) and update (52 commands) | Passed. |
| Installation, migration and a real update | Not run: a packaged Rotepad uses the normal profile, and the user's PC has an all-users 0.12.1 | Manual, listed in the [testing guide](docs/TESTING.md) and the roadmap: the removal offer and permission prompt with 0.12.x installed, Default apps afterwards, and the first published update (startup offer, Restart now, Later). |

## 10/17/26 8:14 AM GMT+8 — Windows build 0.12.7 (not published)

- Set the desktop package version to 0.12.7 for Always on top, fast large paste and fast typing in large notes in every view. Built Windows x64 NSIS and portable packages with `pnpm run dist` (pnpm 11.19.0 through corepack). The README download link still points at the published 0.12.4.
- Rotepad-0.12.7-Setup.exe is 107,303,667 bytes, SHA-256 `41e6a43651965af4aa559817050b02fbca25b30e87a28e6e24f2e3078c15f4da`. Rotepad-0.12.7-Windows.exe is 107,060,941 bytes, SHA-256 `497c75195355d8b689ed6b3ffb4d39198e6db771511b48441465588f67a216b0`.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Packaged payload | Extracted app.asar: version 0.12.7. main.cjs, preload.cjs, library-merge.cjs, markdown-store.cjs and the prepared app files (Rotepad.html, FONT-LICENSE.txt, icons) are byte-identical to the tested sources; the prepared Rotepad.html contains the incremental typing, preview and link-layer code and the one-step paste. shell-ui-smoke.cjs, large-typing-smoke.cjs --desktop, large-paste-smoke.cjs --desktop and always-on-top-smoke.cjs passed after the bump | Passed. The full suite (51 commands) ran on this source before the version-only change. |
| Installation | Not run | Manual: install over 0.12.x; turn on Always on top against other apps; paste a long text; type in a long note in Formatted, Markdown and Split views. |

## 10/17/26 7:46 AM GMT+8 — Fast typing in large Markdown-view and Split notes

- Typing in a very large note in Markdown view or Split view was still slow (roadmap): every key rebuilt the whole link layer and, in Markdown view, the hidden preview.
- **Fix (Rotepad.html only; the synchronized tools files do not contain these functions):** each view builds only what it shows, and the hidden part is rebuilt when a view shows it. The link layer keeps one element per line and rebuilds only the changed lines. The preview keeps where each block starts and re-parses only from the block before the change to the first unchanged block boundary after it. See the [architecture](docs/ARCHITECTURE.md).
- **After**, measured in headless Edge from keydown to the next frame, median per key, 0.12.6 → now: Markdown view 48 → 14 ms at 2,000 lines, 192 → 48 ms at 10,000 lines and 250 → 64 ms in a 5,000-line note of web addresses; Split view 359 → 47 ms and 580 → 62 ms in the same notes. The textarea alone costs about 14 ms. In development Electron with a clean profile: Markdown view 271 → 48 and 329 → 97 ms, Split view 383 → 80 and 600 → 130 ms. What remains is mostly the browser's layout of the long textarea and link layer, and the whole-library save (still on the [roadmap](ROADMAP.md)).
- **Found, not changed:** a backslash inside a web address (`https://y\.org`) is left out of the Markdown-view link layer, so the rest of that line's layer sits one character off the text. 0.12.6 does the same; added to the roadmap.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Same preview and link layer | desktop/large-typing-smoke.cjs gained Markdown-view and Split scenarios (addresses, Enter, joining lines, multi-line paste, selection delete, Undo/Redo, Find, view switches; lists, code fences, tables, headings and a quote in a mixed note) and four seeded random runs. After every step they must match 0.12.6's whole-note render: Markdown, saved note, preview, link-layer HTML and text, link and Find-highlight positions on screen, and the layer scrolled with the textarea. Separately, 20,000 random source edits in Split view (Markdown markers, fences, tables, lists, addresses, backslashes, emptying the note) compared the preview and layer with a whole-note build after each edit: no differences | Passed in Edge and development Electron. The handoff's Split-view link-position failure was the harness: after an earlier scenario the textarea scrolls its caret into view a frame late, with old and new code alike, so the two passes started at different scroll positions. Both passes now start at the top. |
| Per-key budget | The budget now covers Formatted, Markdown and Split views, each in a 10,000-line note and a 5,000-line address note, under 150 ms. Only the newest long note stays in the library: each key saves the whole library, so in browser storage six such notes filled the quota, and in Electron they made Split view miss the budget (194 ms) | Passed. Edge: Markdown 64/97 ms, Split 77/94 ms; Electron: Markdown 64/97 ms, Split 63/96 ms. Headless or automated timings on this PC only. |
| Neighbors | All root tests; every browser smoke; the editor suites (including large-paste and large-typing) with `--desktop`; every desktop smoke (51 commands) | Passed. No build. |

## 10/17/26 2:12 AM GMT+8 — Fast typing in large Formatted notes

- Typing in a very large note in Formatted view was slow (roadmap). Measured in headless Edge with 0.12.6's code, from keydown to the next frame: about 50 ms per key at 2,000 lines, 210 ms at 10,000 lines and 960 ms in a 5,000-line note of web addresses.
- **Cause:** every keystroke rebuilt the hidden preview and Markdown link layer, unwrapped and re-detected every link in the note, re-marked every link and serialized every block. Each rebuild also changed the DOM next to the caret, which costs Chromium over 10 ms per change in a long note.
- **Fix (Rotepad.html; tools/formatted-editor.js synchronized):** typing now revisits only the blocks an edit touched. Blocks whose links would come out the same are not rebuilt. Each block's Markdown is cached until it changes. The preview is rebuilt only when a view shows it. The optional auto-Markdown pass works the same way. See the [architecture](docs/ARCHITECTURE.md).
- **After:** 14 ms per key at 2,000 lines, about 45 ms at 10,000 lines and 52 ms in the 5,000-line address note, with auto-Markdown off or on. The browser's own floor for a keystroke in that note is about 31 ms. The first key after opening a note or Undo checks every block: about 0.2 s in the address note, against 0.6 s before.
- **Saved text unchanged.** Three old behaviors are kept on purpose:
  - Deleting a style's last character and typing gives plain text, because each pass sets the caret again.
  - A box restored after Enter on a ticked task is saved unticked.
  - A conversion that exposes another one is finished on the next key.
- **One caret improvement:** after typing, switching to Markdown view and back now returns the caret to where typing stopped. Before, it could land at the end of the line.
- **Still slow** (added to the [roadmap](ROADMAP.md)): typing in Markdown view at 10,000 lines (about 200 ms per key, unchanged), and the whole-library save on every key, which grows with the other notes (77 ms per key in the address note with three other 10,000-line notes).

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Same saved Markdown | New desktop/large-typing-smoke.cjs types 33 scenarios (655 steps, real keys) once with the current code and once with the replaced whole-note functions kept in the script. After every step it compares Markdown, saved note, editor HTML and caret. Separately, during development, the same scenarios ran against the previous Rotepad.html in another page, plus 8,400 seeded random steps on a 60-paragraph link note and a mixed note (lists, tasks, quote, code, table, Tab, Ctrl+B, Undo, Shift+Enter): no differences. These runs found the three kept behaviors above, and each now has a scenario that fails without its fix | Passed in Edge and development Electron. Keys are synthetic; IME composition was not exercised. Between steps the harness waits a frame: Ctrl+B uses the caret remembered on `selectionchange`, which faster automated keys can outrun in both versions. |
| Per-key budget | The same script types 16 keys mid-note in a 10,000-line note and a 5,000-line address note. The median must be under 150 ms and the text must be saved; with `--desktop` it also checks the managed Markdown file | Passed: Edge 51/88 ms, Electron 62/101 ms with the scenario notes still in the library. Headless timings on this PC only. |
| Neighbors | All root tests; every browser smoke; the editor suites (including large-paste and large-typing) with `--desktop`; every desktop smoke (51 commands) | Passed. No build. |

## 10/17/26 1:10 AM GMT+8 — Fast large paste in Formatted view

- A tester reported that pasting a lot of text was slow compared with Notepad. Measured in headless Edge before the fix: 100 lines took 0.4 s, 400 lines 5.4 s and 2,000 lines 144 s, rising with the square of the line count.
- **Cause:** Chromium's `insertText` fires an `input` event for every pasted line and line break, and each one re-converted, re-serialized, re-rendered and saved the whole note. `insertText` itself also slows with every line it adds.
- **Fix (Rotepad.html):** the paste handler now skips the per-event work and converts and saves once. When the paste goes into a plain paragraph or an empty note, the lines are inserted as paragraphs in one step. Headings, list items, quotes, code, table cells and formatted text still use `insertText`. See the [architecture](docs/ARCHITECTURE.md).
- **After:** 100 lines take 12 ms, 400 lines 18 ms, 2,000 lines 76 ms and 10,000 lines 0.42 s. Markdown view was already fast (a 2,000-line paste took 0.17 s).
- **Still slow:** typing in a very large Formatted note (about 50 ms per key at 2,000 lines). This is added to the [roadmap](ROADMAP.md).

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Paste result unchanged | New desktop/large-paste-smoke.cjs compares each paste with the previous `insertText` result. It checks Markdown, visible text, caret, active styles and Undo across 18 positions × 8 texts, with auto-Markdown off and on (288 scenarios). Before the test existed, the same matrix was run against the previous Rotepad.html: no differences | Passed in Edge and development Electron. These are synthetic paste events, not a physical Ctrl+V. |
| Speed and saving | The same script pastes 5,000 lines into a blank note. It requires one save, every line kept, the caret at the end and under 3 s (0.42 s in Edge). With `--desktop` it also checks the managed Markdown file | Passed. Timings are from headless runs on this PC. |
| Neighbors | All root tests; every browser smoke; the editor suites with `--desktop`; every desktop smoke (51 commands, including always-on-top-smoke.cjs on the uncommitted Always on top work) | Passed. No build. |

## 10/17/26 12:42 AM GMT+8 — Session handoff and Markdown findings in the roadmap

- Added a [session handoff](docs/HANDOFF-2026-10-17.md) with the current state (including the uncommitted Always on top work), the local build and test setup, and open items. Moved the 2026-10-09 handoff to [docs/archive](docs/archive/HANDOFF-2026-10-09.md) and updated its relative links, the README list and the earlier changelog link.
- Recorded the 2026-10-11 Markdown check in the [roadmap](ROADMAP.md): Formatted-view edits rewrite `***bold italic***`, table alignment rows and links with titles. Also listed the Markdown that is shown as plain text but not supported (images, nested quotes, table alignment and others) for the user to prioritize.
- Documentation only; no application tests were needed. Relative links in the changed documents resolve.

## 10/11/26 8:29 PM GMT+8 — Always on top

- At the user's request, the desktop app has **Menu → View → Always on top**. A tick shows it is on. It applies to every Rotepad window, including windows opened later, and is remembered after restart. Choosing it again turns it off everywhere.
- **Main process:** a new `window-on-top` IPC accepts only a boolean, saves the setting, applies `setAlwaysOnTop` to every window and broadcasts it with `settings-changed`. New windows apply it when created.
- **Settings file:** desktop-settings.json now holds the chosen notes folder and Always on top. Writes go through one serialized `writeSettings` that keeps every stored key. Before this, choosing a save folder rewrote the file with the folder only, which would have dropped the new setting. The default notes folder is still not written unless chosen.
- Added desktop/always-on-top-smoke.cjs; updated the README, architecture and testing guide.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Always on top | always-on-top-smoke.cjs (8 checks) in development Electron through the real Menu → View clicks: tick and window flag on, a new window opens on top, turning it off from the second window releases both and updates the first window's tick, a save-folder change (mocked picker) keeps both keys, a non-boolean value is rejected, restart with it on and off. A screenshot showed "✓ Always on top" in the View menu | Passed. It checks Electron's window flag; staying above other apps was not observed on screen. |
| Neighbors | All root tests; every browser smoke; the editor suites with `--desktop`; every desktop smoke (49 commands, including smoke.cjs for the save folder) | Passed. No build. |

## 10/11/26 6:27 PM GMT+8 — Windows build 0.12.6 (not published)

- Set the desktop package version to 0.12.6 for the dark dropdown lists, copied paragraph spacing and Preview copy fixes. Built Windows x64 NSIS and portable packages with `pnpm run dist` (pnpm 11.19.0 through corepack). The README download link still points at the published 0.12.4.
- Rotepad-0.12.6-Setup.exe is 107,299,368 bytes, SHA-256 `8745e78a6ed4b0fa21d9b78dfe3bdcf2623f4a847092fa94215809e08718286e`. Rotepad-0.12.6-Windows.exe is 107,056,652 bytes, SHA-256 `4cf7d9872f2c51b7dc09bc7058281888daf84dee80c8f334128ba68f42511ee7`.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Packaged payload | Extracted app.asar: version 0.12.6. main.cjs, preload.cjs, library-merge.cjs, markdown-store.cjs and the prepared Rotepad.html are byte-identical to the tested sources and include the themed option colors and copied-HTML spacing. shell-ui-smoke.cjs and data-safety-smoke.cjs --desktop passed after the bump | Passed. The full suites ran on this source before the version-only change. |
| Installation | Not run | Manual: install over 0.12.x; in the dark theme open the paragraph-style and zoom dropdowns; copy lines into Word or email and check there are no gaps. |

## 10/11/26 6:22 PM GMT+8 — Review fixes: copied formatting, Preview copy, dark dropdowns

A review of the 0.12.4–0.12.5 changes (right-click formatting, copy/cut, narrow sidebar), plus a user report:

- **White dropdown lists in the dark theme (user report).** The toolbar's paragraph-style, font, zoom and line-spacing lists opened white with pale text. These selects have a transparent background, so Windows drew their option list on white while the options inherited the dark theme's light text. Options in every `select` now use the theme's `--paper`/`--ink` colors, and disabled options use `--muted`.
- **Copied formatting regained paragraph gaps.** The 0.12.4 copy handler wrote bare `<p>` HTML. Chromium's own copy had given each paragraph `margin: 0` and `white-space: pre-wrap`, so Word or email would have shown a gap between lines and collapsed double spaces. Copied blocks now carry those styles, and a partial line is wrapped in a pre-wrap span.
- **Preview view still copied double-spaced.** Copy in Preview now uses the same single-line-break text.
- Checked and found no problem: cutting across checkbox items leaves no ☐/☑ and copies the item text; typed spaces are stored as ordinary spaces, so the copy carries no non-breaking spaces.
- Not changed: copied text uses LF line breaks where Chromium's default used CRLF. Current Windows apps accept LF.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Dropdown lists | shell-ui-smoke.cjs: in dark and light themes, the options of the paragraph-style, font, zoom, line-spacing and sort lists have an opaque background equal to `--paper` and text equal to `--ink` (computed style). A one-off screen capture of the native lists in development Electron (dark) showed dark lists with readable text | Passed. The native list is not captured by the automated check. |
| Copied HTML | data-safety-smoke.cjs (Edge): margins zero and pre-wrap on copied paragraphs, double spaces kept, partial line wrapped; Preview copy gives `a  b\nsecond` | Passed. Pasting into Word or email clients was not exercised. |
| Neighbors | All root tests; every browser smoke; the editor suites with `--desktop`; every desktop smoke (48 commands) | Passed on the final code. No build. |

## 10/11/26 6:06 PM GMT+8 — Windows build 0.12.5 (not published)

- Set the desktop package version to 0.12.5 for hiding the sidebar in narrow windows. Built Windows x64 NSIS and portable packages with `pnpm run dist` (pnpm 11.19.0 through corepack). The README download link still points at the published 0.12.4.
- Rotepad-0.12.5-Setup.exe is 107,298,062 bytes, SHA-256 `d99993c881539ce76ca8a0bc2decf497f6c30adfbcc348a7e13fd66e46c4a673`. Rotepad-0.12.5-Windows.exe is 107,055,334 bytes, SHA-256 `04ed32bdfacfc31a11e68a2fbaa21e7f7ef9118dba4c77d2537e41fa929b591c`.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Packaged payload | Extracted app.asar: version 0.12.5. main.cjs, preload.cjs, library-merge.cjs, markdown-store.cjs and the prepared Rotepad.html are byte-identical to the tested sources and include the narrow-window sidebar code. shell-ui-smoke.cjs and sidebar-smoke.cjs --desktop passed after the bump | Passed. The full suites ran on this source before the version-only change. |
| Installation | Not run | Manual: install over 0.12.x, narrow the window below 900px and check that the sidebar hides, the button still opens it, and widening restores it. |

## 10/11/26 1:28 AM GMT+8 — Sidebar hides in narrow windows

- At the user's request, the notes sidebar now hides itself when the window is narrower than 900px. The saved sidebar choice (`prefs.sidebar`) is not changed: in a narrow window the sidebar button shows or hides the sidebar temporarily without saving, and widening the window restores the saved choice. Narrowing again hides it. This applies to the browser version as well; on phone-width screens the sidebar now starts hidden and still opens over the note.
- The desktop empty workspace (no open note) still keeps the Library visible in a narrow window.
- The breakpoint uses `matchMedia('(width < 900px)')`; `max-width: 899px` missed Electron's fractional 899.x viewport.
- Added desktop/sidebar-smoke.cjs; updated the README, architecture and testing guide.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Narrow sidebar | sidebar-smoke.cjs in Edge (16 checks) and development Electron (17): hidden at 899/700px and shown at 900px with the preference kept, narrow toggle without saving, widening restores, a closed preference stays closed, the wide toggle saves, reload while narrow, and (Electron) the empty workspace keeps the Library visible | Passed. Resizing used the viewport size; dragging a real window edge was not exercised. |
| Neighbors | All root tests; every browser smoke; the editor suites with `--desktop`; every desktop smoke (48 commands) | Passed on the final code. A first run failed tests/library.cjs because the new code sat inside the range that test evaluates without `matchMedia`; the code was moved after applyPrefs and everything was rerun. No build. |

## 10/9/26 10:51 PM GMT+8 — Public 0.12.4 installer download

- Published the [0.12.4 Windows testing release](https://github.com/jrosprs7/rotepad/releases/tag/v0.12.4) (pre-release) with Rotepad-0.12.4-Setup.exe, tagged on 25c0096cfee10490dc6969d4fc0e86aad27f28ca. The installer was built from e5063e9; the later commit only points the README download link at 0.12.4. The notes also cover 0.12.3's save-back to opened files, which was never released on its own.
- Verified that GitHub's asset digest matches the local installer (`172c72d84121e6dcf8735740a2ead6b050e2a706cbeef353df12a4c76ecc727b`), and that the 107,295,948-byte download returns HTTP 200 without authentication and hashes identically. No app code or installer bytes changed.
- Installation, upgrading, real right-clicks, pasting into other apps, save-back after a double-click and desktop spellcheck remain tester checks; the release notes ask testers to report them.

## 10/9/26 10:34 PM GMT+8 — Windows build 0.12.4 (not published)

- Set the desktop package version to 0.12.4 for right-click formatting and single-spaced copy. Built Windows x64 NSIS and portable packages with `pnpm run dist` (pnpm 11.19.0 through corepack). The README download link still points at the published 0.12.2.
- Rotepad-0.12.4-Setup.exe is 107,295,948 bytes, SHA-256 `172c72d84121e6dcf8735740a2ead6b050e2a706cbeef353df12a4c76ecc727b`. Rotepad-0.12.4-Windows.exe is 107,053,229 bytes, SHA-256 `78c2cc1fe231df468a41af6bd6b21baba0c472980906780f972c8db7e3948b32`.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Packaged payload | Extracted app.asar: version 0.12.4. main.cjs, preload.cjs, library-merge.cjs, markdown-store.cjs and the prepared Rotepad.html are byte-identical to the tested sources and include the `context-format` menu items, the preload allowlist, the renderer hook and the copy handler. shell-ui-smoke.cjs and context-menu-smoke.cjs passed after the bump | Passed. The full suites ran on this source before the version-only change. |
| Installation | Not run | Manual: install over 0.12.1, right-click selected text (formatting items), copy several lines into Notepad (single-spaced). |

## 10/9/26 10:30 PM GMT+8 — Right-click formatting and single-spaced copy

- **Right-click did nothing for the user** because the installed app is 0.12.1, which predates the desktop right-click menu (added in 0.12.2). At the user's request, the menu now also offers **Bold, Italic, Underline, Strikethrough, Highlight and Clear formatting** when text is selected in the note (Formatted or Markdown view). Single-line fields such as Find don't get them. The items go to the renderer as a fixed `context-format` type; preload allows only those types, and the renderer applies them with the toolbar's own commands while the note editor has focus.
- **Copied lines pasted double-spaced in other apps.** Each line in Formatted view is its own paragraph, and Chromium's default plain-text copy puts a blank line between paragraphs. Copy and Cut in Formatted view now write one line break per line, keep a typed blank line, and still include the formatted HTML for apps that accept it. This applies to the browser version too. Pasting the copy back into Rotepad also no longer doubles the lines.
- Updated the README, architecture and testing guide; added checks to context-menu-smoke.cjs (18 checks) and data-safety-smoke.cjs (52 checks).

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Menu formatting | context-menu-smoke.cjs in development Electron: items appear only for a selection in the note; Highlight, Strikethrough, Bold and Clear formatting give `==two==`, `~~three~~`, `**four**` and back; Undo restores; Markdown-view Highlight wraps the textarea selection; none for a caret or the Find field | Passed. Native menus are captured in the main process, not clicked. |
| Copy/Cut | Typed lines (with a blank line) copied with Ctrl+A/Ctrl+C and the menu's Copy give `first line\nsecond line\n\nafter blank` on the system clipboard, with HTML; a two-line selection and Ctrl+X give single line breaks; Undo restores the cut. In Edge, a synthetic copy event gives the same text and the copy pastes back unchanged | Passed. Pasting into specific other apps (Notepad, Word, chat apps) was not exercised. List markers are not added to copied list items, as before. |
| Neighbors | All root tests; every browser smoke; the editor suites with `--desktop`; every desktop smoke | Passed (note-tabs-smoke.cjs included). No build; installed 0.12.1 is unchanged. |

## 10/9/26 9:12 PM GMT+8 — Windows build 0.12.3 (not published)

- Set the desktop package version to 0.12.3 for saving back to opened files. Built Windows x64 NSIS and portable packages with `pnpm run dist` (pnpm 11.19.0 through corepack). The README download link still points at the published 0.12.2.
- Rotepad-0.12.3-Setup.exe is 107,295,970 bytes, SHA-256 `4ede0f6ffd180032b05ac79b0ab5be3055ac50d8c69ff4881a6361f5a6256f76`. Rotepad-0.12.3-Windows.exe is 107,053,237 bytes, SHA-256 `3a6615927a7e173ae93ef31a76b7f6a4e055009b2cfa2d31287b561664a7d1cc`.
- Added a [session handoff](docs/archive/HANDOFF-2026-10-09.md) with the current state, the local build and test setup, and open items.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Packaged payload | Extracted app.asar: version 0.12.3. main.cjs, preload.cjs, library-merge.cjs, markdown-store.cjs and the prepared Rotepad.html are byte-identical to the tested sources and include linked-files.js and the `note-sync` IPC. shell-ui-smoke.cjs and linked-files-smoke.cjs passed after the bump | Passed. |
| Installation | Not run | Manual: install/upgrade, then open a `.txt` by double-click, edit, save and check the original file. |

## 10/9/26 1:40 PM GMT+8 — Save back to opened .txt and .md files

- **Opened files are now saved back.** The user created a `.txt`, opened it in Rotepad, edited and saved, and the file did not change. Opening a file imported it as a managed copy in Rotepad Docs, and autosave/Ctrl+S only ever wrote that copy. Now a note opened from a file stays linked to it, and every library save (autosave, Ctrl+S, close) also writes the note back to the original. Rotepad keeps its library copy for history and recovery.
- **Main process:** a new linked-files.json and `note-sync`/`note-unlink`/`linked-files` IPC.
  - It writes only to files the user opened, never to a path the renderer chooses, and it serializes writes per file and writes atomically.
  - It never recreates a missing file.
  - It refuses to overwrite a file whose SHA-256 differs from the last version Rotepad read or wrote; the user is asked once, OK replaces it and Cancel stops linking.
  - It keeps the BOM and CRLF/LF.
  - It never links a file that isn't valid UTF-8, and the user is told.
- **.txt files are literal:** each line opens as plain text, so `# TODO`, `1. step`, `* note`, `> x`, table rows and similar stay as typed, and the plain text shown is written back. Formatting added in Rotepad is saved as text only.
- **Shared serializer:**
  - Plain paragraph lines starting `3. ` are written `3\. `, and table-separator rows get escaped pipes, so such literal text can't reopen as a list or table.
  - Fixed an existing bug where tokens such as `a\.b` gained a backslash on every Formatted-view save.
  - richMarkdown accepts a root element.
- Added desktop/linked-files.js (appended after library.js), desktop/linked-files-smoke.cjs (11 checks) and root serializer assertions. Updated the README, architecture and testing guide.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Write-back | linked-files-smoke.cjs with real files in a disposable profile. A 35-line tricky `.txt` corpus round-trips exactly, both directly and after editor re-serialization. No write happens without an edit, and the edit alone changes the bytes, with BOM and CRLF kept. Also covered: autosave and Ctrl+S, bold saved as plain text, outside-change Cancel and OK, Markdown write-back, a deleted file not recreated, non-UTF-8 bytes unchanged, close flush and restart without a prompt | Passed. Dialogs are mocked. Real double-click/Open with was not exercised (startup arguments and the mocked picker were). |
| Neighbors | All root tests and browser smokes; every desktop smoke; the editor suites with `--desktop` | Passed, except one note-tabs-smoke.cjs failure (a Clear formatting check read `'n'`) that did not reproduce in 11 consecutive reruns; recorded as an intermittent failure under investigation. |
| Limits | Non-breaking spaces in a `.txt` become spaces after an edit; editing a `.md` in Formatted view writes Rotepad's normalized Markdown; no build or release | Installed 0.12.2 still writes only the library copy. |

## 10/7/26 8:43 PM GMT+8 — Public 0.12.2 installer download

- Published the [0.12.2 Windows testing release](https://github.com/jrosprs7/rotepad/releases/tag/v0.12.2) (pre-release) with Rotepad-0.12.2-Setup.exe, tagged on dae63eb5bda6d8b1adf8fb024d7fdbb2da6fc684. The installer was built from 01226d3; the later commit only points the README download link at 0.12.2.
- Verified that GitHub's asset digest matches the local installer (`3234cca73fde21984cbfa618d291a3f9d7075b0729a83da315f050fca89f844e`), and that the 107,294,705-byte download returns HTTP 200 without authentication and hashes identically. No app code or installer bytes changed.
- Installation, upgrading, the Default apps page with Windows' picker, and desktop spellcheck remain tester checks; the release notes ask testers to report them.

## 10/7/26 8:22 PM GMT+8 — Windows build 0.12.2 (not published)

- Set the desktop package version to 0.12.2 for the desktop right-click menu, the opt-in Default apps installer page and the browser » Clear formatting fix. Built Windows x64 NSIS and portable packages with `pnpm run dist` (pnpm 11.19.0 through corepack).
- The README download link still points at the published 0.12.1 release; no GitHub release was created.
- Rotepad-0.12.2-Setup.exe is 107,294,705 bytes, SHA-256 `3234cca73fde21984cbfa618d291a3f9d7075b0729a83da315f050fca89f844e`. Rotepad-0.12.2-Windows.exe is 107,051,976 bytes, SHA-256 `3a8dd4052e96a2f399d78a19f89a0fb1ed9eb65ec4bff935d9dfaeb66fae7b29`. Executables remain excluded from Git.
- The 118 MB size of the earlier installer-only test build came from building that target alone; the standard two-target build is the usual size.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Packaged payload | Extracted app.asar: version 0.12.2. main.cjs, preload.cjs, library-merge.cjs, markdown-store.cjs and the prepared Rotepad.html are byte-identical to the tested sources. They contain the context-menu handler, the » mousedown fix and the preventScroll fixes. shell-ui-smoke.cjs (About/version) and context-menu-smoke.cjs passed after the bump | Passed. The full suites ran on this source before the version-only change. |
| Installation and Default apps page | Not run | **Manual test needed:** install or upgrade, the Default apps page, Windows' picker for each ticked type, Always making double-click open Rotepad, and cancel or unticked behavior. Unsigned build. |

## 10/7/26 8:01 PM GMT+8 — Opt-in default apps during installation

- At the user's request, the installer now has a **Default apps** page after the folder choice, with two opt-in boxes (both unticked): **Markdown files (.md)** and **Text files (.txt)**.
- For each ticked type, the install step calls `SHOpenWithDialog` with `OAIF_REGISTER_EXT|OAIF_FORCE_REGISTRATION`. This is Windows' own "How do you want to open…" picker with "Always" pre-ticked; it opens no file. The user's choice in the picker records the default.
  - Windows 10/11 protects default-app choices (UserChoice) from installers, so the installer still never writes them itself.
  - Silent installs skip the picker. The flag values come from the Windows SDK's ShlObj_core.h.
- Replaced the finish page's unticked "Choose Rotepad for .md and .txt in Windows Settings" shortcut with this page; Rotepad Settings keeps its Windows Settings button. Updated the README, desktop guide and testing guide.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Installer compiles with the page | electron-builder NSIS build into a scratch output folder (the published dist files were left untouched) | Passed with no NSIS warnings. Not a release build. |
| Picker call | Silent NSIS check compiled with the same makensis: the OPENASINFO it builds reads back as the temp `.md` path, a null class and flags 0xA, and `SHOpenWithDialog` resolves in shell32. No dialog was shown | Passed. |
| Real installation | Not run: installing changes Program Files and the registry, and the picker is native Windows UI | **Manual test needed:** page shown, picker per ticked type, Always makes double-click open Rotepad, cancel still finishes, and an unticked install shows no picker. If a different administrator account approves installation, the choice applies to that account. |

## 10/7/26 8:33 AM GMT+8 — Desktop right-click menu

- Right-clicking note text in the desktop app showed nothing, because Electron has no default context menu (reported by the user). The browser build was unaffected; it uses the browser's own menu.
- main.cjs now builds a native menu from each window's `context-menu` event. No IPC is involved.
  - **Editable text:** Undo and Redo (sent as Ctrl+Z/Ctrl+Y to the app's own history), Cut, Copy, Paste (through the existing plain-text paste handler) and Select All. Cut and Copy are disabled without a selection.
  - **Misspelled words:** up to five suggestions or "No spelling suggestions", plus Add to dictionary, whenever Chromium reports a misspelling.
  - **http(s) links:** Open link (through the existing safe external opener) and Copy link address.
  - **Elsewhere:** Copy for a non-editable selection. Tabs keep their note-options right-click, and plain chrome shows no menu.
- Added desktop/context-menu-smoke.cjs (12 checks) and updated the README, architecture and testing guide.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Right-click menu | context-menu-smoke.cjs in isolated development Electron with real right-clicks and popups captured in the main process. It checks item lists and enabled states, and that Copy/Cut/Undo/Redo/Paste/Select All change the note and clipboard as expected. It also covers link copy and open (open mocked), the Markdown view, tab note options and plain chrome. Against the previous main.cjs, right-clicking text produced no menu | Passed twice. Native menu rendering and mouse selection inside the real menu are not automatable. The system clipboard text is saved and restored around the test. |
| Spelling suggestions | The menu layout is checked with a supplied misspelling event. In development Electron the spellchecker raised no initialization or dictionary events and reported no misspelled words (en-US enabled), and no Dictionaries folder exists in the test or normal profile (folder names only were listed) | **Open question:** whether the desktop spellchecker underlines words at all on this machine. Suggestions appear only when it does. |
| Neighbors | All root and browser smokes; desktop storage, multi-window, tabs, shell, layout, print, reveal and smoke.cjs; the editor suites with `--desktop` | Passed. No build or release; installed 0.12.1 has no right-click menu. |

## 10/7/26 8:17 AM GMT+8 — Clear formatting usable from the browser » menu

- **Clear formatting under » works with the mouse in the browser build.** Selecting text and then clicking » used to move focus and the selection out of the note, so Clear formatting disabled itself and could not be clicked (QA-2026-10-06 UX item).
  - **Fix:** the » button now cancels its mousedown in Formatted view, as the toolbar format buttons already do. The menu still opens on click, and the selection and focus stay in the note. The change is in tools/responsive-toolbar.js and its embedded copy, kept in sync.
- **Escape still closes » after a mouse open.** Because focus now stays in the note, a capture-phase Escape handler closes the open » menu and keeps the caret and selection. Keyboard opening (focused » and Enter) and Escape inside the menu are unchanged.
- The same » behavior applies in the desktop app, which already had Remove formatting on its toolbar.
- toolbar-smoke.cjs now selects with a real mouse double-click before using » (its earlier overflow check set the selection by script, which hid the bug). The README, architecture, testing guide, QA status and roadmap are updated.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Clear formatting from » | Reproduction at 1400/700/420px: after » the selection was empty and the button disabled. toolbar-smoke.cjs now double-clicks a bold word at 1400/700/360px, opens » and clears only that word. It also covers Strikethrough from », a second click closing », Escape after a mouse open (menu closed, editor focused, selection kept), keyboard opening, and Markdown-view clearing. It fails on the previous commit and passes twice on the fix; the QA tester's BUG-8 check now passes with no other change in its results | Passed. |
| Neighbors | All root tests; every browser smoke including scroll-position and data-safety; desktop storage, tabs, single-row, shell and print smokes; the editor suites with `--desktop` | Passed on the final source. No build or release; installed 0.12.1 still has the old » behavior. |

## 10/7/26 8:09 AM GMT+8 — Public 0.12.1 installer download

- Published the [0.12.1 Windows testing release](https://github.com/jrosprs7/rotepad/releases/tag/v0.12.1) (pre-release) with Rotepad-0.12.1-Setup.exe, tagged on 15214d954f0956e689d66f683f7144ee3165b627.
- Verified that GitHub's asset digest matches the local installer (`6076070e43525f8f42cba39df06e76dcf7e20b429f1b45c4ec74050c6a49aa25`), and that the 107,293,084-byte download returns HTTP 200 without authentication and hashes identically. No app code or installer bytes changed. Installing and upgrading remain tester tasks.

## 10/7/26 8:05 AM GMT+8 — Windows build 0.12.1

- Set the desktop package version to 0.12.1 for the » menu scroll fix and Outline first-click fix. Built Windows x64 NSIS and portable packages with `pnpm run dist` (pnpm 11.19.0 through corepack). Pointed the README download link at the 0.12.1 release.
- Rotepad-0.12.1-Setup.exe is 107,293,084 bytes, SHA-256 `6076070e43525f8f42cba39df06e76dcf7e20b429f1b45c4ec74050c6a49aa25`. Rotepad-0.12.1-Windows.exe is 107,050,803 bytes, SHA-256 `2b860f8f297390511757cd10b087787c8ec27989a7bae14327a275fa78d28b52`. Executables remain excluded from Git.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Packaged payload | Extracted app.asar: version 0.12.1. main.cjs, preload.cjs, library-merge.cjs, markdown-store.cjs and the prepared Rotepad.html are byte-identical to the tested sources and contain both preventScroll fixes. shell-ui-smoke.cjs checks About/version after the bump | Passed. The full suites ran on this source before the version-only change. |
| Installation | Not run | Installing, upgrading from 0.12.0/0.11.0 and running the packaged executable remain manual tester checks. Unsigned build. |

## 10/7/26 12:21 AM GMT+8 — Keep the view when formatting from menus

- **Formatting from the » menu no longer jumps to the top.** Applying Strikethrough, Highlight, Inline code, Bullet/Numbered/Checkbox list, Increase indent, Horizontal divider or Insert date used to scroll the note back to line 1 (reported by the user). Formatting was still applied to the selection, but off-screen.
  - **Cause:** these commands run after focus has moved to the menu. restoreRange() refocused the editor with a plain `focus()`, which made the browser move the caret to the top and scroll there before the saved selection was restored.
  - **Fix:** restoreRange() now uses `focus({preventScroll:true})`. Toolbar Bold/Italic/Underline, shortcuts, Quote and the paragraph-style menu were unaffected because they keep focus in the editor.
- **The Outline scrolls on the first click.** Clicking a heading in Formatted view now scrolls on the first click; the same plain focus used to undo its scroll (QA-2026-10-06 Outline item).
- Added desktop/scroll-position-smoke.cjs (15 checks); updated the testing guide, architecture, QA status and roadmap.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| View and selection kept when formatting | Reproduction on a 120-line note with a double-click selection at line 80: every » command jumped to 0 in Edge and Electron, while Bold/Ctrl+B/Quote/paragraph style did not. The new scroll-position-smoke.cjs fails on the previous commit and passes in Edge (3 runs) and `--desktop`, including the link and table dialogs, Undo and the Outline | Passed. Clear formatting in the browser build is still unreachable from » (separate open QA finding); the desktop toolbar button keeps the view. |
| Neighbors | All root tests; every browser smoke; desktop storage, tabs, shell, layout and print smokes; the editor suites with `--desktop` | Passed on the final source. No build or release; the installed 0.12.0 still has the jump. |

## 10/6/26 10:26 AM GMT+8 — Public 0.12.0 installer download

- Published the [0.12.0 Windows testing release](https://github.com/jrosprs7/rotepad/releases/tag/v0.12.0) (pre-release) with Rotepad-0.12.0-Setup.exe. The tag is on c400f310a8cdfb3d2962c4f88652cb1a0637ccaf; the installer was built from 58f48b6, and the later commit only points the README download link at 0.12.0.
- Verified that GitHub's asset digest matches the local installer (`a19ccbeb28cac0fdbd53fbda5cf10e174b280e10906410ccab7945d3a9846387`), and that the 107,292,447-byte download returns HTTP 200 without authentication and hashes identically. No app code or installer bytes changed. Installing and upgrading remain tester tasks.

## 10/6/26 10:21 AM GMT+8 — Windows build 0.12.0

- Set the desktop package version to 0.12.0 for the literal-bullet, Pure Ink and data-safety changes above. Built Windows x64 NSIS and portable packages with `pnpm run dist`, using pnpm 11.19.0 through corepack because pnpm was no longer installed. The app has no runtime dependencies (the builder fell back to traversal and found none), and the builder downloaded its standard NSIS tools.
- Rotepad-0.12.0-Setup.exe is 107,292,447 bytes, SHA-256 `a19ccbeb28cac0fdbd53fbda5cf10e174b280e10906410ccab7945d3a9846387`. Rotepad-0.12.0-Windows.exe is 107,050,196 bytes, SHA-256 `e87257228bc098a279edc7d2161e47f0953f151695a9b599fba2a7bdc4f337a3`. Executables remain excluded from Git.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Packaged payload | Extracted app.asar: packaged version 0.12.0. main.cjs, preload.cjs, library-merge.cjs, markdown-store.cjs and the prepared Rotepad.html are byte-identical to the tested sources and contain the new fixes. shell-ui-smoke.cjs checks About/version after the bump | Passed. The full root, browser and desktop suites ran on this source before the version-only change. |
| Installation | Not run | Installing, upgrading from 0.11.0, uninstalling, file associations and running the packaged executable remain manual tester checks. Builds are unsigned. |

## 10/6/26 9:51 AM GMT+8 — Fix QA data-loss bugs

Fixes the seven data-loss items from [QA-2026-10-06](docs/QA-2026-10-06.md) (D1–D7, plus F1–F2).

- **Find no longer edits the note.**
  - Enter, Shift+Enter, the arrow buttons and typing keep focus in the Find box. Previously the first Enter moved focus into the note, so the next Enter or letter replaced the match.
  - The current match is highlighted in every view; in Markdown view it is drawn on the link layer, because an unfocused textarea hides its selection. Wrapped Markdown matches scroll into view.
  - Escape closes Find and selects the match in the note.
- **Selected list items no longer merge.**
  - Tab/Shift+Tab and Increase/Decrease indent on a selection move whole items one level with direct DOM moves and keep the selection. This replaces the browser's indent/outdent for nested items, which produced LI-in-LI markup (saved as one merged line) and an intermediate Undo state that merged items.
  - The caret stays where it was after a caret Shift+Tab.
  - The new `moveListItemOut` helper is shared with Backspace outdent.
- **Code blocks keep line breaks.** Enter, Shift+Enter and pasted lines in code blocks are saved as newlines; the serializer now reads `<br>` and line blocks instead of `textContent`.
- **No literal ☐/☑ in Markdown.**
  - Backspace at the start of a task's text removes its checkbox with the marker. Before, the first press did nothing visible and the paragraph kept the checkbox.
  - Before Delete, Ctrl+Backspace or a selection deletion merges a following task into the line before, its checkbox is dropped.
- **No `****` or `[](url)`.** Formatting with no visible text, left by Clear formatting, deletion or Replace all, is saved without markers.
- **Pasting into a blank note keeps every line.** Text sitting directly in the editor is saved as its own line before the next block (previously `FirstSecond\nThird`). This also closes the older roadmap item about `--`/`---`.
- **Literal `#`, `~~` and file names.**
  - Typed `# text` (up to six `#`) and `~~text~~` stay literal after saving and reopening (`\#` line-leading escape; every `~` escaped).
  - Bare names are auto-linked only with `http(s)://`, `www.` or a common web ending, so `notes.md`, `file.txt`, `node.js`, `README.md` and `end.Next` stay text, while `example.com` and `claude.ai` still link.
  - Existing explicit links and notes are not rewritten.
- Added desktop/data-safety-smoke.cjs (49 checks) and serializer/parser/link assertions in tests/formatting.cjs. The README, architecture, testing guide, QA status and roadmap are updated.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| The 7 data bugs | data-safety-smoke.cjs in Edge and `--desktop` (managed Markdown file checked), using real key presses. Against the previous commit it fails at the first check. The QA testers' independent bug checks went from 40 to 28 failures; every D/F1/F2 check passes | Passed. Two remaining tester checks disagree with existing rules rather than showing data loss: a moved item's children keep their numbering, and a Tab keeps exactly the user's selection. Synthetic paste events, not the real clipboard. |
| Neighboring editing behavior | All root tests; formatted, toolbar, bold, numbering, list-interactions, tab, highlight, dash, font, quote-literal and bullet-literal smokes in Edge, plus the editor suites with `--desktop` | Passed on the final source. |
| Desktop storage and shell | library, markdown-files, multi-window, note-tabs, shell-ui, single-row, print-preview, reveal and smoke.cjs on prepared desktop/app | Passed in isolated development profiles. Embedded fonts and shared helper copies verified unchanged/synchronized. No build, installation or publishing. |

## 10/6/26 1:19 AM GMT+8 — Literal bullet prefixes, Pure Ink light theme and exploratory QA

- Typed `- `, `* ` and `+ ` prefixes in Formatted view now stay plain text on space and Enter, with automatic Markdown conversion off or on. Removed bullet markers from the typed-list Enter handler (root copy and tools/numbered-lists.js, kept in sync) and from the optional auto-Markdown space rule. Typed numbers (`1. `), typed headings with conversion on, the Bullet list command, Markdown view, imports and existing notes are unchanged.
- To keep literal text from reopening as a bullet, the rich-text serializer now writes a paragraph's line-leading `-`/`+` followed by a space or tab as `\-`/`\+` (`*` was already escaped). Inline parsing decodes that line-leading escape. Mid-line, repeated and tight hyphens (`a - b`, `---`, `-dash`) are written unchanged. Existing notes are not rewritten.
- The Light appearance is now the Pure Ink palette from SurBEE: a grey desk (#d6d6d3), paper page (#f8f8f6), near-black ink and accent (#0e0e0e), black pills for pressed formatting buttons and the selected view, and grey replacements for the previously hard-coded blue focus, hover, dialog and selection colors. A faint paper grain covers only the chrome (tabs, toolbar, sidebar, status bar, find panel, outline); the writing page stays smooth. Desktop toolbar and tab-strip colors and the Windows caption-button overlay match. Dark is unchanged, and Appearance still offers Match computer, Light and Dark. Embedded font payloads were verified unchanged.
- Added desktop/bullet-literal-smoke.cjs and serializer/parser assertions in tests/formatting.cjs. list-interactions-smoke.cjs no longer expects typed bullet prefixes to convert; its parsed-bullet and typed-number cases remain. Documentation, the list-scenario matrix and the feature map are updated.
- Recorded open findings from hands-on browser QA of the pre-change build in [QA-2026-10-06](docs/QA-2026-10-06.md), linked from the roadmap. They were rechecked on the changed source, where the same failures occur; none were fixed in this batch.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Literal bullet prefixes | Failing regression first (typed `- text` + Enter became a bullet), then bullet-literal-smoke.cjs in Edge and `--desktop`, with the managed Markdown file checked | Passed (74 checks per runtime). Physical IME and real-clipboard paste are not covered (synthetic paste events are used). |
| Lists, quotes, dashes, highlights, tabs, fonts | All root tests; formatted, toolbar, bold, numbering, list-interactions, tab, highlight, dash, font and quote-literal smokes in Edge, plus the editor suites with `--desktop` | Passed on the final source. |
| Pure Ink theme | Before/after browser screenshots at 1280/420px (page, » menu, Settings) and isolated Electron screenshots in light/dark. Dark screenshots are byte-identical to before. Computed-style checks for pressed Bold, toolbar hover and editor focus in desktop | Passed after a fix. An early version gave the desktop page a focus frame and toolbar buttons a hover border because the overrides were more specific than the desktop shell's rules; they were lowered with `:where()` and checked again. Physical display and Windows caption-button rendering were not checked. |
| Desktop storage and shell | library, markdown-files, multi-window, note-tabs, shell-ui, single-row, print-preview, reveal and smoke.cjs on prepared desktop/app | Passed in isolated development profiles. No build, installation or publishing. |

## 10/6/26 12:22 AM GMT+8 — Agent-neutral project instructions

- Described AGENTS.md in the README as instructions for coding agents generally rather than Codex only. Added CLAUDE.md, which imports AGENTS.md so Claude Code loads the same rules; AGENTS.md remains the single source.
- Documentation only; no app code, tests or builds changed. Checked the README links.

## 9/27/26 10:48 PM GMT+8 — Public installer download

- Published the [0.11.0 Windows testing release](https://github.com/jrosprs7/rotepad/releases/tag/v0.11.0) with Rotepad-0.11.0-Setup.exe, linked to source commit 391e88ba4a31dedcfc59145c8a31b5d4987e8c8b. Added a direct installer link to the README. Executable build output remains excluded from Git source commits.
- Verified GitHub's uploaded SHA-256 matches the local installer (`3a0a046e4bef290eb7c8f3a916488a83bc79d7f9eabf901063ac046ddd18cd5b`) and the 107,290,927-byte download returns HTTP 200 without authentication. No app code or installer bytes changed; installation/upgrade verification remains a tester task.

## 9/27/26 10:21 PM GMT+8 — Windows title-bar tabs, app identity and font choices (0.11.0)

- Merged the desktop note tabs into the Windows title bar using native minimize/maximize/close buttons. Kept the 34px tab/title row and 38px toolbar, with reserved caption-button space, draggable empty space and theme-matched controls. Focus mode hides tabs while retaining usable window controls. Existing tab and note operations remain unchanged.
- Removed Iosevka Extended and Iosevka Fixed from the font menu. Iosevka Fixed Extended remains the default with regular/bold/italic/bold italic; either removed saved choice falls back to it. Retained standard fonts and text zoom. All twelve embedded font payloads and the font license remain intact.
- Added explicit Rotepad Open with naming, quoted executable paths and Windows Default Apps registration for .md/.markdown/.txt. Replaced builder fileAssociations with installer.nsh so registration does not overwrite extension defaults or UserChoice. The installer finish page offers an unchecked choice to open Windows Settings; the same action is available in Rotepad Settings. Portable builds open the general Defaults page without registering handlers.
- Added .txt startup/second-launch support through the existing managed-copy import flow. Added Menu → Help → About Rotepad with the actual app version and © 2026, J.E. Rosaroso. Updated executable author/copyright metadata and package version to 0.11.0. New IPC remains sender-validated and limited to fixed actions.
- Read-only investigation found both the installed 0.10.0 executable and the prior build already had Rotepad product/file descriptions, but lacked an explicit Applications/Rotepad.exe FriendlyAppName registration. The precise source of Explorer's displayed Electron label was not reproduced; the new registration supplies the intended name. No real profile, notes, associations or installed app were modified by testing.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Title bar, tabs and commands | shell-ui-smoke.cjs checks Windows overlay safe area at 650/850/1250px in light/dark, maximize/minimize/restore via Electron, Focus, new tab, About open/close/Escape, mocked default-app action and rejected invalid theme. note-tabs-smoke.cjs and single-row-smoke.cjs cover tab lifecycle, selection, overflow, toolbar menus, print/Focus and failed-close retry. Screenshots inspected | Passed. Initial emulated narrow viewport exposed overflow from the native safe-area width; bounded the strip to viewport width and reran all affected layout checks successfully. Native drag/Snap/caption-button mouse input, multiple monitors and other Windows scaling settings were not tested. |
| Font choice and retained rendering | All root tests, font-smoke.cjs in Edge and --desktop; removed saved choices, standard font reload, zoom and 20 glyph-gap checks per runtime across faces/views/print CSS; SHA-256 comparison of embedded payloads | Passed. Font bytes unchanged; no parser, list, quote or hyphen behavior changed in this batch. Physical printer/font output was not tested. |
| File opening and adjacent save behavior | shell-ui-smoke.cjs opens uppercase .TXT with spaces on startup and another .txt in a second window, verifies managed .md copies and intact original text files. smoke.cjs checks existing Markdown import/export/cancellation. library-smoke.cjs and multi-window-smoke.cjs check persistence, recovery, close, concurrency and failed-save retry | Passed in isolated development profiles. Explorer associations and native pickers were not exercised against the installed app. |
| Printing and delivery | print-preview-smoke.cjs checks actual PDF/export and mocked printer paths. Built Windows x64 NSIS installer and portable 0.11.0, verified packaged main/preload/merge/store/prepared-HTML bytes and version, and inspected executable product/name/author/copyright metadata. NSIS compilation, registration/unregistration review, helper-copy matching, documentation links, syntax and whitespace checks | Passed. Actual installation/upgrade/uninstall, finish-page interaction and resulting Open with/default-app selection remain manual checks. Existing editing commands beyond root tests and the selected UI/integration checks were not exhaustively retested because their handlers were unchanged. |

## 9/27/26 9:56 PM GMT+8 — Note tabs and distinct toolbar (0.10.0)

- Added a compact 34px desktop tab row above the existing 38px toolbar. Open notes have individual tabs with a new-note + and close ×; closing retains notes in Library. Tab order is window-local and restored with the workspace. Closing the active tab selects its next neighbor, or the previous tab at the end.
- Added Ctrl+Tab/Ctrl+Shift+Tab navigation, arrow/Home/End navigation for focused tabs, double-click/right-click note options and F2 renaming from a focused tab. Long tab rows scroll horizontally and keep the selected tab visible when the window resizes. Tabs hide in Focus mode and printing.
- Gave the desktop controls a distinct darker-gray background in light mode and retained separate dark surfaces. Moved the sidebar button to the far left of the command row. Replaced the duplicate header title/close controls with the tabs; note options still provide renaming.
- Promoted the existing selection-aware Remove formatting command to a T× toolbar icon. Its text selection, inline-only clearing, Undo and Preview restrictions remain intact; no parser or formatting-rule changes were made.
- Added note-tabs.js and its desktop assembly step, note-tabs-smoke.cjs, documentation and coverage-map entries. Adjusted Tab-key and exploratory close-control test selectors for the new interface. Shared HTML, embedded fonts, storage engine and IPC were not changed in this batch.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Tab lifecycle and keyboard access | note-tabs-smoke.cjs: create, switch, preserve source selection, close inactive/active tabs, reopen at the end, rename without .md, restart, Ctrl+Tab and arrows, close all and create again | Passed in isolated development Electron. |
| Multi-window and save safety | Tab smoke verifies independent tab sets, remote rename/Trash updates, failed close retains text and retry succeeds. library-smoke.cjs, markdown-files-smoke.cjs and multi-window-smoke.cjs verify existing persistence, managed files, recovery and concurrent saves | Passed using disposable notes/profiles. |
| Formatting and ordinary Tab | Tab smoke selects part of bold text, clears only that portion, checks rich/source Undo and disabled Preview/no-selection states. tab-smoke.cjs --desktop and all root regression scripts | Passed. Corrected the partial-format assertion to inspect all styled text nodes, including an existing empty wrapper. |
| Layout and printing | Tab smoke at 650/850/1250px in light/dark, active-tab visibility, label bounds, toolbar contrast, Focus/print hiding; single-row-smoke.cjs; print-preview-smoke.cjs | Passed. Visual review caught vertical clipping from the scrollbar; fixed and added a bounds assertion. Narrow resize also exposed an offscreen active tab; fixed with resize-aware scrolling. Actual PDF/export checked; printer interactions mocked. |
| Delivery and remaining gaps | Built Windows x64 installer and portable 0.10.0; verified packaged version and exact main/preload/merge/store/prepared-editor bytes. Documentation links, changed JS syntax and whitespace checked | Passed. Installation/upgrade, real native dialogs, physical printing/IME, screen-reader and prolonged use not tested. Browser interaction suites and whole-app exploratory review not run for this desktop-only UI change. |

## 9/27/26 2:02 PM GMT+8 — Multiple desktop windows (0.9.0)

- Added Menu → File → New window and Ctrl+Shift+N. Launching Rotepad again opens another window; opening a Markdown file through a subsequent launch sends it to the new window. One main process coordinates the shared library and managed files.
- Windows retain independent active notes, open-note membership, view and cursor. New notes from another window appear in Library. Closing one window flushes its edits and leaves other windows running. Restart restores one workspace and recovers pending drafts from other windows, without restoring the previous window count.
- Added baseline-aware merging, broadcasts and separate conflict copies for competing edits. Serialized import/export mapping writes. Kept dialog ownership, file-bind tokens, print previews and close state separate for each registered window; retained IPC validation and renderer isolation.
- Paired each per-window recovery snapshot with its baseline in a single cache write. Preserved note object identity across save acknowledgments for asynchronous lifecycle actions. Conflict-copy IDs remain stable when a metadata write fails and is retried.
- Updated README, architecture, test guidance and the feature coverage map. The only shared-editor change in this batch is accepting a desktop-provided library key; browser storage, editing rules, fonts and layout remain as before.

| Area / expected behavior | Current verification | Result / limits |
| --- | --- | --- |
| Open and use several windows | multi-window-smoke.cjs: visible menu, real shortcut and second development Electron process; three windows; independent active note, open membership, source selection and Undo during another-note update | Passed. |
| Concurrent writes and recovery | Same test: different-note edits combine; competing same-note edits retain both texts; rename/Trash/new-note updates arrive; failure/retry retains one conflict mapping; interrupted secondary draft recovers; independent close writes actual managed files. window-merge.cjs covers deletion, rename/text combination and history spacing/count | Passed. Initial migration and async close regressions were corrected and rerun; the rename fixture was corrected to edit the active title field rather than mutate data subsequently overwritten by persist. |
| Existing storage and native commands | library-smoke.cjs, markdown-files-smoke.cjs, smoke.cjs, reveal-smoke.cjs and print-preview-smoke.cjs; cross-window file-bind and print-token rejection in the new smoke test | Passed in isolated development Electron. Native pickers, Explorer and printer interactions mocked; actual PDF generation/export bytes checked. |
| Browser and adjacent behavior | All root regression scripts and Edge formatted-smoke.cjs; changed JavaScript syntax, documentation links and diff whitespace | Passed. Broad list/Tab/font/layout interaction suites were not rerun because those implementations were not changed in this batch. |
| Delivery and manual gaps | Built Windows x64 installer and portable 0.9.0; compared packaged main, preload, merge, Markdown store and prepared HTML bytes with tested sources | Build/payload checks passed. Installation/upgrade, real file associations, physical IME, printer output, screen reader and prolonged multi-window use not tested. No real user profile/notes, installation or publishing used. |

## 9/27/26 11:20 AM GMT+8 — Keep typed quote prefixes literal (0.8.5)

- Formatted view now keeps typed `> text` as literal text, including when optional automatic Markdown conversion is enabled. Removed `> ` from the automatic block-prefix conversion rule.
- Escaped literal greater-than signs in formatted-to-Markdown serialization and decoded those escapes in inline text/link labels. This prevents plain typed or pasted text becoming a quote after saving, reopening or switching views. The regression initially reproduced that reopening conversion with auto-Markdown off.
- Deliberate Quote-button/paragraph-style formatting, source Markdown quote syntax and existing quotes remain supported. No migration or rewriting of existing quotes was performed.
- Added quote-literal-smoke.cjs and parser/serializer assertions. Updated README, architecture and testing instructions; all twelve embedded fonts and shared helper copies were checked unchanged/synchronized.

| Area | Current checks | Result / limits |
| --- | --- | --- |
| Literal quote prefixes | Edge and isolated development Electron: conversion off/on, typing/paste, first/following paragraphs, Enter/Backspace, Undo/Redo, views/reload and desktop managed-file contents | Passed. |
| Intentional quotes and neighboring formatting | Same smoke test: Quote button, source/existing quotes, empty manual-quote exit, styles, links and code; all root tests and Edge formatted/bold/list-interaction/highlight/dash smoke tests | Passed. Corrected the empty-quote test to create a real caret-bearing quote with the toolbar instead of assuming focus enters an empty parsed element. |
| Unchanged systems and manual verification | No storage, library, history, font, layout or print-API implementation changes | Full desktop persistence/failure suite not required for this scope. Installation/upgrade, physical IME and printer checks not run. |

- Built the 0.8.5 Windows x64 installer and portable executable successfully. Verified the packaged version and exact prepared editor payload. No installation or publishing was performed.

## 9/27/26 11:12 AM GMT+8 — Fixed Extended default and literal hyphens (0.8.4)

- Confirmed the reported connected hyphens were Iosevka SS03 Extended's contextual glyph shaping: the text contained separate hyphens, but the rendered ink formed a continuous stroke. A pixel-based reproduction failed with one ink group instead of three. Per the revised request, contextual font features remain enabled; no CSS override is retained.
- Added Iosevka Fixed SS03 Extended from the supplied 34.8.1 TTC, including regular, bold, italic and bold italic. The original eight embedded font payloads and license remain intact. Made Fixed Extended the fresh default and upgraded the previous default once; other saved font choices, later selections and text zoom are preserved.
- Removed automatic em-dash conversion and its Backspace reversal. Two, three and longer hyphen runs stay as typed, with ordinary deletion. Existing em dashes are untouched. Hyphen-only lines still stay literal; explicit divider commands remain available.
- Updated the font embedding script, synchronized editor/toolbar copies, README, architecture and test instructions. Updated dash-smoke.cjs and added font-smoke.cjs to inspect actual glyph gaps rather than only character counts.

| Area | Current verification | Result / limits |
| --- | --- | --- |
| Fonts and literal hyphens | Font and dash smoke scripts in Edge and isolated development Electron; 20 glyph-gap checks per runtime, four faces, typed runs, view changes, print CSS, default migration, zoom, saved choice and reload; desktop managed-file contents | Passed. Screenshot also inspected visually. Combined bold/italic font uses a rendering fixture. |
| Neighboring editing | All root tests; Edge formatted, bold, Tab, list-interaction and highlight smoke scripts | Passed. No storage, history, backup or library implementation changes in this batch. |
| Print preview/export | Development Electron preview/PDF, orientation, exact export bytes, cancellation/failure and empty-workspace checks | Passed; native printing mocked, physical output untested. |
| Delivery/manual input | Installer upgrade, physical IME, screen-reader and long-session use | Not run. No real user notes or installed profile used. |

- Review exposed a separate existing triple-asterisk/combined bold-italic scenario and inconsistent consecutive formatting shortcuts; recorded in ROADMAP.md rather than changing unrelated formatting behavior. Corrected the screenshot test's textarea font measurement, and tested the combined font face independently of that parsing/shortcut issue.
- Font regeneration initially changed old compressed payloads; restored the original eight byte-for-byte and retained only the four requested additions. Final synchronization, original-font comparison, documentation-link and whitespace checks passed.
- Built the unsigned Windows x64 installer and portable executable for 0.8.4 successfully. Verified the packaged version and exact prepared HTML payload; nothing was installed or published.

## 9/27/26 10:46 AM GMT+8 — Literal dividers and reversible dashes (0.8.3)

- Fixed equals-only runs being interpreted as yellow highlights and losing visible characters on reopen. Highlight delimiters must be distinct double-equals markers with nonempty content. Literal equals signs are escaped when serializing formatted text; deliberate highlights, including highlighted equals signs, remain supported. Link labels decode the corresponding escapes without changing their URLs.
- Removed horizontal-rule parsing for hyphen-only lines. Explicit Horizontal divider insertion remains available and now serializes as `***` instead of `---`; existing raw hyphen lines display literally.
- Added reversible typing behavior in Formatted/Markdown/Split: two individually typed hyphens become an em dash; an immediate third restores three hyphens; immediate Backspace restores two. Longer runs remain literal. Conversion is independent of optional Markdown formatting and excludes code, links and source table separators. Imported/pasted content is not scanned for replacement.
- Added highlight-smoke.cjs and dash-smoke.cjs. Both passed in Edge and isolated development Electron; checks include typing/paste/parsed input, both conversion settings, view round trips, Backspace, Undo/Redo, styles, code, links/tables, explicit divider/highlight commands, saved-file contents and reload. The highlight desktop test also passed a full process restart. All root tests and existing formatted, bold, Tab and list-interaction browser checks passed on the final source.
- The initial reopening regression failed as expected. Additional failures exposed escaped link-label display, which was corrected; a neighboring-style expectation and a soft-break DOM assumption were corrected after inspecting native behavior. An existing blank-note multiline-paste serialization issue was reproduced with the new handlers disabled and recorded in ROADMAP.md for separate work.
- Verified synchronized shared-editor copies, unchanged embedded fonts, documentation links and diff whitespace. No real user notes were used. Physical IME and installation/upgrade testing remain unperformed.
- Built the 0.8.3 Windows x64 installer and portable executable successfully, without installing or publishing. Verified the packaged editor bytes match the tested prepared source and the packaged version is 0.8.3.

## 9/27/26 10:24 AM GMT+8 — Tab key support (0.8.2)

- Tab now inserts a tab at the cursor in ordinary text and code; multiline selections indent and Shift+Tab decreases indentation. Lists use nesting/outdent and tables retain their existing cell navigation. Formatted tab stops use four columns to match source editing. Dialog/toolbar focus navigation and modified/composing key events are not intercepted by the new text handler.
- Fixed two related indentation issues found during tests: wrapped native tab spans were not removed on outdent, and normalization of nested lists displaced the caret. Shared source and embedded editor copies remain synchronized.
- New tab-smoke.cjs passed in Edge and isolated development Electron, covering text/caret, Undo/Redo, styles, lists, tables, code, source/Split, multiline selections, modifier/composition guards, UI navigation, view round trips and reload. Existing formatted-smoke, list-interactions-smoke, numbering-smoke, formatting and list-zoom checks passed. The initial sandboxed Electron launch failed in Playwright; the isolated test passed when launched with the required execution permission.
- Application changes are limited to Tab/related indentation and its shortcut help. No storage or unrelated feature changes. Physical IME and installation/upgrade behavior were not tested in this batch.
- The final synchronization check caught and corrected an encoding mismatch; Tab checks passed again in Edge and Electron. Embedded fonts and documentation links were verified. Windows installer/portable builds completed successfully after rebuilding from the corrected source, and the packaged 0.8.2 editor was checked against the source helper.

## 9/21/26 8:02 PM GMT+8 — Feature and scenario regression-review skill

- Added skills/rotepad-regression-review/SKILL.md with a feature coverage map, reproduction-first workflow, checks for related features, and explicit passed/failed/not-run/not-applicable evidence. Whole-app reviews must account for each supported feature group; focused fixes select affected paths and explain exclusions.
- Expanded the existing editing/list guidance for freshly typed versus parsed prefixes, middle/start splits, empty nested outdent, task items, list toggles, wrapped text and source-mode boundaries. It links to the broader review without duplicating its checklist.
- Linked the new skill from AGENTS.md, README.md and the testing guide so future application changes use it. Existing product rules and unrelated uncommitted work were preserved.
- Documentation-only change: no application code edits, runtime tests or installer rebuild in this batch. Fallback flat-frontmatter/name/scaffold checks passed for both skills; 39 local links including anchors passed, as did git diff --check. The bundled validator could not run because PyYAML is unavailable; no application coverage is claimed from these document checks.

## 9/21/26 7:53 PM GMT+8 — Consistent list splitting and continuation (0.8.1)

- Fixed Enter in the middle of typed numbered/bullet paragraphs: convert the prefix and split at the actual caret while preserving inline formatting. This works with optional automatic inline Markdown conversion off or on and through the beforeinput path. Backspace directly after a literal list prefix removes that prefix and retains the text.
- Extended source-mode continuation to bullets and task items, including splitting immediately after a marker, while retaining fenced-code protection.
- Scenario testing also found and fixed two related issues: indented Shift+Enter continuation lines lost their list association on view conversion, and Enter on an empty nested item did not outdent correctly.
- Added list-interactions-smoke.cjs: 75 counted checks passed in Edge and 75 in isolated development Electron. Existing numbering-smoke.cjs, formatted-smoke.cjs, formatting.cjs, list-zoom.cjs and quote-exit.cjs also passed. Initial failures guided fixes for soft-line round trips and nested empty-item exit; a selection-deletion assertion was corrected to retain the preceding space.
- Tests cover the reported split, different creation paths and prefixes, first/middle/end positions, preserved styles, Undo/Redo, pasted prefixes, source lists/tasks, nested empty exit and reload. Physical IME/mobile keyboard behavior and exact parity with every Notepad version remain unverified. Real user notes and unrelated uncommitted work were preserved.
- Rebuilt the unsigned Windows x64 installer and portable package for 0.8.1 successfully. Installation/upgrade was not performed.

## 9/21/26 7:22 PM GMT+8 — Minimalist desktop UI (0.8.0)

- Removed the desktop writing area's outer frame, rounded corners and surrounding gutters. Reduced the command row to 38px and status bar to 26px; retained the clickable view switch and save status.
- Flattened toolbar/menu controls while retaining hover, active and keyboard-focus indicators. Added a neutral charcoal desktop dark palette. Extra tools remain in the overflow menu.
- Isolated Electron layout checks passed at 650/850/1250/1800px, including selection preservation through overflow, Settings access, light/dark screenshots and border/status-bar dimensions. Corrected test startup timing and subpixel rounding assumptions during validation.
- Desktop screen styling only; no editor interaction, persistence or print-output changes. Existing uncommitted work was preserved.

## 9/21/26 7:14 PM GMT+8 — Editor behavior skill

- Added skills/rotepad-editing-behavior/SKILL.md and a focused list-scenario reference for future editing changes. Explicit criteria include nonempty first-document-line Backspace, bullets, nested items, selection boundaries, Enter, Undo/Redo and formatted/source round trips.
- Linked the project skill from AGENTS.md and README.md. It requires scenario-specific evidence and verification limits rather than promises of zero bugs or assumed parity with other apps.
- Documentation-only batch; no application behavior change, installer rebuild or application test run.
- Relative links and fallback metadata/name/placeholder checks passed. The bundled skill validator could not run because its Python environment lacks PyYAML; its full validation remains unrun.

## 9/21/26 7:06 PM GMT+8 — Backspace at the start of list items (0.7.2)

- Backspace at the start of a nonempty numbered or bulleted item now removes the marker while retaining its text and inline formatting. Nested items move out by one level. Existing empty-item Enter/Backspace behavior is retained.
- Continued list segments retain their starting numbers. The change is shared by browser and desktop editors; source and embedded copies are synchronized.
- Expanded numbering-smoke.cjs passed for first/middle items, starting at 4, bullets, bold text, undo, nested outdent and view round trips, plus existing continuation checks. The initial nested-outdent test failed with the native browser command; explicit list handling fixed it and the test passed. Existing formatted-smoke.cjs, list-zoom.cjs and formatting.cjs also passed during this batch.

## 9/20/26 10:13 PM GMT+8 — Project documentation organization

- Added root AGENTS.md and README.md, plus architecture and testing guides with separate browser and desktop storage descriptions.
- Focused the desktop README on development and packaging; reorganized the roadmap around remaining work and retained the three unresolved workspace findings.
- Archived the previous handoff and 0.5.1 QA report with historical notices. Retained the existing changelog filename and release history.
- Checked documented commands against package scripts and test sources; reviewed relative links and archive preservation. No application code changes, build or application test run in this documentation batch.

## 9/20/26 9:42 PM GMT+8 — Numbered lists (0.7.1)

- Added Numbered list to the overflow formatting menu in both browser and desktop editors.
- Enter after a typed numbered line starts/continues a numbered list even with optional Markdown-as-you-type formatting off. Markdown source mode also continues numbers, including 9 to 10; fenced code is excluded.
- Preserved Enter/Backspace exit from empty list items. Backspace on empty item 4 leaves a normal paragraph below item 3. Inline Markdown conversion remains optional.
- Numbering regression tests and existing formatted-editor/comfort checks passed, covering menu insertion, multi-item continuation, empty-item exit and optional formatting enabled/disabled.

## 9/16/26 5:05 PM GMT+8 — Windows 0.7.0 build completed

- Successfully built the installer and portable executable with the tested print-preview changes. Build completed with exit code 0; installation remains user-controlled.

## 9/16/26 4:38 PM GMT+8 — Desktop print preview (0.7.0)

- Ctrl+P and Print now open a paginated PDF preview inside Rotepad. Choose A4, Letter, Legal or A5, portrait or landscape, then Print or Save as PDF.
- PDF export saves the exact preview. Printer output uses the selected paper/orientation, then opens Windows printer settings. Canceling keeps the preview open; failures show a message and allow retry.
- Print uses a fixed note snapshot while preview is open. Empty workspaces now ask the user to open a note rather than printing the last closed note. Added print-only table borders and long-code wrapping.
- Verified the visible preview, formatted text/table output, multi-page pagination, PDF dimensions/content, exact PDF export, native-print options, cancel/error handling and empty-workspace guard. Printer dialogs were mocked; physical printing has not been tested.


## 9/16/26 3:40 PM GMT+8 — Show in File Explorer (0.6.1)

- Added Show in File Explorer to desktop Note options. Pending edits save before selecting the managed Markdown file, including renamed notes and notes in Trash.
- Untouched empty notes explain that writing or naming the note creates its file. Failed saves and missing files report an error.
- Targeted tests passed for pending text/rename, inactive notes, Trash, empty notes, unknown IDs and missing files. Explorer was mocked and test files stayed inside a disposable profile.


## 9/16/26 3:16 PM GMT+8 — Automatic per-note Markdown files (0.6.0)

- Notes now save automatically as individual .md files, initially in Documents/Rotepad Docs (or the user's existing chosen folder). Untouched blank Untitled notes wait until edited/named. Ctrl+S and closing flush pending file writes.
- Renaming updates the managed filename. Duplicate/unsafe titles use safe unique filenames without overwriting unrelated files. Trash moves files into .Trash; restore moves them back safely. Existing notes keep their locations when changing the default folder.
- Existing library notes migrate; library-before-markdown.json preserves a pre-migration copy. Separate app data keeps history, workspace, a managed-file index and recovery text. Markdown content is read on startup; conflicting newer cache text is kept as a recovered-draft note. Missing managed files can be recreated from recovery text.
- Importing external Markdown still creates a managed copy; opening an already-managed file reuses its note. Export creates an additional copy. Titles in the UI remain extension-free.
- Tests passed for migration/history backup, real file writes, filename collisions/renames, Trash/restore, safe Windows filenames, managed-file reopening, disk hydration, cache conflict preservation, missing-file recovery, changed folder defaults and failed-write retry; existing library/desktop regression suites passed. All test writes use disposable profiles.
- No phone sync or fixes to the four outstanding QA issues in this release.


## 9/16/26 2:13 PM GMT+8 — One-row desktop controls (0.5.3)

- Combined the desktop header and formatting toolbar into one 46px row. Kept the icon, note title and Close note together, with tools alongside them; File/View/Help/Settings are under Menu.
- Tools that do not fit move into the existing » overflow menu. Compact text formatting controls can overflow too; existing listeners and editor selections are retained.
- Checked 650/850/1250/1800px widths, overflow link selection, Settings access, and visuals. The library lifecycle regression suite passed. No saving/editor behavior or outstanding QA fixes changed.



## 9/16/26 1:36 PM GMT+8 — Note titles without extensions (0.5.2)

- Removed recognized trailing .md/.markdown/.txt extensions from desktop note titles in the header, sidebar and rename dialog. Existing notes retain IDs, content and history; ordinary dots such as Version 1.2 remain.
- New, renamed, duplicated, imported and restored-library notes normalize their titles. Markdown exports still receive the .md extension through the existing filename helper.
- Checked title/rename/duplicate/export behavior and reran the desktop regression suite. No changes to the four outstanding QA findings.



## 9/15/26 10:51 PM GMT+8 — QA review (no app changes)

- Reran the existing regression suites and explored the packaged 0.5.1 payload in an isolated profile. Existing suites passed; four workspace/Trash/Print issues reproduced.
- Added QA-REPORT.md and desktop/review-smoke.cjs; recorded fixes in ROADMAP.md. No installer rebuilt and no application behavior changed.



## 9/15/26 10:36 PM GMT+8 — Notepad app icon (0.5.1)

- Added an original notepad icon with teal backing, pale binding and a bold r. based on the user's reference. SVG source, transparent PNG and multi-size Windows ICO are in desktop/assets/.
- Applied the icon to the desktop window, app header and packaged Windows executable/installer. Enabled executable resource editing while keeping code signing disabled; no editor or saving behavior changed.
- render-icon.cjs rebuilds the PNG/ICO from the SVG using Playwright and Pillow. Visually checked the rendered icon.


## 9/15/26 10:09 PM GMT+8 — Automatic local saving and workspace restoration (0.5.0)

- Desktop notes, history and session now save automatically to an atomic local library.json in the existing Rotepad app-data folder. Existing app notes migrate on first launch; a newer local cache can recover edits after an interrupted write.
- Closing the app flushes the library and exits quietly. A save failure keeps it open with a retry option. Open notes, selected note, view and cursor are restored.
- Close note (× / Ctrl+W / note options) removes it from Open, keeps it in Library, and supports an empty workspace. Delete remains Move to Trash with restoration available.
- Ctrl+S is Save now; Ctrl+Shift+S exports Markdown. Imported/exported Markdown files are separate copies, not automatically overwritten by library autosave.
- Updated desktop help and tests. Phone synchronization remains planned, not implemented. Standalone Rotepad.html is unchanged.


## 9/15/26 8:43 PM GMT+8 — Simpler Windows save prompt (0.4.2)

- Simplified the close dialog to Rotepad, one save question naming the note, and Save / Don't save / Cancel. Removed the explanatory paragraph and question icon. Save and discard behavior unchanged. Exit regression checks passed.



## 9/15/26 8:33 PM GMT+8 — Save before closing (Windows 0.4.1)

- Added Save / Don't save / Cancel on exit for every note with unsaved file changes. Save writes the actual Markdown file; canceling a picker or a failed write keeps the window open.
- Don't save reloads linked notes from disk and moves never-saved notes to Trash. Discards wait until all prompts are accepted, so a later Cancel preserves drafts.
- Scope: desktop close handling, its regression tests, release version and documentation. Standalone HTML/editor behavior unchanged.
- Verified isolated Electron tests for saved/unsaved notes, restart, write failure, canceled save, and multiple-note cancellation.



## 9/14/26 6:38 PM GMT+8 — Formatted-first editing

- Formatted is now the startup view, with a Formatted/Markdown switch in the bottom bar. Split and Preview remain in View.
- Automatic Markdown conversion is opt-in under Settings and off by default; buttons and Ctrl+B/I/U continue working. Plain website autolinking remains enabled.
- Added Increase/Decrease indent (Ctrl+] / Ctrl+[), including nested Markdown lists; paragraph indentation uses tab spacing.
- Added Insert table with row/column choices, editable cells, Tab navigation and new rows at the end. Tables preserve escaped pipes and formatting through Markdown view/save round trips.
- Added Insert date and time (F5) as a fixed local timestamp. Existing Clear formatting remains in the overflow panel.
- Existing tests and Formatted, optional-bold, toolbar and desktop smoke checks passed. Table/footer/nested-list rendering was visually inspected.
- Rebuilt Windows installer and portable outputs as 0.4.0.

## 9/14/26 6:13 PM GMT+8 — Predictable automatic bold

- Fixed automatic bold carrying into subsequent normal text and causing nested bold phrases.
- Closing Markdown formatting now resets the browser's inline typing state; Enter immediately afterward no longer clones bold onto the next line.
- After Backspace cancels automatic formatting, new typing at the end of the canceled phrase moves outside its literal span so another bold phrase can format normally.
- Added real-keystroke regression coverage for trailing text, repeated phrases, insertion into existing text, Enter, cancellation then fresh bold, and round trips. Existing tests and desktop smoke passed.
- Windows installer and portable builds updated to 0.3.1.

## 9/13/26 6:09 PM GMT+8 — Compact responsive toolbar

- Kept the editor toolbar on one row with compact square icon controls and reduced padding.
- Added a single » overflow panel, replacing More. Less-used tools move into it as the window narrows and return when space is available; the panel overlays the editor.
- Kept Sidebar, Undo/Redo, Bold/Italic/Underline and Find visible. Shortened Iosevka font labels without changing stored font values.
- Collapsed File/View/Help/Settings into one Menu below 850px.
- Verified 360/700/850/1400px layouts, overflow link selection, font selection, Escape, and compact Settings. Ten existing tests and desktop smoke checks also passed. Inspected wide, narrow and open-overflow screenshots.
- Rebuilt the Windows installer and portable application as 0.3.0.

## 9/13/26 5:55 PM GMT+8 — Save folder, Markdown opening, and formatting reversal

- Added a desktop default save folder: Documents/Rotepad Docs, created when saving. Settings allows choosing another folder; existing file locations stay unchanged.
- Added a Windows installer with Markdown file registration, plus a refreshed portable build (0.2.0). Handles file arguments both on startup and when already running; reopening an active file preserves unsaved notes.
- Added immediate Backspace reversal for automatic Markdown formatting, preserving literal syntax through subsequent typing and reloads. Fixed premature italic conversion while typing bold delimiters.
- Clarified the existing real-time spellcheck setting and added a tooltip; its default remains enabled.
- All ten existing test scripts passed. Desktop tests passed for folder persistence, saving, startup and already-running file requests, spellcheck toggle, and real italic/bold Backspace keystrokes. Native picker results were mocked; installer registration is not tested by installing on this computer.

## 9/13/26 12:01 AM GMT+8 — Windows desktop preview

- Packaged the existing editor as a standalone Windows x64 application in `dist/Rotepad-0.1.0-Windows.exe`; no installer required.
- Added a separate `desktop/` wrapper and build instructions. The original Rotepad.html is unchanged.
- Added native desktop Save/Open dialogs, same-file saving, persistent file associations, and separate app storage under `%APPDATA%/Rotepad`.
- Desktop smoke checks passed for repeated saving, restart persistence, canceled Save As, Open, and embedded fonts. Picker results were mocked. The packaged app also launched successfully.
- This is an unsigned test build. Browser notes can be transferred through Backup/Restore. macOS, Linux, and mobile builds remain future work.

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








