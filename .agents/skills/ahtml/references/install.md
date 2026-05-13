# ahtml Install And Runtime

Use this when the user asks to install, check, repair, or isolate `ahtml`.

## Mental Model

`ahtml` is the runtime for turning semantic `.agent.html` into portable HTML artifacts. It is used when agent output needs to be easier to read, share, and round-trip than long Markdown.

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
ahtml setup
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
ahtml setup --yes
ahtml status
ahtml doctor
```

## Runtime Repair

Runtime setup is guided by `ahtml setup`. Runtime-aware commands can still install defaults automatically. To force repair, run:

```bash
ahtml setup --force
```

Do not use removed project-local commands or flags such as `init`, `--template`, `--apply`, or `--scaffold`. `ahtml setup` may read shadcn component and preset metadata from shadcn APIs, then uses shadcn CLI inside the managed runtime. `ahtml setup --preset`, `ahtml setup --components`, and `ahtml setup --component-source bundled` configure the managed runtime under `.ahtml`; they do not configure the current project.

## After Install

Run:

```bash
ahtml status
ahtml doctor
ahtml schema --format prompt
```

If `status` prints a `Next:` command, follow that command before building.
