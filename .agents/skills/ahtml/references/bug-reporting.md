# ahtml Bug Reporting

Use this when debugging indicates a likely `ahtml` product bug after normal checks.

Product bugs are failures in the path from semantic `.agent.html` to stable, shareable HTML artifact. Invalid raw HTML, CSS, scripts, or unsupported renderer props are expected input errors, not product bugs.

## First confirm it is a product bug

Before drafting an issue, run or ask for results from:

```bash
ahtml doctor
ahtml build artifact.agent.html
```

If preview is the failing surface, also run:

```bash
ahtml preview artifact.agent.html
```

File a bug when the failure is reproducible and fits one of these cases:

- CLI crash or unhandled exception
- incorrect validation, parsing, or sanitization behavior
- `doctor` gives wrong or contradictory guidance
- build or preview fails despite a valid document and ready managed runtime
- managed runtime output contradicts the schema contract
- published docs or skill instructions describe commands that do not work
- package boundary regression, such as requiring current-directory Vite, React, Tailwind, shadcn/ui, `components.json`, `vite.config.ts`, or `agent-html.project.json`

Do not file a bug for:

- invalid agent-facing input rejected by the schema
- network, npm auth, GitHub auth, or Cloudflare auth failures
- failures fixed by documented `doctor`, update, or rebuild guidance

## Collect evidence

Include only relevant, redacted information:

- exact command and full error output
- `@agent-html/ahtml` version
- Node and npm versions
- OS and shell
- minimal `.agent.html` that reproduces the issue
- expected behavior and actual behavior
- results from `ahtml doctor`
- runtime home path and whether `AHTML_HOME` was set
- whether `ahtml build` passes or fails

Redact secrets, tokens, private account names, private URLs, and unrelated user content. Keep file paths only when they help reproduce the issue.

## Draft the issue

Default to preparing an issue draft. Do not submit it automatically.

Use this title format:

```txt
[ahtml] concise failure description
```

Use this body format:

```md
## Summary

## Reproduction

## Expected Behavior

## Actual Behavior

## Environment

## Diagnostics Run

## Notes / Suspected Area
```

Use the repository issue tracker from `package.json`:

```txt
https://github.com/Sayhi-bzb/Agent-HTML/issues
```

Only run `gh issue create`, open a browser, or use network tooling when the user explicitly asks to submit the issue.
