# UI to Session Store Contract

## Parties

调用方：React UI。

被调用方：前端 session store 与其对应的 Tauri 数据访问层。

## Purpose

为左栏 `Sessions` 和中栏 `Workbench` 提供统一的 session 读取、选择和状态更新入口。

## Inputs

支持以下操作输入：

- 列出全部 session。
- 创建 session。
- 打开指定 session。
- 更新当前视图。
- 保存 source 文本。
- 标记 pin / unpin。

## Outputs

返回结构化状态对象：

- `SessionSummary[]`
- `SessionDetail`
- `WorkbenchView`
- 保存结果与更新时间

## Success Signal

- UI store 中的当前 session 与磁盘状态一致。
- 左栏状态与中栏视图切换同步。
- 保存 source 后 session 进入 `dirty` 或保持更高优先级状态。

## Error Signal

- session 不存在。
- session 目录损坏。
- source 保存失败。
- 当前视图不合法。

## Stability Rules

- UI 不直接访问文件系统。
- UI 只通过 store 暴露的数据结构渲染。
- store 应把持久化细节隐藏在 Tauri 命令层后面。

## Non-responsibilities

该 contract 不负责：

- 调用 `ahtml` CLI。
- 生成 preview。
- 解释 build 日志。
