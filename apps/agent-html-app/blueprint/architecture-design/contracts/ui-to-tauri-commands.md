# UI to Tauri Commands Contract

## Parties

调用方：React / TSX 前端。

被调用方：Tauri command 层。

## Purpose

将 UI 动作映射为稳定的桌面命令接口，避免前端直接承担文件系统、进程管理和日志细节。

## Command Surface

首批命令建议固定为：

- `list_sessions()`
- `create_session(input)`
- `open_session(session_id)`
- `save_source(session_id, source)`
- `run_build(session_id)`
- `run_inspect(session_id)`
- `read_preview_index(session_id)`
- `read_logs(session_id, run_id?)`

## Inputs

输入必须是结构化参数，至少包含：

- `session_id`
- `source`
- `view`
- 可选 `run_id`

## Outputs

输出必须是结构化结果对象，至少覆盖：

- `SessionSummary[]`
- `SessionDetail`
- `BuildRunSummary`
- `InspectSnapshot`
- `PreviewHandle`
- `AppError`

## Success Signal

- 命令返回结构化成功对象。
- 长任务状态可被 UI 感知。
- build 和 inspect 的结果能被 `Preview` 与 `Inspect` 直接消费。

## Error Signal

- CLI 不存在或无法启动。
- session 文件无法读取。
- build / inspect 失败。
- 预览索引文件缺失。

## Stability Rules

- 不返回只适合人阅读的裸文本作为主结果。
- 所有失败都映射到统一 `AppErrorCode`。
- 命令层负责路径规范化与平台差异吸收。

## Non-responsibilities

该 contract 不负责：

- UI 组件状态管理。
- 编辑器内部选择状态。
- 真实 agent provider 通信。
