# Browser Runtime Triage

This document captures the shortest reliable path for finding runtime rendering
bugs in `agent-html`.

## Core idea

Treat every bug as a mismatch between three layers:

1. input semantics
2. rendered browser truth
3. renderer and runtime implementation

The job is to find the first layer where truth diverges.

## Fastest way to find a bug

Use this order.

### 1. Read the input first

Inspect the source `agent.html` and state what each component is supposed to
mean.

Examples:

- `checkbox` means a boolean field
- `accordion` means collapsible content, not permanently expanded content
- `progress value="50"` means determinate progress, not indeterminate progress

If the semantic expectation is not explicit, debugging becomes guesswork.

### 2. Inspect the real page, not only code

Open the preview page and inspect the actual DOM in DevTools.

Check:

- actual tag structure
- `role`
- `aria-*`
- `data-slot`
- `data-state`
- `data-orientation`

Do not stop at HTML strings from tests when the problem is visual or behavioral.

### 3. Classify the bug before reading implementation

Put the bug into one of these buckets:

- structure bug
  - wrong wrapper layout
  - wrong child placement
  - wrong component family
- state or prop bug
  - `value`, `checked`, `defaultValue`, `type`, `orientation`, `aria-label`
    not forwarded correctly
- pure styling bug
  - structure is correct but class composition or variant mapping is wrong

This classification cuts search time sharply.

### 4. Trace only the layers that matter

Use this stack:

1. `packages/ahtml/src/config/component-capabilities.mjs`
2. `packages/ahtml/src/cli/runtime-template/src/renderer/render-node.tsx`
3. `~/.ahtml/runtime/src/components/ui/*`

Interpretation:

- `component-capabilities` decides the semantic family and prop mappings
- `render-node.tsx` decides the rendered component tree
- runtime `ui/*` wrappers decide what the wrapped shadcn or radix component
  finally receives

## Tools that paid off

### Chrome DevTools

Best for:

- real DOM structure
- final accessibility semantics
- actual state flags such as `data-state` and `aria-checked`

Use it to verify browser truth before touching implementation assumptions.

### Accessibility tree snapshots

Best for:

- seeing what users and assistive technology actually get
- spotting split semantics, such as:
  - control rendered separately from its label block
  - description rendered as detached text instead of part of one field pattern

### `rg`

Best for:

- `propMappings`
- renderer kinds
- capability definitions
- runtime wrapper entrypoints

### `ast-grep`

Best for:

- locating a specific render branch
- checking how a component family is implemented structurally
- finding repeated code shapes without brittle text search

### Direct reads of runtime wrapper files

This was critical.

Do not assume the preview runtime is identical to upstream shadcn examples.
Inspect the generated runtime wrappers directly under:

- `~/.ahtml/runtime/src/components/ui/*`

Many bugs live there, not in the parser and not in the upstream library.

## What to check first

### Family honesty

Ask whether the component was mapped into the right renderer family.

Examples:

- text field
- toggle field
- range field
- grouped choice
- inline choice
- overlay choice

If the family is wrong, every downstream structure decision tends to be wrong.

### Critical props

Check whether these values make it all the way to the final runtime component:

- `value`
- `defaultValue`
- `checked`
- `type`
- `orientation`
- `aria-label`

Most subtle bugs are prop forwarding bugs.

### Visual state vs semantic state

Always compare visual appearance with semantic truth.

A component can look correct and still be wrong.

Example:

- a progress bar can visually appear at 50%
- but the root DOM can still be `indeterminate`
- that means styling and accessibility disagree

### Wrapper-induced layout breakage

Check whether extra `Field`, `FieldContent`, or label wrappers changed the
layout contract expected by the runtime component family.

### Hardcoded default behavior

Look for renderer logic that forces a default state.

Examples:

- passing every accordion item into `defaultValue`
- forcing all sections open
- injecting fixed control props that were never part of the input semantics

## Case studies from this investigation

### Checkbox family

What worked:

- inspect the real preview DOM first
- confirm whether the current runtime still had the old broken structure

What we learned:

- the current runtime had already moved to an honest toggle-field structure
- the older DOM sample was no longer current browser truth
- reading only historical output would have led to a false conclusion

### Accordion

Observed mismatch:

- content said "click to expand details"
- actual page rendered all items already open

Actual source of truth:

- renderer logic passed all item values into `defaultValue`
- this was a renderer behavior bug, not a CSS bug

Lesson:

- when all sections start open, inspect default-state wiring before touching
  styles

### Progress

Observed mismatch:

- input declared `value="50"`
- visual bar looked like 50%
- root DOM still reported indeterminate state

Actual source of truth:

- the runtime wrapper consumed `value` for indicator styling
- but failed to forward `value` to the progress root

Lesson:

- a component can be visually plausible while semantically broken
- always inspect root DOM state, not only the filled indicator

## Common wrong turns

### Blaming syntax too early

Many runtime bugs are not caused by invalid `agent.html`.
They come from coarse renderer adaptation or broken wrapper forwarding.

### Trusting upstream component branding too much

"We use shadcn" is not evidence that the output is correct.
The adaptation layer can still feed the wrong structure or props into the
component.

### Looking only at test markup strings

String assertions help, but they miss:

- accessibility mismatches
- visual and semantic disagreement
- wrapper-level prop loss

### Stopping at the outermost class list

An outer wrapper can look wrong while an inner wrapper still creates the real
layout.
Inspect the full nesting before concluding the layout is broken.

## Recommended triage sequence

Use this exact order:

1. Read the `agent.html` input.
2. State the intended semantics in plain language.
3. Inspect the live DOM in DevTools.
4. Inspect accessibility output when state or labeling is involved.
5. Decide whether the bug is structural, state-based, or styling-only.
6. Check `component-capabilities` for family and prop mappings.
7. Check `render-node.tsx` for component tree shape.
8. Check runtime `ui/*` wrappers for final prop forwarding.
9. Only then decide whether the bug belongs to:
   - spec assumptions
   - renderer adaptation
   - runtime wrapper implementation

## One-line heuristic

Do not ask "why does shadcn have a bug?"

Ask:

"What structure and props did our renderer actually hand to the runtime
component?"
