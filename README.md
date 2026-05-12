# agent-html

agent-html is a local CLI engine for producing safe, inspectable static artifacts from a constrained agent-facing document format.

Docs: [agent-html.pages.dev/docs](https://agent-html.pages.dev/docs)

## Quick Start

Install the published CLI globally:

```bash
npm install -g @agent-html/ahtml
ahtml setup
ahtml status
ahtml doctor
ahtml schema --format prompt
```

Use the same npmjs.com package with your package manager:

| Package manager | Install                             | Run `ahtml` |
| --------------- | ----------------------------------- | ----------- |
| npm             | `npm install -g @agent-html/ahtml`  | `ahtml`     |
| pnpm            | `pnpm add -g @agent-html/ahtml`     | `ahtml`     |
| yarn            | `yarn global add @agent-html/ahtml` | `ahtml`     |
| bun             | `bun add -g @agent-html/ahtml`      | `ahtml`     |

Install the agent skill:

```bash
npx skills add Sayhi-bzb/Agent-HTML --skill ahtml
```

Create `artifact.agent.html`:

```html
<meta-agent
  theme="neutral"
  density="comfortable"
  tone="report"
  width="article"
/>

<page title="Review">
  <card title="Summary">
    This artifact was written with standard agent-html components.
  </card>
</page>
```

Validate, build, preview, and inspect:

```bash
ahtml validate --input artifact.agent.html
ahtml build --input artifact.agent.html --out dist/html
ahtml preview --input artifact.agent.html --out dist/html --port 4173
ahtml inspect --input artifact.agent.html
```

Open the preview URL printed by `ahtml preview` to review the output.

## CLI Commands

```bash
ahtml schema [--format prompt|json] [--out <path>]
ahtml setup [--yes] [--force] [--ui shadcn] [--component-source bundled|shadcn-cli] [--preset <name|custom>] [--components <list|all>]
ahtml validate --input <path>
ahtml build --input <path> [--out <dir>]
ahtml inspect --input <path>|--dir <dir> [--format summary|json]
ahtml status
ahtml doctor
ahtml preview --input <path> [--out <dir>] [--port <port>]
ahtml config get
```

Defaults:

- Runtime home: `~/.ahtml` or `%USERPROFILE%\.ahtml`
- Runtime renderer: internal shadcn-backed React/Vite renderer
- Runtime setup: `ahtml setup` uses shadcn CLI by default; runtime-aware commands use bundled defaults when they must repair non-interactively
- Runtime override: `AHTML_HOME`
- Document: `artifact.agent.html`
- Build output: `dist/html`

`ahtml status` and `ahtml doctor` can show a non-blocking package update hint. Set `AHTML_NO_UPDATE_CHECK=1` to disable that check.

## Rules

- `ahtml setup` guides managed runtime installation and defaults to shadcn CLI as the component source. `ahtml status`, `ahtml doctor`, `ahtml build`, and `ahtml preview` can bootstrap or repair it automatically with bundled defaults when no guided setup has run.
- shadcn/ui is an internal renderer implementation detail; do not initialize shadcn in the current project for normal `ahtml` use.
- Treat `ahtml schema --format prompt` as the source of truth.
- Use only registered agent-html components, props, children, and render config values.
- Do not write Tailwind classes, `className`, `style`, CSS, scripts, event handlers, shadcn props, Radix props, arbitrary HTML attributes, external resource passthrough, or raw HTML.

## More

- [Quick Start](https://agent-html.pages.dev/docs)
- [Best Practice](https://agent-html.pages.dev/docs/best-practice)
- [Examples](https://agent-html.pages.dev/docs/example)
