# ahtml Install And Runtime

Use this when the user wants to install `ahtml`, prepare the runtime, repair it, or isolate it.

## Mental model

`ahtml` is the tool that renders semantic `.agent.html` into HTML artifacts.

Default runtime home:

```txt
~/.ahtml
```

Windows equivalent:

```txt
%USERPROFILE%\.ahtml
```

Set `AHTML_HOME` only when a task needs an isolated runtime.

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

For non-interactive setup, use:

```bash
ahtml setup --yes
```

## Runtime repair

The normal entrypoint is `ahtml`. Use explicit repair only when needed:

```bash
ahtml setup --force
```

`ahtml setup --preset`, `ahtml setup --components`, and `ahtml setup --component-source shadcn-cli` configure the managed runtime under `.ahtml`; they do not configure the current project.

Do not use removed project-local commands or flags such as `init`, `--template`, `--apply`, or `--scaffold`.

## After install

For a normal artifact workflow:

```bash
ahtml prompt
```

Then write `.agent.html`, and build or preview it.

For runtime diagnostics:

```bash
ahtml doctor
```
