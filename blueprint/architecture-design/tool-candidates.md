# agent-html Tool Candidates

本文记录 agent-html 的候选工具。正式架构以 `architecture.md` 为准。

本文件不承载架构决策，只用于后续依赖评估。

## UI Implementation Base

候选工具：

- Vite
- React
- TypeScript
- Tailwind
- shadcn/ui
- Radix UI
- lucide-react
- class-variance-authority
- clsx
- tailwind-merge

定位：

- shadcn/ui 是标准组件的实现底座。
- shadcn-backed theme / density / layout preset 可作为 render config profile 来源。
- Tailwind 可作为组件内部样式工具，不作为 agent-facing 主接口。
- Radix UI 可承担可访问交互 primitive。
- variant 和 class 合并逻辑应封装在组件内部。

## Component Schema Generation

候选工具：

- react-docgen-typescript
- TypeDoc
- ts-morph
- TSDoc / JSDoc
- Storybook

定位：

- standardized component schema 是 agent-facing 组件能力来源。
- render config schema 可作为 presentation profile 信息来源。
- `.d.ts` 和 TSDoc 可作为 schema 维护辅助材料。
- schema 只暴露用途、props、slots、组合关系和使用禁忌。
- Storybook 可作为人类组件工作台，暂不作为 v1 主 schema 来源。

## agent-html Parsing and Safety

候选工具：

- parse5
- rehype / hast
- rehype-sanitize
- DOMPurify

定位：

- 解析 agent-html 为可检查结构。
- 校验 render config header 为有限 key / value 枚举。
- 限制不透明脚本、危险属性和不受控外部资源。
- 支持必要 escape hatch，但默认收束自由度。

## Artifact Components

候选工具：

- Shiki
- Mermaid
- TanStack Table
- dnd-kit
- Recharts

定位：

- Shiki 支持代码和 diff 表达。
- Mermaid 支持流程图、时序图和架构图。
- TanStack Table 支持复杂表格。
- dnd-kit 支持排序、分组和拖拽协作。
- Recharts 支持常见数据可视化。

## Portable Output

候选工具：

- vite-plugin-singlefile
- Vite static build

定位：

- 开发阶段可使用 Vite app。
- 交付阶段优先生成静态 artifact。
- portable 输出应减少运行条件和部署依赖。
