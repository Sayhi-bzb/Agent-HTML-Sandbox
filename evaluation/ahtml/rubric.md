# ahtml Evaluation Rubric

Use this rubric to grade student subagent answers.

## Grading flow

Grade every answer in two passes:

1. Hard checks
2. Quality scoring

If a hard check fails, the answer fails even if the quality score is high.

## Hard checks

### For `agent_html`

- Validate the submitted `.agent.html` with the existing `ahtml` validation interface; do not hand-write a parser or schema checker.
- `ok` must be `true`.
- `diagnostics` must be empty.
- Then verify scenario-specific hard requirements from `evals.json`.

Automatic hard fail:

- invalid syntax
- unknown attrs or tags
- use of `class`, `className`, `style`, scripts, event handlers, raw HTML, Radix props, or shadcn props
- missing required structure for the scenario

### For `commands`

- Verify all required commands appear.
- Verify order when the scenario requires order.
- Verify the answer does not invent unsupported commands or flags.
- Verify the answer does not use removed flows such as `init`, `--template`, `--apply`, or `--scaffold`.

### For `debug_plan`

- Verify the first diagnostic step is `ahtml doctor` unless the scenario explicitly narrows the failing surface.
- Verify the next steps follow `references/debug.md`.
- Verify escalation to issue reporting happens only after reproducible failure remains.

## Quality scoring

Each answer gets 0 or 1 on each dimension:

- `correct`
  - Does it solve the asked task?
- `complete`
  - Does it include all required structure or steps?
- `minimal`
  - Does it avoid unnecessary commands, explanations, or unrelated work?

Total score: `0` to `3`.

## Failure attribution

After grading, assign one primary attribution for failed runs.
Successful runs may use `none`.

Allowed values:

- `none`
- `missing_first_layer_rule`
- `missing_second_layer_rule`
- `rule_ambiguity`
- `too_much_noise`
- `student_reasoning_failure`
- `task_design_issue`

Use these definitions:

- `none`
  - the run passed and does not require a failure attribution

- `missing_first_layer_rule`
  - `SKILL.md` lacked a rule needed for one-pass success
- `missing_second_layer_rule`
  - the selected ref layer lacked required execution detail
- `rule_ambiguity`
  - the rule existed but was easy to misread
- `too_much_noise`
  - irrelevant text distracted the student from the right action
- `student_reasoning_failure`
  - the documents were sufficient but the student still made the wrong move
- `task_design_issue`
  - the task prompt was unclear or inappropriate for the evaluated layer

## When to change the skill

Only update `SKILL.md` when:

- the same `missing_first_layer_rule` repeats across at least two runs, or
- `rule_ambiguity` repeats on the same concept

Update second-layer refs when:

- failure is `missing_second_layer_rule`

Do not add rules when:

- failure is primarily `student_reasoning_failure`
- failure comes from one-off task wording
- the answer still passed hard checks and quality was acceptable
