# Contracts Index

本目录定义 `agent-html-app` 的跨层稳定 contract。

## Contracts

- `ui-to-session-store.md`: 左栏与工作台如何读取和更新 session。
- `ui-to-tauri-commands.md`: 前端如何调用 Tauri 命令桥。
- `tauri-to-ahtml-cli.md`: Rust 如何调用 `ahtml` CLI。
- `session-to-filesystem.md`: session 如何映射到目录和文件。

## Contract Rule

每份 contract 都必须说明：

- 调用方与被调用方。
- 输入。
- 输出。
- 成功信号。
- 错误信号。
- 稳定性要求。
- 不负责的内容。
