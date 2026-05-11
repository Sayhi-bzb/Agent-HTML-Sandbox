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
npm install ahtml
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
ahtml init
```

Use a specific shadcn template or preset:

```bash
ahtml init --template vite --preset base-nova
```

Rerun shadcn setup in an existing project:

```bash
ahtml init --apply
```

Preview without writing:

```bash
ahtml init --dry-run
```

Fallback only, for environments where shadcn CLI cannot be used:

```bash
ahtml init --scaffold
```

Do not present `--scaffold` as the main path. It writes a minimal local Vite + shadcn scaffold without delegating to shadcn.

## After Init

Run:

```bash
ahtml status
ahtml doctor
ahtml schema --format prompt
```

If `status` prints a `Next:` command, follow that command before building.
