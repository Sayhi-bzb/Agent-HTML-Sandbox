# ahtml Install And Init

Use this when the user asks to install, initialize, or isolate `ahtml`.

## Mental Model

`ahtml` is an agent artifact runtime. It validates agent-html input and renders portable static output through a managed runtime.

Default runtime home:

```txt
~/.ahtml
```

Windows equivalent:

```txt
%USERPROFILE%\.ahtml
```

Set `AHTML_HOME` only when a task needs an isolated runtime.

## Normal Setup

For a published package:

```bash
npm install -g @agent-html/ahtml
ahtml init
ahtml status
ahtml doctor
```

Use the same npmjs.com package with other package managers:

```bash
pnpm add -g @agent-html/ahtml
yarn global add @agent-html/ahtml
bun add -g @agent-html/ahtml
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

Preview without writing:

```bash
ahtml init --dry-run
```

Do not use old project-local flags such as `--template`, `--preset`, `--components`, `--apply`, or `--scaffold`.

## After Init

Run:

```bash
ahtml status
ahtml doctor
ahtml schema --format prompt
```

If `status` prints a `Next:` command, follow that command before building.
