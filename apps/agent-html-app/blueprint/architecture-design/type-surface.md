# Type Surface

本文件定义 `agent-html-app` v1 必须固定的共享类型面。命名为建议命名，实际代码可按语言习惯细化，但语义不得漂移。

## Session Types

### SessionStatus

```txt
'draft' | 'dirty' | 'building' | 'error' | 'ready'
```

### SessionSummary

```txt
id
name
directory
status
pinned
updatedAt
lastBuildAt?
hasPreview
```

### SessionDetail

```txt
summary: SessionSummary
sourcePath
previewPath?
logDirectory
chatPath
currentView
```

## Workbench Types

### WorkbenchView

```txt
'preview' | 'source' | 'inspect'
```

### DiagnosticItem

```txt
id
severity
message
source
line?
column?
endLine?
endColumn?
code?
```

### BuildRunSummary

```txt
runId
sessionId
startedAt
finishedAt?
status
exitCode?
stdoutPath?
stderrPath?
previewPath?
```

### InspectSnapshot

```txt
sessionId
generatedAt
diagnostics[]
structureSummary
lastBuild?: BuildRunSummary
```

## Agent Shell Types

### AgentShellMessage

```txt
id
role
createdAt
text
kind
proposalSnapshot?
```

v1 允许的 `role` 仅需支持：`system`、`user`、`placeholder`。

v1 允许的 `kind` 仅需支持：`message`、`context-card`、`proposal-placeholder`。

当 `kind = proposal-placeholder` 时，消息可选地携带 `proposalSnapshot`，用于把当前
source/draft 与 proposal 生成时的 source 快照做比较。该快照只服务于本地 review
和 compare，不成为新的真相源。

## Error Types

### AppErrorCode

```txt
'ui-validation'
'session-io'
'cli-launch'
'build-failed'
'inspect-failed'
'preview-missing'
```

### AppError

```txt
code
message
details?
sessionId?
runId?
```

## Command Result Conventions

所有跨 Rust / TSX 命令返回值都应满足：

- 成功时返回结构化对象，而不是裸文本。
- 失败时返回可映射到 `AppErrorCode` 的结构化错误。
- `stdout`、`stderr` 和日志路径应与 build / inspect 结果解耦，而不是塞进单一字符串。
