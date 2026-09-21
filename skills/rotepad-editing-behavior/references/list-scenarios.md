# List interaction acceptance matrix

Use with [the skill](../SKILL.md) when changing list behavior. These are acceptance scenarios, not a claim of existing automated coverage. Run core cases for list changes; select additional cases where the changed handler, parser or serializer can affect them. Avoid an indiscriminate Cartesian product, but include combinations that triggered the report.

## Core cases

| Scenario | Action and assertions |
| --- | --- |
| First document line, single nonempty numbered item | Type/create `3. Text`; put caret immediately before `T`; Backspace removes the marker, preserves `Text`, leaves caret before `T`, and does not require a preceding node. |
| First document line, several items | Remove the first item's marker. Verify its paragraph, remaining items, numbering and caret. Repeat with start numbers 1, 3 and a multi-digit number. |
| Same item after a normal paragraph | Perform the same action; verify the preceding paragraph is unchanged and no unintended merge occurs. |
| Middle and final items | Remove the marker without losing or joining unrelated text. Verify both surrounding list segments and their start numbers. |
| Bulleted counterparts | Repeat first-line and middle-item cases with bullets. No literal bullet residue should remain. |
| Empty item at document start and after item 3 | Backspace and Enter each exit correctly. The caret remains in the resulting paragraph; preceding text is unchanged. |
| Caret within text or at its end | Backspace removes the intended text unit, leaves the list intact and preserves unrelated formatting. |
| Nonempty list continuation | Type items 1, 2, 3; Enter produces one next item per press. Include transition 9 → 10 and a non-1 starting number. |
| Split item | Enter between two words; verify preceding/following text, list numbering and caret at the new item. |
| Literal prefix versus semantic item | With inline conversion off and on, type a fresh `1. First second` or `- First second`; press Enter before `second`. Repeat after parsing/reopening and through the menu. Verify two items, preserved words and caret at the second item; inspect marker numbers as well as text. |
| Split immediately after marker | At `1. ` followed immediately by the caret and nonempty text, Enter leaves an empty first item and moves the text into the next item. Repeat with bullets, first document line and inline formatting at the boundary. |
| Empty nested item | Enter and Backspace each move out one level, retaining siblings/descendants and valid list structure. Repeat with numbers and bullets. |
| Soft break | Shift+Enter keeps a single item; Backspace at the second visual line must not mistakenly remove the whole item's marker. |
| Nested nonempty item | Backspace at its start outdents one level. Check siblings before/after, descendants and resulting numbering. |
| Undo / Redo | Undo marker removal and redo it; then type. Verify text, caret, marker and following numbers after each action. |

For every start-of-item test, assert the selection is collapsed and located where a user sees the text begin. Include a first text node, an inline bold/link child, and a caret placed using Home or pointer navigation. Testing only a range artificially anchored on the `li` element is insufficient.

## Structural and input variants

- Create lists by typing, the Numbered list/Bullet button, Markdown import/view switching and paste where supported. Confirm semantic list markup versus literal text before choosing the expected action.
- Run relevant typed-list cases with automatic Markdown conversion both off and on. Preserve literal inline symbols when the setting is off.
- Include bold/italic/underline, links, emoji and non-ASCII text. Assert the content and styles survive marker removal. Do not strip meaningful whitespace or split grapheme clusters to simplify caret checks.
- Include multi-paragraph items, child lists, and lists inside quotes where the app supports them. Parent and child list boundaries must remain valid. If unsupported, report that limit rather than flattening content silently.
- Include selected text in one item and across items; Shift/Ctrl/Alt-modified deletion; composition/IME input; and repeated keypresses. Structural shortcuts must not hijack selection deletion or composition.
- Exercise `keydown` and browser `beforeinput` paths without double-handling one gesture. Test a beforeinput-only path when the implementation claims to support it; do not infer phone compatibility from desktop tests.
- Include empty HTML variations (`br`, whitespace, zero-width caret helpers), but do not classify items with child lists, images or other meaningful content as empty.
- Check menu/shortcut list toggles on plain text, the same list type and the other list type, with a selection spanning several items. Keep every command reachable through toolbar overflow and preserve the selected range.
- Exercise supported task checkboxes separately from ordinary bullets: unchecked/checked items, Enter continuation, empty exit, view switching and saved/reopened state. Do not infer task-item coverage from a plain bullet test.
- Include long wrapped items and multi-digit markers at changed zoom/font settings. Soft wrapping alone must not create another item or change the logical start-of-item Backspace boundary.

## Literal Markdown and conversion

- In Markdown view, literal source remains editable source. Enter on a numbered line should continue numbering; empty-marker exit should work as documented. Do not assume a native rich-text marker exists there.
- Repeat source Enter at the end, middle and immediately after a prefix for supported numbers, bullets and task markers. Include checked-task continuation and code-fence boundaries. Compare actual source and caret with the intended result.
- Verify escaped markers, decimals such as `3.14`, ordinary numbered prose, inline code and fenced code are not accidentally rewritten by a broad prefix matcher.
- Check source → Formatted → source round trips after removal, split, outdent and Undo. Visible numbering and serialized start numbers should agree. Inspect mismatches such as a first visible `4` followed by `2` before changing them.
- When a saved/reopened list behaves differently from a newly typed one, test both paths in a disposable profile and preserve original note content during the investigation.

## Evidence to record

For each failure, capture mode and settings, creation path, minimal content, caret/selection position, key sequence, expected outcome, actual visible result, DOM/list structure and serialized Markdown. Record browser or Electron version when behavior differs by runtime.

For completion, list scenarios actually exercised, regression scripts run, outstanding failures and manual checks still needed. A count of passing tests alone does not establish that the user's scenario was tested.
