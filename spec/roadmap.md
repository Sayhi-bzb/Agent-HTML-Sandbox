# ahtml Managed Runtime Roadmap

本文记录 `ahtml` 从 project-local integration 重构为全局 managed runtime 的路线。重构完成后不保留旧 project-local 架构兼容路径。

## Product Direction

`ahtml` 是 agent artifact runtime。

默认用户故事是：

```txt
user asks for an artifact
        ↓
agent writes agent-html
        ↓
ahtml validates and renders in an isolated runtime
        ↓
user receives portable static HTML
```

`ahtml` 不是前端库、shadcn 模板生成器或业务 repo 接入器。

当前工作目录默认只承载输入和输出：

- composition input
- `.agent.html`
- static artifact output

renderer、generated runtime files、cache、logs 和 runtime config 默认收纳到用户级 `.ahtml`。当前工作目录不是 frontend project scaffold 目标。

## Runtime Layout

默认 runtime root：

```txt
~/.ahtml
```

Windows 等价：

```txt
%USERPROFILE%\.ahtml
```

环境变量覆盖：

```txt
AHTML_HOME
```

建议目录结构：

```txt
~/.ahtml/
  runtime/
  cache/
  logs/
  config/
```

## Phase 0: Spec And Vocabulary Reset

目标：先统一产品边界和术语，再迁移实现。

工作项：

- 使用 `managed runtime` 表示用户级隔离渲染环境。
- 使用 `runtime root` 表示 `.ahtml` 根目录。
- 使用 `portable artifact` 表示最终静态交付物。
- 使用 `removed project mode` 表示已删除的旧架构。
- 不再把 `project integration` 作为默认路径名称。
- 不引入 `--local-project`、`--scaffold`、`--apply` 等兼容开关。

验收：

- blueprint、spec、README、docs-web 和 ahtml skill 的默认路径术语一致。
- 旧 project-local 术语只出现在 migration history 或 forbidden 语境。

## Phase 1: Runtime Path And Config

目标：让 CLI 先认识 managed runtime，而不是先检查当前 repo。

工作项：

- 新增 runtime path resolver。
- resolver 优先使用 `AHTML_HOME`。
- 未设置 `AHTML_HOME` 时使用 `os.homedir()/.ahtml`。
- 引入 `AhtmlRuntimeConfig`。
- 将默认 readiness 从 `agent-html.project.json` / `components.json` / Vite config 改为 runtime readiness。
- `status` 显示 runtime、output writability 和 package update 状态。
- `doctor` 诊断 runtime root、runtime config、renderer adapter、package root 和 output path。

验收：

- 空目录运行 `ahtml status` 不再提示初始化当前项目。
- 空目录运行 `ahtml doctor` 不要求存在 `components.json` 或 Vite config。
- `AHTML_HOME` 指向临时目录时，status / doctor 使用该目录。

## Phase 2: Managed Runtime Bootstrap

目标：移除当前工作目录 scaffold，并由 managed runtime 收纳渲染状态。

工作项：

- runtime bootstrap 生成 runtime manifest、runtime directories 和 generated document 文件。
- `ahtml init` 默认初始化或修复 managed runtime。
- `build` / `preview` 首次运行可以自动 bootstrap。
- bootstrap 失败时输出明确修复命令。

验收：

- 空 repo 中运行 `ahtml init` 不生成 `src/`、`components.json`、`vite.config.ts`。
- 空 repo 中运行 `ahtml build --input artifact.agent.html --out dist/html` 不生成项目 scaffold 文件。
- runtime 文件只出现在 `.ahtml` 下。

## Phase 3: Build And Preview Rewire

目标：默认 build / preview 通过 managed runtime 生成 portable artifact。

工作项：

- `build` 读取当前工作目录中的 input。
- `build` 将 sanitized document 写入 runtime generated document。
- renderer 在 managed runtime 边界内执行。
- build output 写入用户指定 `--out`。
- `preview` 继续服务 build 产物。
- `preview` 不启动独立 renderer。
- `inspect --dir` 继续读取 artifact metadata。

验收：

- 全局安装后可以在任意目录 build artifact。
- 当前目录只新增用户指定 output。
- `preview` 服务的内容与 `build` 输出一致。
- `inspect --dir` 对 managed runtime build 产物可用。

## Phase 4: Remove Project Mode

目标：删除旧 project-local 能力，不留下兼容开关。

工作项：

- 删除 `src/config/project.mjs`。
- 删除 `src/cli/scaffold.mjs`。
- 删除 `init --template`、`--preset`、`--components`、`--out`、`--scaffold`、`--apply`。
- 删除 `agent-html.project.json` readiness。
- 默认 `status` / `doctor` 不再以 project config 判断 readiness。
- `build` 不读取当前目录的 Vite、React、Tailwind、shadcn 或 renderer adapter。

验收：

- 默认命令不污染当前 repo。
- 没有 `--local-project` 或等价兼容模式。
- 旧项目配置不会参与 managed runtime 默认路径。

## Phase 5: Docs, Skill, And Pack Verification

目标：发布前把外部入口全部切到 managed runtime 心智。

工作项：

- README 主推全局安装：

```bash
npm install -g @agent-html/ahtml
ahtml build --input artifact.agent.html --out dist/html
```

- docs-web quick start 使用 managed runtime。
- ahtml skill install / usage / debug references 使用 managed runtime。
- bug-reporting 收集 runtime root、`AHTML_HOME`、status 和 doctor 输出。
- packed verification 改为 empty consumer directory workflow。
- packed verification 断言 consumer dir 不出现 project scaffold 文件。

验收：

- `npm run verify:pack` 在空 consumer dir 中完成 compose、validate、build、inspect、preview。
- consumer dir 不出现 `src/`、`vite.config.ts`、`components.json`、`agent-html.project.json`。
- docs 不再把 project-local setup 当作 happy path。

## Public Interface Changes

`ahtml init`：

- 新默认语义：初始化或修复 managed runtime。
- 不默认写当前工作目录。

`ahtml status`：

- 新默认语义：显示 runtime readiness、output writability 和 package update。

`ahtml doctor`：

- 新默认语义：诊断 runtime、package、config 和 output path。

`ahtml build` / `ahtml preview`：

- 默认使用 managed runtime。
- 不要求当前目录存在 Vite/shadcn 项目。

## Test Plan

Unit tests：

- runtime path resolver honors `AHTML_HOME`。
- runtime path resolver falls back to `~/.ahtml`。
- status / doctor do not require current-directory project files。
- build writes generated document into runtime。
- build writes artifact output to user-selected `--out`。
- old project-local flags are rejected。

Pack verification：

- installed package builds artifact in an empty consumer dir。
- consumer dir does not receive `src/`、`vite.config.ts`、`components.json`、`agent-html.project.json`。
- preview serves the same static output produced by build。

Documentation checks：

```bash
npm run docs:lint
npm run format:check:source
```

Release readiness:

```bash
npm run check:ready
npm run docs:web:check
```

## Assumptions

- `spec/roadmap.md` is the single active roadmap.
- managed runtime is the default path.
- old project-local integration is removed, not retained as advanced compatibility.
- runtime dependency installation can initially use npm inside `.ahtml/runtime`.
- package manager abstraction for runtime installation can come later.
- code migration happens after this roadmap is reviewed.
