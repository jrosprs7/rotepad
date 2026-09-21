---
name: rotepad-regression-review
description: Plan and verify regression coverage for Rotepad application changes, bug reviews and release checks. Use to identify affected features and user scenarios, exercise editing and persistence boundaries, and report evidence and coverage gaps. Documentation-only work needs document validation, not an application test run.
---

# Rotepad regression review

Make missed scenarios visible before calling an update complete. This skill is a development checklist, not an automatic test runner or a guarantee that every possible interaction is bug-free.

## Establish the scope

Follow [AGENTS.md](../../AGENTS.md), [architecture](../../docs/ARCHITECTURE.md) and [testing](../../docs/TESTING.md). Preserve the starting Git diff. Test only disposable notes and isolated profiles. The current request determines what may change; discovering another problem does not authorize an unrelated rewrite.

Use the [feature coverage map](references/feature-coverage.md) to review the app's features before selecting checks. Reconcile the map with current menus, Settings, shortcuts and event handlers so newly added features are not silently omitted. The map is a starting inventory, not proof of coverage.

- For a focused fix, identify the changed feature, shared dependencies and adjacent interactions. Exercise those paths and an unaffected control case. Record why remaining feature groups do not need execution for this change.
- For an explicitly requested whole-app review or release verification, account for every supported feature group in the map with executed checks or a named coverage gap. Do not treat an existing smoke script as complete coverage of its feature.
- For documentation-only work, check links, consistency, metadata and commands. Do not build or retest the application merely because this skill changed.

## Define observable scenarios before editing

For a reported defect, first record a minimal reproduction: runtime, mode, relevant settings, how the content was created, document shape, visible caret/selection, actions, expected result and actual result. Reproduce with typing/menu actions as well as any imported or DOM-seeded fixture needed to isolate it.

For each affected feature, consider these dimensions and choose meaningful combinations:

- Fresh state and restored state; enabled/disabled settings; Formatted and Markdown paths where supported.
- Empty, nonempty and multiline content; first, middle and last positions; one item and several; nested and adjacent structures.
- Collapsed caret and selected text; typing, menu/shortcut, paste and import paths; one action and a repeated sequence.
- Success, cancellation, invalid input and failure/retry where the feature can encounter them.
- Undo/Redo, switching notes/views, save/reload and desktop restart when the changed state crosses those boundaries.

Always test the exact reported combination. Cover boundaries and representative combinations beyond it; do not replace this with an arbitrary test count or an endless Cartesian product. Unsupported scenarios and unavailable hardware remain explicit gaps, not passes.

For editing changes, also use [Rotepad editing behavior](../rotepad-editing-behavior/SKILL.md). For numbering/bullets, its [list matrix](../rotepad-editing-behavior/references/list-scenarios.md) is required: a passing empty-item exit does not cover nonempty first-line Backspace or middle-of-line Enter.

## Execute and investigate

1. Read the relevant handler/wrapper and serialization chains before editing. Trace both keyboard and beforeinput paths where applicable, and identify every entry point to the same action.
2. Turn a reproduced behavioral bug into a meaningful failing regression, then make the smallest correction. Do not add tests that merely match implementation strings or generate tests for a low-impact cosmetic change without a behavioral risk.
3. Assert user-visible content, marker/format state and caret/selection. Where relevant also assert valid structure, serialized Markdown, note identity, durable file contents and recovery state. A screenshot or successful process exit alone cannot prove these invariants.
4. Exercise the affected feature's neighboring behavior. For example, a list fix must not consume ordinary paragraph Backspace, quote exit, code text, selection deletion or Undo. A storage fix must not confuse current text with history or silently overwrite a different note.
5. Run the relevant checks from the testing guide on the final source. Synchronize embedded editor copies and prepare desktop assets before Electron checks. Shared keyboard/DOM changes need browser interaction tests and affected desktop interaction checks; test the real event sequence, not only extracted helpers.
6. Inspect every failure. Distinguish a product defect, faulty expectation and environment limitation using evidence. Never delete/weaken an assertion solely to obtain a pass. After a fix, rerun the failed check and its affected neighbors; broaden testing only for newly identified risk.

Record evidence in a compact matrix in the task report or an appropriate project QA record:

| Feature/scenario | Expected result | Runtime, mode and setup | Check and observed result | Status / gap reason |
| --- | --- | --- | --- | --- |

Use **passed**, **failed**, **not run** or **not applicable**. A passed row requires observed assertions on the current source; not applicable requires a scope or support reason. Mark mocked dialogs, synthetic composition events and development-runtime tests as such. They do not verify native dialogs, a physical IME or an installed build.

## Completion review

Compare the final diff with the starting diff and agreed scope. Confirm the original reproduction, selected adjacent cases and applicable regressions pass. Keep newly found in-scope failures open until resolved; report blockers and unrelated/known findings accurately. Do not hide an untested affected path behind “all tests passed.”

Update changed behavior in its primary documentation and record the completed batch with actual GMT+8 time in the changelog. Add a regression for a recurring bug rather than relying on memory next time. If a supported feature was missing from the coverage map, add it there without duplicating the testing guide's commands.

Report the changed behavior, tested scenarios, failures and remaining verification limits. Separate source tests, packaged build creation and installation testing. A build succeeding is not an installation test, and no finite suite proves “all possible scenarios” or exact parity with another app. Verify a requested reference app's behavior before claiming parity.
