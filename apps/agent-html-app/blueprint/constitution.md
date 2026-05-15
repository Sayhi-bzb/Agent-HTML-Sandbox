# agent-html-app Constitution

本章程规定 `agent-html-app` 的产品定位、架构边界和长期约束。

## Product North Star

`agent-html-app` 是围绕 `ahtml` session 的本地优先桌面工作台。

用户在这里写 `source.agent.html`、构建 artifact、检查 diagnostics、回看日志，并为未来的 agent 协作保留清晰插槽。

它不是通用笔记软件，不是聊天产品，也不是把 CLI 粗暴塞进桌面壳。

## 1. Local-first

应用的基本工作流必须能在本地完成。

创建 session、编辑 source、运行 build、查看 preview 和 inspect 不应依赖云端服务。

## 2. Source-of-truth Discipline

`source.agent.html` 是 session 的唯一可编辑真相源。

`Preview`、`Inspect`、日志、未来的 agent proposal 都只能派生自 source 或 build 输出，不能绕开 source 成为新的主数据。

## 3. Inspectable by Default

用户必须能看见 session 文件、build 输出、diagnostics 和日志。

系统应优先采用透明文件结构和可解释状态，而不是黑箱缓存。

## 4. Fast Workbench

交互应借鉴 Zed 的响应速度和 Notion 的阅读清晰度。

布局、状态和快捷操作都应服务于快速切换 session、快速诊断和快速回到 source。

## 5. Agent as Collaborator, Not Controller

右侧 `Agent Shell` 是协作入口，不是主控制器。

未来接入 agent 时，agent 只能提交 proposal、patch 或建议，不能越过用户直接替换 session 真相源。

## 6. Stable CLI Boundary

应用通过稳定 CLI 边界集成 `@agent-html/ahtml`。

禁止直接依赖或导入 `agent-html` 仓库内部的 `src/cli`、`src/config` 或 `src/engine` 源码实现。

## 7. File-backed Sessions

v1 的 session 必须以目录和文件为持久化基础，而不是数据库优先。

这样可以保证备份、迁移、调试和人工恢复都简单可控。

## 8. Preview Is a Build Artifact

`Preview` 显示最近一次成功构建的正式 artifact。

预览刷新应由显式 build 驱动；编辑中的轻量校验不应伪装成正式 preview 成功。

## 9. Lightweight v1

v1 应优先打通 `Source -> Build -> Preview -> Inspect` 主闭环。

不要在 v1 同时引入真正可用的 agent provider、块编辑器、数据库同步或双端发布等高耦合系统。
