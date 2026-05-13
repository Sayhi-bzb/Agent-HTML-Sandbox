# agent-html Roadmap

本轮目标：先修正 runtime 底座，再继续推进 schema、renderer 和 artifact 验证。

```txt
shadcn template / init / registry
  -> shadcn-native managed runtime
  -> ahtml renderer injection
  -> capability schema
  -> .agent.html
  -> shadcn/native artifact
```

## Phase 1: Stop Local Runtime Expansion

- 停止扩展 package-local shadcn 组件副本。
- 停止用手写 CSS、补丁 CSS、截断 CSS 修视觉问题。
- 把现有 `runtime-template` 视为迁移债，不作为目标架构继续扩展。

Done when:

- 新增 UI 能力不再通过复制 shadcn 组件或补写 shadcn CSS 实现。

## Phase 2: Build Shadcn-Native Runtime

- runtime 初始化必须走 shadcn template / init / registry。
- shadcn 负责 `components.json`、CSS、base layer、Tailwind entry、依赖、组件源码、style、base、iconLibrary。
- ahtml 只注入 renderer app、capability data、sanitized document、diagnostics、build / preview wiring。
- `shadcn add` 只用于安装 required registry items，不作为完整初始化。

Done when:

- 从零创建的 managed runtime 不依赖 package-local shadcn UI kit 或手写 shadcn CSS。

## Phase 3: Add Runtime Completeness Checks

- `status` / `doctor` 检查 shadcn runtime 是否完整。
- 检查 `components.json`、CSS entry、base layer、Tailwind entry、required registry items、required exports、style、base、iconLibrary。
- 检查 built CSS 是否包含 shadcn base surface，避免 DOM 已渲染但视觉偏离 shadcn。

Done when:

- “组件 DOM 存在但 shadcn 视觉不对”会变成明确诊断错误。

## Phase 4: Reconnect Schema And Renderer

- prompt schema 只暴露可渲染能力。
- `<ui>` / `<slot>` 作为通用协议主线。
- semantic tags 只能作为 sugar，必须归一到同一 capability model。
- 移除的自定义控件不回到 schema，除非作为真实 shadcn-backed capability 重新接入。

Done when:

- agent 按 prompt schema 写出的组件都有明确 renderer capability。

## Phase 5: Remove Old Runtime Debt

- 移除 package-local shadcn UI kit 作为主路径。
- 移除手写 shadcn CSS / pseudo template 作为主路径。
- 如需短期 fallback，必须默认关闭、可诊断、可删除。

Done when:

- 删除旧 shadcn 组件副本和手写 CSS 不会破坏 runtime source of truth。

## Phase 6: Verify End To End

- build / preview 使用同一 renderer path。
- 样例 artifact 必须有真实 shadcn/native DOM、完整 shadcn CSS、正确视觉。
- tabs / accordion 保持真实交互；无 JS 时内容仍可读。
- static artifact 仍是默认交付形态。

Done when:

- 从零安装到生成 artifact 的完整流程可复现，并且视觉来自 shadcn-native runtime。

## Phase 7: Expand Through The Generic Path

- 新组件只通过 capability data、safe props、slot rules、runtime requirements、doctor checks、artifact tests 接入。
- 不为单个 shadcn 组件新增手写 adapter，除非明确记录为临时例外。
- button、toggle group、slider、textarea、progress、checkbox、forms 等未来能力必须作为 shadcn-backed 或明确 native capability 返回。

Done when:

- 扩展组件目录不会重新长出第二套 ahtml UI framework。
