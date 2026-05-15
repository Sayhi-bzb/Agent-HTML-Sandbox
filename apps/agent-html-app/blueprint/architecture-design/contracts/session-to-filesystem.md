# Session to Filesystem Contract

## Parties

调用方：session 持久化层。

被调用方：本地文件系统。

## Purpose

定义 v1 session 如何稳定映射为目录和文件，以保证可备份、可迁移、可恢复。

## Directory Layout

每个 session 使用独立目录：

```txt
session/
  source.agent.html
  session.json
  chat.jsonl
  build/
  logs/
```

## File Roles

- `source.agent.html`: 唯一主文档。
- `session.json`: session 元数据与 UI 偏好。
- `chat.jsonl`: 右栏壳层消息占位数据。
- `build/`: 最近一次成功 build 的 artifact 输出。
- `logs/`: build / inspect 的 stdout、stderr 和 run 记录。

## Inputs

持久化层需要支持：

- 创建 session 目录骨架。
- 读取 session 元数据。
- 写入 source。
- 写入聊天占位记录。
- 写入 build 输出与日志。

## Outputs

输出为：

- 标准目录结构。
- 可重建的 session 元数据。
- 可读的 build / inspect 日志文件。

## Success Signal

- 新 session 可立即打开。
- source 持久化后可重新加载。
- 成功 build 后 `build/` 中存在可展示 preview 入口。
- 单独拷贝 session 目录后仍可恢复。

## Error Signal

- 目录创建失败。
- 文件权限不足。
- 元数据损坏。
- build 目录缺少 preview 入口。

## Stability Rules

- 目录骨架一经创建，不因普通状态切换而改变。
- `build/` 只代表最近一次成功 build 的正式输出。
- `logs/` 应保留最近任务的错误上下文，便于人工检查。

## Non-responsibilities

该 contract 不负责：

- 决定 UI 如何显示状态。
- 定义 agent provider 协议。
- 管理跨设备同步。
