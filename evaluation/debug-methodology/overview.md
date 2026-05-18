# Debug Methodology Overview

This directory records a practical bug-finding methodology for `agent-html`
runtime rendering issues.

It focuses on one class of failures:

- the `agent.html` input expresses one thing
- the browser renders another
- the renderer and runtime wrappers hide where the mismatch was introduced

This is not:

- a product spec
- an issue archive
- a generic frontend debugging handbook
- an `ahtml` skill evaluation rubric

It is an internal evaluation asset for repeatable bug triage.

## Primary goal

Reduce time spent guessing where a rendering bug came from.

The method here is designed to answer three questions in order:

1. What did the input intend?
2. What did the browser actually render?
3. Which layer introduced the mismatch?

## Main workflow

Use this sequence:

1. Read the `agent.html` input and state the intended UI semantics.
2. Inspect the real browser output in DevTools.
3. Decide whether the problem is:
   - structure mismatch
   - state/prop mismatch
   - pure styling mismatch
4. Trace the mismatch back through:
   - `component-capabilities`
   - `render-node.tsx`
   - runtime wrapper components under `~/.ahtml/runtime/src/components/ui/*`

The detailed procedure lives in
[browser-runtime-triage.md](./browser-runtime-triage.md).

## High-value rules

- Do not start by blaming the parser.
- Do not assume "using shadcn" means the result is correct.
- Do not stop at string output or test snapshots when the bug is visual.
- Always ask: what structure and props did we actually feed into the runtime
  component?

## Scope

This methodology is most useful for:

- visual rendering mismatches in preview pages
- accessibility or state mismatches in rendered output
- incorrect component-family adaptation
- missing or wrong prop forwarding in runtime wrappers

It is less useful for:

- syntax validation bugs
- CLI install failures
- packaging or release issues
- unrelated app-shell or infrastructure problems
