# ahtml Skill Evaluation

This file defines how to evaluate the `ahtml` skill itself.

## Goal

Evaluate whether the skill stays minimal while still letting an agent complete the right task in one pass.

## Evaluation inputs

- `.agents/skills/ahtml/SKILL.md`
- `.agents/skills/ahtml/references/install.md`
- `.agents/skills/ahtml/references/usage.md`
- `.agents/skills/ahtml/references/debug.md`
- `evaluation/ahtml/evals.json`
- `evaluation/ahtml/rubric.md`

## Core criteria

### 1. Skill-level quality

- `SKILL.md` is concise.
- `SKILL.md` only contains first-layer rules:
  - `ahtml` command usage
  - syntax rules
  - routes to second-layer references
- Rules are explicit and unambiguous.
- Rules are minimal; remove any line that does not materially improve one-pass success.
- Avoid filler that a strong model can already infer from common software context.

### 2. One-pass writing outcome

Input:

- `SKILL.md` only

Pass condition:

- The agent writes a valid `.agent.html` file in one pass.
- The document is rich, not only the minimal `page + card` shell.
- The document uses registered components and legal nesting.
- The document does not use `class`, `className`, `style`, scripts, event handlers, Radix props, shadcn props, raw HTML, or unknown attrs.

### 3. One-pass install outcome

Input:

- `SKILL.md + references/install.md`

Pass condition:

- The agent chooses the correct install path for the environment.
- The agent can prepare the managed runtime in one pass.
- The agent uses `AHTML_HOME` only when isolation is needed.
- The agent does not fall back to removed scaffold/init flows.

### 4. One-pass command outcome

Input:

- `SKILL.md + references/usage.md`

Pass condition:

- The agent can run `ahtml prompt`.
- The agent can build or preview a valid artifact in one pass.
- The agent can use `inspect` when the task needs artifact or document details.
- The agent does not invent unsupported commands or unsupported config vocabulary.

### 5. One-pass debug outcome

Input:

- `SKILL.md + references/usage.md + references/debug.md`

Pass condition:

- The agent starts with `ahtml doctor`.
- The agent can distinguish runtime/build/preview failure paths.
- The agent can use isolated `AHTML_HOME` for clean reproduction.
- If the bug is local and fixable, the agent can complete the local fix.
- If the bug is reproducible and product-level, the agent can produce a valid issue draft or feedback payload.

## Manual scenarios

### Scenario A: Write only

Ask the agent to create a review or decision artifact with:

- one `card`
- one `list` or `table`
- one `tabs` or `accordion`
- one field or option block

Expected:

- valid syntax
- legal structure
- useful content

### Scenario B: Install only

Ask the agent to install `ahtml` in:

- a normal user environment
- a local repo development environment
- an isolated runtime environment

Expected:

- correct command choice
- no scaffold/init drift

### Scenario C: Command use

Ask the agent to:

- read the prompt
- write an artifact
- build or preview it
- inspect it if needed

Expected:

- correct command order
- no unsupported flags

### Scenario D: Local debug

Give the agent a broken local runtime, preview failure, or build failure.

Expected:

- starts with `doctor`
- follows the shortest valid repair path
- escalates to bug reporting only when the failure remains reproducible

## Failure signals

Fail the skill if any of these happen:

- `SKILL.md` is long but still leaves first-pass ambiguity.
- The agent needs hidden repo knowledge not exposed by the selected layer.
- The agent invents unsupported syntax, attrs, or commands.
- The agent uses removed flows.
- The agent reaches the correct result only after avoidable trial-and-error caused by missing first-layer rules.

## Maintenance rule

When adding a rule to `SKILL.md`, justify it by one of these:

- it fixes a repeated one-pass failure in Scenario A
- it fixes a repeated one-pass failure in Scenario C
- it fixes a repeated routing failure to `install.md`, `usage.md`, or `debug.md`

If a rule does not improve one-pass success, keep it out of `SKILL.md`.
