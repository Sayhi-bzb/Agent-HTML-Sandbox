# ahtml Bug Reporting

Use this when debugging indicates a likely `ahtml` product bug after normal setup, validation, and diagnostics checks.

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
- Build or preview fails despite a valid document and ready local integration.
- Generated user-local adapter behavior contradicts the schema contract.
- Published docs or README describe commands that do not work.
- Package boundary regression, such as requiring package-local Vite, React, Tailwind, shadcn/ui, or renderer files.

Do not file a bug for:

- Invalid agent-facing input rejected by the schema.
- Missing `ahtml init`, missing `agent-html.project.json`, or missing shadcn components.
- Unsupported local Vite/shadcn project shape.
- Network, npm auth, GitHub auth, or Cloudflare auth failures.
- Failures fixed by documented `status`, `doctor`, `init --apply`, or validation guidance.

## Collect Evidence

Include only relevant, redacted information:

- Exact command and full error output.
- `@agent-html/ahtml` version.
- Node and npm versions.
- OS and shell.
- Minimal `.agent.html` or composition JSON that reproduces the issue.
- Expected behavior and actual behavior.
- Results from `ahtml status` and `ahtml doctor`.
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
https://github.com/Sayhi-bzb/Agent-HTML-Sandbox/issues
```

Only run `gh issue create`, open a browser, or use network tooling when the user explicitly asks to submit the issue.
