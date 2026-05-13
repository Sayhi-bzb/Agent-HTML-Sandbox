# ahtml Bug Reporting

Use this when debugging indicates a likely `ahtml` product bug after normal setup, validation, and diagnostics checks.

Product bugs are failures in the path from semantic `.agent.html` to stable, shareable HTML artifact. Invalid raw HTML, CSS, scripts, or unsupported renderer props are expected validation failures, not product bugs.

## First Confirm It Is A Product Bug

Before drafting an issue, run or ask for results from:

```bash
ahtml status
ahtml doctor
ahtml validate --input artifact.agent.html
```

File a bug when the failure is reproducible and fits one of these cases:

- CLI crash or unhandled exception.
- Incorrect validation, parsing, or sanitization behavior.
- `status` or `doctor` gives wrong or contradictory guidance.
- Build or preview fails despite a valid document and ready managed runtime.
- Managed runtime output contradicts the schema contract.
- Published docs or README describe commands that do not work.
- Package boundary regression, such as requiring current-directory Vite, React, Tailwind, shadcn/ui, `components.json`, `vite.config.ts`, or `agent-html.project.json`.

Do not file a bug for:

- Invalid agent-facing input rejected by the schema.
- Network, npm auth, GitHub auth, or Cloudflare auth failures.
- Failures fixed by documented `status`, `doctor`, update, or validation guidance.

## Collect Evidence

Include only relevant, redacted information:

- Exact command and full error output.
- `@agent-html/ahtml` version.
- Node and npm versions.
- OS and shell.
- Minimal `.agent.html` that reproduces the issue.
- Expected behavior and actual behavior.
- Results from `ahtml status` and `ahtml doctor`.
- Runtime home path and whether `AHTML_HOME` was set.
- Whether `ahtml validate` passes or fails.

Redact secrets, tokens, private account names, private URLs, and unrelated user content. Keep file paths only when they help reproduce the issue.

## Draft The Issue

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
