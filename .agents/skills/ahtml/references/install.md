# ahtml Install And Runtime

Use this when the user wants to install `ahtml`, prepare the managed runtime, repair it, or isolate it.

## Normal install

For a published package:

```bash
npm install -g @agent-html/ahtml
ahtml
```

Use the same npm package with other package managers:

```bash
pnpm add -g @agent-html/ahtml
yarn global add @agent-html/ahtml
bun add -g @agent-html/ahtml
```

For local repository development:

```bash
npm install
npm link
ahtml
```

Managed runtime home:

```txt
~/.ahtml
%USERPROFILE%\.ahtml
```

Set `AHTML_HOME` only when the task needs an isolated runtime.

Non-interactive setup:

```bash
ahtml setup --yes
```

## Runtime repair

Force a runtime rewrite only when needed:

```bash
ahtml setup --force
```

`ahtml setup --preset`, `ahtml setup --components`, and `ahtml setup --component-source shadcn-cli` configure the managed runtime under `.ahtml`; they do not configure the current project.

Do not use removed project-local scaffold flows such as `init`, `--template`, `--apply`, or `--scaffold`.

## After install

```bash
ahtml prompt
ahtml build artifact.agent.html
```
