# Tauri to ahtml CLI Contract

## Parties

调用方：Tauri / Rust 任务层。

被调用方：`ahtml` CLI。

## Purpose

通过稳定命令行边界编排 `ahtml` 的 build、inspect、doctor 等能力，而不穿透 `agent-html` 内部实现。

## Supported Commands

v1 至少支持：

- `ahtml build <source.agent.html> --format json`
- `ahtml inspect --input <source.agent.html> --format json`
- `ahtml doctor --format json`

是否调用 `prompt` 由后续功能决定，不作为当前最小闭环前提。

## Inputs

Rust 层需要为每次调用准备：

- source 文件绝对路径。
- session 工作目录。
- 必要的环境变量。
- 超时与取消上下文。

## Outputs

Rust 层应从 CLI 获取：

- 退出码。
- stdout。
- stderr。
- JSON 结果或解析失败信号。
- artifact 输出路径或缺失信号。

## Success Signal

- 退出码为成功。
- JSON 输出可解析。
- build 成功时能定位 preview 入口。
- inspect 成功时能生成 `InspectSnapshot`。

## Error Signal

- 可执行文件不存在。
- 命令启动失败。
- 命令超时或被取消。
- JSON 输出无效。
- build / inspect 退出码非零。

## Stability Rules

- CLI 是稳定边界；Rust 不得 import `agent-html` 内部源码。
- Rust 层负责把 CLI 输出转为 app 内部结构化类型。
- CLI 侧日志与错误文本必须被保留下来，供 `Inspect` 回看。

## Non-responsibilities

该 contract 不负责：

- 前端视图布局。
- session 列表状态。
- 未来 agent patch 应用逻辑。
