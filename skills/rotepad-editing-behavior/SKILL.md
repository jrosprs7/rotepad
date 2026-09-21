---
name: rotepad-editing-behavior
description: Review, implement, and regression-test Rotepad editing interactions, especially numbered lists, bullets, caret movement, Enter, Backspace, indentation, formatting and undo. Use for Rotepad editor behavior changes or reports of inconsistent typing behavior; not for unrelated packaging or storage work.
---

# Rotepad editing behavior

Make writing predictable and reversible, with familiar keyboard behavior and no lost text. This is a development skill, not a runtime app setting. It defines acceptance criteria; it does not assert that the current app passes them all.

## Scope and sources

- Follow the current user request and [project instructions](../../AGENTS.md). Consult [architecture](../../docs/ARCHITECTURE.md) before editing event handlers, and [testing](../../docs/TESTING.md) for commands and isolation.
- Inspect Git status and preserve unrelated work. Use disposable notes and profiles, never the user's actual document or installed profile.
- “Like well-known chat apps” means familiar, consistent editing, not cloning every app's shortcuts or sending messages on Enter. Apps differ. Use the explicit Rotepad rules below; verify a named app's current behavior if exact parity is requested. Do not claim parity from memory.
- Preserve Formatted as the fresh-user default, optional inline Markdown conversion, existing Markdown conventions and all other product agreements in AGENTS.md. List continuation must not require enabling automatic bold/italic conversion.
- This skill does not authorize a feature overhaul. Fix the requested interaction and directly related failures. Record unrelated findings separately.

## Required list behavior

In these examples `|` is the caret, not document text. A displayed number or bullet is normally a list marker, not editable text.

| Context and action | Expected result |
| --- | --- |
| Top-level `3. \|This text here` → Backspace | `\|This text here` as a normal paragraph; retain every character and inline style. |
| The same item is the very first line of the document | Exactly the same result. No preceding paragraph, sibling or list item may be required. |
| `• \|This text here` → Backspace | Remove the bullet, retain text, place caret at paragraph start. |
| Nested item at its start → Backspace | Move it outward one level, preserving its text and descendants. Do not remove multiple levels at once. |
| Caret inside item text → Backspace | Normal text deletion. Do not remove the list marker. |
| Top-level empty item → Enter or Backspace | Exit to an empty normal paragraph at that position; do not jump into the preceding item. |
| Nonempty numbered/bulleted item → Enter | Continue the same list; numbered items advance once. |
| Enter in the middle of an item | Split text at the caret into the next item, preserving both halves and their formatting. |
| Shift+Enter inside an item | Insert a line break within that item without adding a marker. |
| A selection exists → Backspace | Delete the selection normally; the collapsed-caret list shortcut must not intercept it. |
| Remove a marker, then Undo / Redo | Restore / reapply the structural change with text, formatting and caret intact. |

Retain an intentional starting number and consistent sequential numbering within each list. If removing an item splits a list into segments, preserve the following segment's intended starting number. Do not “repair” a screenshot's numbering by overwriting content before identifying the actual list structure.

For empty nested items, Enter or Backspace moves outward one level. For list merging, mixed bullet/numbered lists or ambiguous selection behavior, establish and test the intended outcome before changing existing behavior. Do not silently apply the top-level rule to a different structure.

## Diagnose before changing code

1. Reproduce the reported document shape and physical key action in the actual editor. Include the first-line case even if the same action works below another paragraph. Use synthetic text matching the structure rather than real note contents.
2. Determine whether the visible marker is an `ol/li` marker, a literal typed prefix, an item `value`, or a separate list with its own `start`. Inspect DOM, Markdown and selection together. A screenshot alone does not establish the cause.
3. Trace relevant `keydown`, `beforeinput`, `input`, composition, selection, quote/list exit and automatic-formatting handlers, plus their wrapper order. Ensure a key gesture is handled once, not twice. Do not clear content just to reposition the caret.
4. Locate the actual caret boundary, including inline elements, blank text nodes, nonbreaking spaces, line breaks and composition text. “Offset zero in a text node” does not necessarily mean “start of the item.”
5. Add a failing browser regression that uses a real keypress at the reported caret position. Fixtures may supplement it but cannot prove browser selection behavior. DOM-seeded tests must be paired with at least one user-created list using typing or the menu.
6. Implement the smallest reliable correction. Preserve valid list structure, inline children, descendant lists, siblings, start numbers and history. Treat browser editing commands as behavior to verify, not a guarantee.

## Verification and delivery

Use [Rotepad regression review](../rotepad-regression-review/SKILL.md) to account for affected neighboring features and record evidence or coverage gaps. Its feature map supplements the list-specific scenarios below.

For list changes, read [the scenario matrix](references/list-scenarios.md). Exercise the core cases and relevant adjacent cases; explicitly state any exclusions. A simple empty-item test is not evidence for a nonempty first-line item.

Assert observable text, marker state, list structure, caret position and Undo/Redo. For affected formatted/source conversion, also check Markdown and view round trips. When persisted behavior is implicated, use isolated save/reload or desktop restart checks from the testing guide.

Keep tools/numbered-lists.js and its embedded copy synchronized; likewise synchronize the other shared-editor reference files when changed. Edit source, regenerate desktop assets through the documented preparation command, and preserve embedded fonts. Do not hand-edit generated app or installer files.

Run relevant root tests and browser smoke tests from the testing guide. Stop and inspect every failing command; a later command succeeding must not hide an earlier failure. Run Electron checks when desktop-only integration or restoration is involved. Build only when appropriate to the requested delivery; never install, publish or push without authorization.

Update primary documentation and the actual GMT+8 changelog timestamp. Report the reproduction, changed behavior, tests actually run and their limits. Distinguish source verification from installer verification. Never claim “bug-free,” “all scenarios covered,” or “fixed” based only on source inspection or historical pass reports. If the first-line reproduction still fails, keep the issue open.
