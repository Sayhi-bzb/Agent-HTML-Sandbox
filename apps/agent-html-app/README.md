# agent-html-app

Local-first desktop workbench for `ahtml` sessions.

## Current v1 surface

- Session rail with search, pin, rename, delete, and create
- Three-panel workbench: `Preview`, `Source`, `Inspect`
- Session-backed agent shell placeholder with persisted `chat.jsonl`
- Explicit `Build` and `Inspect` flows through the `ahtml` CLI
- Lightweight source validation in `Source` without triggering a full build
- File-backed session storage under the app data directory

## Stack

- `Tauri 2`
- `Rust`
- `React 19`
- `TypeScript`
- `Vite`

## Development

Install workspace dependencies from the monorepo root:

```bash
npm install
```

Run the frontend workbench from the monorepo root:

```bash
npm run app:dev
```

Run the desktop app from `apps/agent-html-app` against the monorepo-local `ahtml` CLI:

```powershell
cd apps/agent-html-app
$env:AHTML_CLI='node'
$env:AHTML_CLI_SCRIPT=(Resolve-Path ..\..\bin\ahtml.mjs).Path
npm run tauri dev
```

## Verification

```bash
npm run app:build
```

```bash
npm run app:check
```
