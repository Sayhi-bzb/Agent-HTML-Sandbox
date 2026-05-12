# ahtml Install And Runtime

Use this when the user asks to install, check, repair, or isolate `ahtml`.

## Mental Model

`ahtml` is an agent artifact runtime. It validates agent-html input and renders portable static output through a shadcn-backed managed runtime.

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
ahtml status
ahtml doctor
```

## Runtime Repair

Runtime setup is automatic for normal commands. To force repair, run a runtime-aware command with the desired `AHTML_HOME`:

```bash
ahtml status
ahtml doctor
```

Do not use removed project-local commands or flags such as `init`, `--template`, `--preset`, `--components`, `--apply`, or `--scaffold`.

## After Install

Run:

```bash
ahtml status
ahtml doctor
ahtml schema --format prompt
```

If `status` prints a `Next:` command, follow that command before building.
