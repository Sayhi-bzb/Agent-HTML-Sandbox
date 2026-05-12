# ahtml Install And Init

Use this when the user asks to install, initialize, or connect `ahtml` to a local project.

## Mental Model

`ahtml` is the engine/config/CLI package. The user's project supplies Vite + React + Tailwind + shadcn/ui.

Default `ahtml init` delegates user-local setup to shadcn, then writes ahtml integration files:

- `agent-html.project.json`
- `src/agent-html/renderer-adapter.tsx`
- `src/agent-html/document.generated.ts`
- `src/main.tsx`

## Normal Setup

For a published package:

```bash
npm install @agent-html/ahtml
npx ahtml init
npx ahtml status
npx ahtml doctor
```

For local repository development:

```bash
npm install
npm link
ahtml init
ahtml status
ahtml doctor
```

## Init Options

Use defaults first:

```bash
npx ahtml init
```

Use a specific shadcn template or preset:

```bash
npx ahtml init --template vite --preset nova
```

Rerun shadcn setup in an existing project:

```bash
npx ahtml init --apply
```

Preview without writing:

```bash
npx ahtml init --dry-run
```

Fallback only, for environments where shadcn CLI cannot be used:

```bash
npx ahtml init --scaffold
npm install
npx ahtml init --apply
npx ahtml doctor
```

Do not present `--scaffold` as the main path. It writes a minimal local Vite + shadcn scaffold without delegating to shadcn. The generated scaffold still needs its project dependencies installed before build or preview can run.

## After Init

Run:

```bash
npx ahtml status
npx ahtml doctor
npx ahtml schema --format prompt
```

If `status` prints a `Next:` command, follow that command before building.
