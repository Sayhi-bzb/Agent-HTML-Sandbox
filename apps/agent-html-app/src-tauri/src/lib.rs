mod chat_store;
mod inspect_payload;
mod session_store;

use camino::{Utf8Path, Utf8PathBuf};
use fs_err as fs;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::env;
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};
use thiserror::Error;
use time::format_description::well_known::Rfc3339;
use time::OffsetDateTime;
use tracing::{info, info_span};
use chat_store::{
    append_chat_message_to_file, default_chat_messages, read_chat_messages,
    write_chat_messages,
};
use inspect_payload::{
    diagnostics_from_inspect_payload, diagnostics_from_validation_payload,
    structure_summary_from_inspection_value,
    structure_summary_from_validation_payload,
};
use session_store::{
    load_session_detail_from_dir, read_session_record, update_session_view_record,
    write_session_record,
};

const SOURCE_FILE_NAME: &str = "source.agent.html";
const SESSION_FILE_NAME: &str = "session.json";
const CHAT_FILE_NAME: &str = "chat.jsonl";
const BUILD_DIR_NAME: &str = "build";
const LOGS_DIR_NAME: &str = "logs";

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionSummary {
    id: String,
    name: String,
    directory: String,
    status: String,
    pinned: bool,
    updated_at: String,
    last_build_at: Option<String>,
    has_preview: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionDetail {
    summary: SessionSummary,
    source_path: String,
    preview_path: Option<String>,
    last_build: Option<BuildRunSummary>,
    log_directory: String,
    chat_path: String,
    current_view: String,
    source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProposalSnapshot {
    source: String,
    line_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AgentShellMessage {
    id: String,
    role: String,
    created_at: String,
    text: String,
    kind: String,
    proposal_snapshot: Option<ProposalSnapshot>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct BuildRunSummary {
    run_id: String,
    session_id: String,
    started_at: String,
    finished_at: Option<String>,
    status: String,
    exit_code: Option<i32>,
    stdout_path: Option<String>,
    stderr_path: Option<String>,
    preview_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DiagnosticItem {
    id: String,
    severity: String,
    message: String,
    source: String,
    line: Option<u32>,
    column: Option<u32>,
    code: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct InspectSnapshot {
    session_id: String,
    generated_at: String,
    diagnostics: Vec<DiagnosticItem>,
    structure_summary: String,
    last_build: Option<BuildRunSummary>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SourceValidationSnapshot {
    session_id: String,
    validated_at: String,
    status: String,
    diagnostics: Vec<DiagnosticItem>,
    structure_summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LogSnapshot {
    stdout: Option<String>,
    stderr: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionCreateInput {
    name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionRenameInput {
    name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionPinInput {
    pinned: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionViewInput {
    view: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppendChatMessageInput {
    role: String,
    text: String,
    kind: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppError {
    code: String,
    message: String,
    details: Option<String>,
    session_id: Option<String>,
    run_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SessionRecord {
    id: String,
    name: String,
    status: String,
    pinned: bool,
    updated_at: String,
    last_build_at: Option<String>,
    #[serde(default)]
    last_build_status: Option<String>,
    #[serde(default)]
    last_build_exit_code: Option<i32>,
    #[serde(default)]
    last_build_stdout_path: Option<String>,
    #[serde(default)]
    last_build_stderr_path: Option<String>,
    has_preview: bool,
    current_view: String,
}

struct CliExecution {
    stdout_path: Utf8PathBuf,
    stderr_path: Utf8PathBuf,
    exit_code: Option<i32>,
    json: Option<Value>,
}

#[derive(Debug, Error)]
enum BackendError {
    #[error("{message}")]
    Io {
        code: &'static str,
        message: &'static str,
        #[source]
        source: std::io::Error,
    },
    #[error("{message}")]
    Json {
        code: &'static str,
        message: String,
        #[source]
        source: serde_json::Error,
    },
    #[error("{message}")]
    Message { code: &'static str, message: String },
}

impl BackendError {
    fn code(&self) -> &'static str {
        match self {
            Self::Io { code, .. } => code,
            Self::Json { code, .. } => code,
            Self::Message { code, .. } => code,
        }
    }

    fn details(&self) -> Option<String> {
        match self {
            Self::Io { source, .. } => Some(source.to_string()),
            Self::Json { source, .. } => Some(source.to_string()),
            Self::Message { .. } => None,
        }
    }

    fn session_io(message: &'static str, source: std::io::Error) -> Self {
        Self::Io {
            code: "session-io",
            message,
            source,
        }
    }

    fn cli_launch(message: &'static str, source: std::io::Error) -> Self {
        Self::Io {
            code: "cli-launch",
            message,
            source,
        }
    }

    fn preview_missing(message: &'static str, source: std::io::Error) -> Self {
        Self::Io {
            code: "preview-missing",
            message,
            source,
        }
    }

    fn json(
        code: &'static str,
        message: impl Into<String>,
        source: serde_json::Error,
    ) -> Self {
        Self::Json {
            code,
            message: message.into(),
            source,
        }
    }

    fn message(code: &'static str, message: impl Into<String>) -> Self {
        Self::Message {
            code,
            message: message.into(),
        }
    }

    fn ui_validation(message: impl Into<String>) -> Self {
        Self::message("ui-validation", message)
    }
}

impl From<BackendError> for AppError {
    fn from(error: BackendError) -> Self {
        Self {
            code: error.code().into(),
            message: error.to_string(),
            details: error.details(),
            session_id: None,
            run_id: None,
        }
    }
}

impl AppError {
    fn with_details(mut self, details: impl Into<String>) -> Self {
        self.details = Some(details.into());
        self
    }

    fn with_session(mut self, session_id: impl Into<String>) -> Self {
        self.session_id = Some(session_id.into());
        self
    }
}

#[tauri::command]
fn list_sessions(app: AppHandle) -> Result<Vec<SessionSummary>, AppError> {
    let _span = info_span!("list_sessions").entered();
    let root = ensure_sessions_root(&app)?;
    let mut sessions = Vec::new();

    let entries = fs::read_dir(root).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to read sessions directory.",
            error,
        ))
    })?;

    for entry in entries.flatten() {
        let Ok(path) = Utf8PathBuf::from_path_buf(entry.path()) else {
            continue;
        };
        if !path.is_dir() {
            continue;
        }

        if let Ok(session) = load_session_detail_from_dir(path.as_path()) {
            sessions.push(session.summary);
        }
    }

    sessions.sort_by(|left, right| {
        right
            .pinned
            .cmp(&left.pinned)
            .then_with(|| right.updated_at.cmp(&left.updated_at))
            .then_with(|| left.name.cmp(&right.name))
    });

    info!(count = sessions.len(), "loaded session summaries");
    Ok(sessions)
}

#[tauri::command]
fn create_session(app: AppHandle, input: SessionCreateInput) -> Result<SessionDetail, AppError> {
    let _span = info_span!("create_session", requested_name = %input.name).entered();
    let name = if input.name.trim().is_empty() {
        "Untitled Session".to_string()
    } else {
        input.name.trim().to_string()
    };
    let session_id = format!("session-{}-{}", slugify(&name), now_epoch_millis());
    let session_dir = ensure_sessions_root(&app)?.join(&session_id);

    fs::create_dir_all(session_dir.join(BUILD_DIR_NAME)).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to create build directory.",
            error,
        ))
        .with_session(session_id.clone())
    })?;
    fs::create_dir_all(session_dir.join(LOGS_DIR_NAME)).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to create logs directory.",
            error,
        ))
        .with_session(session_id.clone())
    })?;

    let record = SessionRecord {
        id: session_id.clone(),
        name: name.clone(),
        status: "draft".into(),
        pinned: false,
        updated_at: now_iso_stub(),
        last_build_at: None,
        last_build_status: None,
        last_build_exit_code: None,
        last_build_stdout_path: None,
        last_build_stderr_path: None,
        has_preview: false,
        current_view: "source".into(),
    };

    write_session_record(&session_dir, &record)?;
    fs::write(session_dir.join(SOURCE_FILE_NAME), default_source(&name)).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to write initial source file.",
            error,
        ))
        .with_session(session_id.clone())
    })?;
    write_chat_messages(&session_dir, &default_chat_messages())?;

    info!(session_id = %session_id, "created session");
    load_session_detail_from_dir(&session_dir)
}

#[tauri::command]
fn open_session(app: AppHandle, session_id: String) -> Result<SessionDetail, AppError> {
    let session_dir = session_dir(&app, &session_id)?;
    load_session_detail_from_dir(&session_dir)
}

#[tauri::command]
fn rename_session(
    app: AppHandle,
    session_id: String,
    input: SessionRenameInput,
) -> Result<SessionDetail, AppError> {
    let session_dir = session_dir(&app, &session_id)?;
    let mut record = read_session_record(&session_dir)?;
    let name = input.name.trim();

    if name.is_empty() {
        return Err(AppError::from(BackendError::ui_validation(
            "Session names cannot be empty.",
        ))
        .with_session(session_id));
    }

    record.name = name.to_string();
    record.updated_at = now_iso_stub();
    write_session_record(&session_dir, &record)?;
    load_session_detail_from_dir(&session_dir)
}

#[tauri::command]
fn set_session_pinned(
    app: AppHandle,
    session_id: String,
    input: SessionPinInput,
) -> Result<SessionDetail, AppError> {
    let session_dir = session_dir(&app, &session_id)?;
    let mut record = read_session_record(&session_dir)?;

    record.pinned = input.pinned;
    record.updated_at = now_iso_stub();
    write_session_record(&session_dir, &record)?;
    load_session_detail_from_dir(&session_dir)
}

#[tauri::command]
fn delete_session(app: AppHandle, session_id: String) -> Result<(), AppError> {
    let session_dir = session_dir(&app, &session_id)?;
    fs::remove_dir_all(&session_dir).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to delete the session directory.",
            error,
        ))
        .with_session(session_id)
    })
}

#[tauri::command]
fn set_session_view(
    app: AppHandle,
    session_id: String,
    input: SessionViewInput,
) -> Result<SessionDetail, AppError> {
    let session_dir = session_dir(&app, &session_id)?;
    update_session_view_record(&session_dir, &input.view, Some(session_id.clone()))?;
    load_session_detail_from_dir(&session_dir)
}

#[tauri::command]
fn save_source(
    app: AppHandle,
    session_id: String,
    source: String,
) -> Result<SessionDetail, AppError> {
    let session_dir = session_dir(&app, &session_id)?;
    let mut record = read_session_record(&session_dir)?;

    fs::write(session_dir.join(SOURCE_FILE_NAME), source).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to write source file.",
            error,
        ))
        .with_session(session_id.clone())
    })?;

    record.status = "dirty".into();
    record.updated_at = now_iso_stub();
    record.current_view = "source".into();
    write_session_record(&session_dir, &record)?;
    load_session_detail_from_dir(&session_dir)
}

#[tauri::command]
fn run_build(app: AppHandle, session_id: String) -> Result<BuildRunSummary, AppError> {
    run_build_internal(&app, &session_id)
}

#[tauri::command]
fn run_inspect(app: AppHandle, session_id: String) -> Result<InspectSnapshot, AppError> {
    let _span = info_span!("run_inspect", session_id = %session_id).entered();
    let session_dir = session_dir(&app, &session_id)?;
    let mut record = read_session_record(&session_dir)?;
    let ahtml_home = ensure_ahtml_home(&app)?;
    let logs_dir = session_dir.join(LOGS_DIR_NAME);
    let source_path = session_dir.join(SOURCE_FILE_NAME);
    let run_id = format!("inspect-{}", now_epoch_millis());

    fs::create_dir_all(&logs_dir).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to prepare session logs directory.",
            error,
        ))
        .with_session(session_id.clone())
    })?;

    let validation = run_validation_command(
        &ahtml_home,
        &logs_dir,
        &format!("{run_id}-validate"),
        &source_path,
    )?;
    let validation_payload = validation.json.unwrap_or(Value::Null);
    let validation_diagnostics =
        diagnostics_from_validation_payload(&validation_payload, validation.exit_code);

    record.updated_at = now_iso_stub();
    record.current_view = "inspect".into();
    if !validation_diagnostics.is_empty() {
        record.status = "error".into();
    }
    write_session_record(&session_dir, &record)?;

    if !validation_diagnostics.is_empty() {
        return Ok(InspectSnapshot {
            session_id,
            generated_at: now_iso_stub(),
            diagnostics: validation_diagnostics,
            structure_summary: structure_summary_from_validation_payload(&validation_payload),
            last_build: build_run_summary_from_record(&record, &session_dir),
        });
    }

    let execution = run_ahtml_json(
        &ahtml_home,
        &logs_dir,
        &run_id,
        &[
            "inspect".into(),
            "--input".into(),
            source_path.to_string(),
            "--format".into(),
            "json".into(),
        ],
    )?;

    let payload = execution.json.unwrap_or(Value::Null);
    let diagnostics = diagnostics_from_inspect_payload(&payload, execution.exit_code);
    let structure_summary = structure_summary_from_inspection_value(&payload);

    Ok(InspectSnapshot {
        session_id,
        generated_at: now_iso_stub(),
        diagnostics,
        structure_summary,
        last_build: build_run_summary_from_record(&record, &session_dir),
    })
}

#[tauri::command]
fn validate_source(
    app: AppHandle,
    session_id: String,
    source: String,
) -> Result<SourceValidationSnapshot, AppError> {
    let session_dir = session_dir(&app, &session_id)?;
    let ahtml_home = ensure_ahtml_home(&app)?;
    let logs_dir = session_dir.join(LOGS_DIR_NAME);
    let run_id = format!("validate-{}", now_epoch_millis());
    let input_path = logs_dir.join(format!("{run_id}.draft.agent.html"));

    fs::create_dir_all(&logs_dir).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to prepare session logs directory.",
            error,
        ))
        .with_session(session_id.clone())
    })?;
    fs::write(&input_path, source).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to write validation draft input.",
            error,
        ))
        .with_session(session_id.clone())
    })?;

    let execution = run_ahtml_json(
        &ahtml_home,
        &logs_dir,
        &run_id,
        &[
            "validate".into(),
            "--input".into(),
            input_path.to_string(),
            "--format".into(),
            "json".into(),
        ],
    )?;

    let _ = fs::remove_file(&input_path);
    let payload = execution.json.unwrap_or(Value::Null);
    let diagnostics = diagnostics_from_validation_payload(&payload, execution.exit_code);
    let status = if diagnostics.is_empty() && execution.exit_code == Some(0) {
        "valid"
    } else {
        "invalid"
    };

    Ok(SourceValidationSnapshot {
        session_id,
        validated_at: now_iso_stub(),
        status: status.into(),
        diagnostics,
        structure_summary: structure_summary_from_validation_payload(&payload),
    })
}

#[tauri::command]
fn check_runtime(app: AppHandle) -> Result<Value, AppError> {
    let _span = info_span!("check_runtime").entered();
    let logs_dir = ensure_support_root(&app)?.join(LOGS_DIR_NAME);
    let ahtml_home = ensure_ahtml_home(&app)?;
    fs::create_dir_all(&logs_dir).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to prepare runtime log directory.",
            error,
        ))
    })?;

    let execution = run_ahtml_json(
        &ahtml_home,
        &logs_dir,
        &format!("doctor-{}", now_epoch_millis()),
        &["doctor".into(), "--format".into(), "json".into()],
    )?;

    execution.json.ok_or_else(|| {
        AppError::from(BackendError::message(
            "cli-launch",
            "ahtml doctor did not return valid JSON.",
        ))
        .with_details(format!(
            "stdout log: {}; stderr log: {}",
                execution.stdout_path,
                execution.stderr_path
            ))
    })
}

#[tauri::command]
fn read_preview_html(app: AppHandle, session_id: String) -> Result<String, AppError> {
    let session_dir = session_dir(&app, &session_id)?;
    let Some(preview_path) = preview_path(&session_dir) else {
        return Err(AppError::from(BackendError::message(
            "preview-missing",
            "No built preview is available for this session.",
        ))
        .with_session(session_id));
    };

    fs::read_to_string(preview_path).map_err(|error| {
        AppError::from(BackendError::preview_missing(
            "Unable to read the built preview HTML.",
            error,
        ))
    })
}

#[tauri::command]
fn read_logs(app: AppHandle, session_id: String) -> Result<LogSnapshot, AppError> {
    let session_dir = session_dir(&app, &session_id)?;
    let logs_dir = session_dir.join(LOGS_DIR_NAME);

    Ok(LogSnapshot {
        stdout: read_latest_log(&logs_dir, ".stdout.log"),
        stderr: read_latest_log(&logs_dir, ".stderr.log"),
    })
}

#[tauri::command]
fn read_chat(app: AppHandle, session_id: String) -> Result<Vec<AgentShellMessage>, AppError> {
    let session_dir = session_dir(&app, &session_id)?;
    read_chat_messages(&session_dir)
}

#[tauri::command]
fn append_chat_message(
    app: AppHandle,
    session_id: String,
    input: AppendChatMessageInput,
) -> Result<Vec<AgentShellMessage>, AppError> {
    let session_dir = session_dir(&app, &session_id)?;
    let mut record = read_session_record(&session_dir)?;
    let text = input.text.trim();

    if text.is_empty() {
        return Err(AppError::from(BackendError::ui_validation(
            "Chat messages cannot be empty.",
        ))
        .with_session(session_id));
    }

    let message = AgentShellMessage {
        id: format!("chat-{}", now_epoch_millis()),
        role: input.role,
        created_at: now_iso_stub(),
        text: text.to_string(),
        kind: input.kind,
        proposal_snapshot: None,
    };

    append_chat_message_to_file(&session_dir, &message)?;
    record.updated_at = now_iso_stub();
    write_session_record(&session_dir, &record)?;
    read_chat_messages(&session_dir)
}

#[tauri::command]
fn generate_session_proposal(
    app: AppHandle,
    session_id: String,
) -> Result<Vec<AgentShellMessage>, AppError> {
    let _span = info_span!("generate_session_proposal", session_id = %session_id).entered();
    let session_dir = session_dir(&app, &session_id)?;
    let mut record = read_session_record(&session_dir)?;
    let source = fs::read_to_string(session_dir.join(SOURCE_FILE_NAME)).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to read source file for proposal generation.",
            error,
        ))
        .with_session(session_id.clone())
    })?;
    let logs_dir = session_dir.join(LOGS_DIR_NAME);
    let logs = LogSnapshot {
        stdout: read_latest_log(&logs_dir, ".stdout.log"),
        stderr: read_latest_log(&logs_dir, ".stderr.log"),
    };
    let build = build_run_summary_from_record(&record, &session_dir);
    let text = build_session_proposal_text(&record, &source, build.as_ref(), &logs);

    let message = AgentShellMessage {
        id: format!("chat-{}", now_epoch_millis()),
        role: "placeholder".into(),
        created_at: now_iso_stub(),
        text,
        kind: "proposal-placeholder".into(),
        proposal_snapshot: Some(ProposalSnapshot {
            line_count: source.lines().count(),
            source,
        }),
    };

    append_chat_message_to_file(&session_dir, &message)?;
    record.updated_at = now_iso_stub();
    write_session_record(&session_dir, &record)?;
    read_chat_messages(&session_dir)
}

fn run_build_internal(app: &AppHandle, session_id: &str) -> Result<BuildRunSummary, AppError> {
    let _span = info_span!("run_build_internal", session_id = %session_id).entered();
    let session_dir = session_dir(app, session_id)?;
    let mut record = read_session_record(&session_dir)?;
    let ahtml_home = ensure_ahtml_home(app)?;
    let logs_dir = session_dir.join(LOGS_DIR_NAME);
    let build_dir = session_dir.join(BUILD_DIR_NAME);
    let source_path = session_dir.join(SOURCE_FILE_NAME);
    let run_id = format!("build-{}", now_epoch_millis());
    let started_at = now_iso_stub();

    fs::create_dir_all(&logs_dir).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to prepare session logs directory.",
            error,
        ))
        .with_session(session_id.to_string())
    })?;
    fs::create_dir_all(&build_dir).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to prepare build directory.",
            error,
        ))
        .with_session(session_id.to_string())
    })?;

    let execution = run_ahtml_json(
        &ahtml_home,
        &logs_dir,
        &run_id,
        &[
            "build".into(),
            source_path.to_string(),
            "--out".into(),
            build_dir.to_string(),
            "--format".into(),
            "json".into(),
        ],
    )?;

    let preview_path = preview_path(&session_dir)
        .filter(|path| path.exists())
        .map(path_to_string);
    let stdout_path = path_to_string(execution.stdout_path.clone());
    let stderr_path = path_to_string(execution.stderr_path.clone());
    let succeeded = execution
        .json
        .as_ref()
        .and_then(|value| value.get("ok"))
        .and_then(Value::as_bool)
        .unwrap_or(false)
        && execution.exit_code == Some(0)
        && preview_path.is_some();

    record.status = if succeeded { "ready" } else { "error" }.into();
    record.updated_at = now_iso_stub();
    record.last_build_at = Some(now_iso_stub());
    record.last_build_status = Some(if succeeded { "succeeded" } else { "failed" }.into());
    record.last_build_exit_code = execution.exit_code;
    record.last_build_stdout_path = Some(stdout_path.clone());
    record.last_build_stderr_path = Some(stderr_path.clone());
    record.has_preview = preview_path.is_some();
    record.current_view = if succeeded { "preview" } else { "inspect" }.into();
    write_session_record(&session_dir, &record)?;

    Ok(BuildRunSummary {
        run_id,
        session_id: session_id.to_string(),
        started_at,
        finished_at: Some(now_iso_stub()),
        status: if succeeded {
            "succeeded".into()
        } else {
            "failed".into()
        },
        exit_code: execution.exit_code,
        stdout_path: Some(stdout_path),
        stderr_path: Some(stderr_path),
        preview_path,
    })
}

fn run_ahtml_json(
    ahtml_home: &Utf8Path,
    logs_dir: &Utf8Path,
    run_id: &str,
    args: &[String],
) -> Result<CliExecution, AppError> {
    let _span = info_span!("run_ahtml_json", run_id = %run_id, args = ?args).entered();
    let mut command = configured_ahtml_command(ahtml_home);
    command.args(args);

    let output = command.output().map_err(|error| {
        AppError::from(BackendError::cli_launch(
            "Unable to start the ahtml CLI.",
            error,
        ))
    })?;

    let stdout_raw = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr_raw = String::from_utf8_lossy(&output.stderr).to_string();
    let stdout_path = logs_dir.join(format!("{run_id}.stdout.log"));
    let stderr_path = logs_dir.join(format!("{run_id}.stderr.log"));

    fs::write(&stdout_path, &stdout_raw).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to write stdout log.",
            error,
        ))
    })?;
    fs::write(&stderr_path, &stderr_raw).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to write stderr log.",
            error,
        ))
    })?;

    info!(
        run_id = %run_id,
        exit_code = ?output.status.code(),
        stdout_path = %stdout_path,
        stderr_path = %stderr_path,
        "ahtml CLI completed"
    );
    Ok(CliExecution {
        stdout_path,
        stderr_path,
        json: serde_json::from_str(&stdout_raw).ok(),
        exit_code: output.status.code(),
    })
}

fn run_validation_command(
    ahtml_home: &Utf8Path,
    logs_dir: &Utf8Path,
    run_id: &str,
    input_path: &Utf8Path,
) -> Result<CliExecution, AppError> {
    run_ahtml_json(
        ahtml_home,
        logs_dir,
        run_id,
        &[
            "validate".into(),
            "--input".into(),
            input_path.to_string(),
            "--format".into(),
            "json".into(),
        ],
    )
}

fn configured_ahtml_command(ahtml_home: &Utf8Path) -> Command {
    let executable = env::var("AHTML_CLI").unwrap_or_else(|_| "ahtml".into());
    let mut command = Command::new(executable);

    if let Ok(script_path) = env::var("AHTML_CLI_SCRIPT") {
        if !script_path.trim().is_empty() {
            command.arg(script_path);
        }
    }

    command.env("AHTML_HOME", ahtml_home);
    command
}

fn ensure_support_root(app: &AppHandle) -> Result<Utf8PathBuf, AppError> {
    let root = app.path().app_data_dir().map_err(|error| {
        AppError::from(BackendError::message(
            "session-io",
            "Unable to resolve the app data directory.",
        ))
        .with_details(error.to_string())
    })?;
    let root = Utf8PathBuf::from_path_buf(root).map_err(|path| {
        AppError::from(BackendError::message(
            "session-io",
            format!("App support path is not valid UTF-8: {}", path.display()),
        ))
    })?;
    fs::create_dir_all(&root).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to create the app support directory.",
            error,
        ))
    })?;
    Ok(root)
}

fn ensure_sessions_root(app: &AppHandle) -> Result<Utf8PathBuf, AppError> {
    let sessions_dir = ensure_support_root(app)?.join("sessions");
    fs::create_dir_all(&sessions_dir).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to create the sessions directory.",
            error,
        ))
    })?;
    Ok(sessions_dir)
}

fn ensure_ahtml_home(app: &AppHandle) -> Result<Utf8PathBuf, AppError> {
    let ahtml_home = ensure_support_root(app)?.join("ahtml-home");
    fs::create_dir_all(&ahtml_home).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to create the isolated ahtml home.",
            error,
        ))
    })?;
    Ok(ahtml_home)
}

fn session_dir(app: &AppHandle, session_id: &str) -> Result<Utf8PathBuf, AppError> {
    let path = ensure_sessions_root(app)?.join(session_id);
    if !path.exists() {
        return Err(AppError::from(BackendError::message(
            "session-io",
            format!("Session {session_id} was not found."),
        ))
        .with_session(session_id.to_string()));
    }
    Ok(path)
}

fn build_session_proposal_text(
    record: &SessionRecord,
    source: &str,
    build: Option<&BuildRunSummary>,
    logs: &LogSnapshot,
) -> String {
    let mut items: Vec<String> = Vec::new();

    if !source.contains("<page") {
        items.push(
            "[build] Add a <page> root before the next build so the session has a valid top-level artifact."
                .into(),
        );
    }

    if source.contains("className=") {
        items.push(
            "[inspect] Remove raw UI props such as className and keep the document at the semantic agent-html layer."
                .into(),
        );
    }

    match record.status.as_str() {
        "dirty" => items.push(
            "[build] Rebuild this session so Preview and Inspect catch up with the latest saved source."
                .into(),
        ),
        "error" => items.push(
            "[inspect] Inspect the latest stderr log before editing again so the next build targets the actual failure."
                .into(),
        ),
        _ => {}
    }

    match build {
        Some(summary) if summary.status == "failed" => items.push(
            "[build] The latest build failed, so review the logs first and only rebuild after the failure path is understood."
                .into(),
        ),
        Some(summary) if summary.preview_path.is_some() => items.push(
            "[review] Compare the current preview artifact with the source intent and confirm the main recommendation still matches the rendered output."
                .into(),
        ),
        _ => items.push(
            "[build] Run Build to generate a fresh preview artifact before sharing or reviewing this session."
                .into(),
        ),
    }

    if logs.stderr.as_ref().map(|value| !value.trim().is_empty()).unwrap_or(false) {
        items.push(
            "[inspect] Keep the latest stderr log open while you edit because it is the fastest way to explain runtime and build failures."
                .into(),
        );
    } else if logs
        .stdout
        .as_ref()
        .map(|value| !value.trim().is_empty())
        .unwrap_or(false)
    {
        items.push(
            "[review] Use the captured stdout summary as the baseline and return to Source only if Preview diverges from that output."
                .into(),
        );
    }

    if items.is_empty() {
        items.push(
            "[review] Keep the source, preview, and inspect summary aligned before making the next artifact decision."
                .into(),
        );
    }

    let mut lines = vec![format!("Proposal for {}", record.name)];
    lines.extend(items.into_iter().map(|item| format!("- {item}")));
    lines.join("\n")
}

fn build_run_summary_from_record(
    record: &SessionRecord,
    session_dir: &Utf8Path,
) -> Option<BuildRunSummary> {
    let status = record
        .last_build_status
        .as_deref()
        .and_then(parse_build_status)
        .or_else(|| {
            if record.has_preview {
                Some("succeeded")
            } else if record.status == "error" {
                Some("failed")
            } else if record.status == "building" {
                Some("running")
            } else {
                None
            }
        });

    let started_at = record
        .last_build_at
        .clone()
        .unwrap_or_else(|| record.updated_at.clone());
    let preview_path = preview_path(session_dir)
        .filter(|path| path.exists())
        .map(path_to_string);

    if preview_path.is_none() && record.last_build_at.is_none() && status.is_none() {
        return None;
    }

    Some(BuildRunSummary {
        run_id: format!("{}-last-build", record.id),
        session_id: record.id.clone(),
        started_at: started_at.clone(),
        finished_at: record.last_build_at.clone(),
        status: status.unwrap_or("idle").into(),
        exit_code: record
            .last_build_exit_code
            .or_else(|| if preview_path.is_some() { Some(0) } else { None }),
        stdout_path: record.last_build_stdout_path.clone(),
        stderr_path: record.last_build_stderr_path.clone(),
        preview_path,
    })
}

fn parse_build_status(status: &str) -> Option<&'static str> {
    match status {
        "idle" => Some("idle"),
        "running" => Some("running"),
        "failed" => Some("failed"),
        "succeeded" => Some("succeeded"),
        _ => None,
    }
}

fn preview_path(session_dir: &Utf8Path) -> Option<Utf8PathBuf> {
    let path = session_dir.join(BUILD_DIR_NAME).join("index.html");
    if path.exists() {
        Some(path)
    } else {
        None
    }
}

fn read_latest_log(logs_dir: &Utf8Path, suffix: &str) -> Option<String> {
    let mut matches = fs::read_dir(logs_dir)
        .ok()?
        .flatten()
        .filter_map(|entry| Utf8PathBuf::from_path_buf(entry.path()).ok())
        .filter(|path| {
            path.file_name()
                .map(|name| name.ends_with(suffix))
                .unwrap_or(false)
        })
        .collect::<Vec<_>>();

    matches.sort();
    let latest = matches.pop()?;
    fs::read_to_string(latest).ok()
}

fn default_source(name: &str) -> String {
    format!(
        "<meta-agent profile=\"report-default\" />\n\n<page title=\"{name}\">\n  <card title=\"Summary\">\n    Draft the first artifact content here.\n  </card>\n</page>\n"
    )
}

fn slugify(input: &str) -> String {
    let slug = input
        .chars()
        .map(|char| {
            if char.is_ascii_alphanumeric() {
                char.to_ascii_lowercase()
            } else {
                '-'
            }
        })
        .collect::<String>();

    let trimmed = slug.trim_matches('-').to_string();
    if trimmed.is_empty() {
        "untitled".into()
    } else {
        trimmed
            .split('-')
            .filter(|segment| !segment.is_empty())
            .collect::<Vec<_>>()
            .join("-")
    }
}

fn now_epoch_millis() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis()
}

fn now_iso_stub() -> String {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .unwrap_or_else(|_| format!("epoch-{}", now_epoch_millis()))
}

fn path_to_string(path: Utf8PathBuf) -> String {
    path.into_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let _ = tracing_subscriber::fmt()
        .with_target(false)
        .compact()
        .try_init();

    tauri::Builder::default()
        .setup(|app| {
            let _span = info_span!("tauri_setup").entered();
            let main_window = app.get_webview_window("main").expect("main window");
            main_window.set_title("agent-html-app").ok();
            ensure_sessions_root(app.handle()).expect("sessions root");
            info!("tauri app setup completed");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            list_sessions,
            create_session,
            open_session,
            rename_session,
            set_session_pinned,
            delete_session,
            set_session_view,
            save_source,
            run_build,
            run_inspect,
            validate_source,
            check_runtime,
            read_preview_html,
            read_logs,
            read_chat,
            append_chat_message,
            generate_session_proposal,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{
        build_run_summary_from_record, build_session_proposal_text, read_session_record,
        update_session_view_record, write_session_record, BuildRunSummary, LogSnapshot,
        SessionRecord,
    };
    use camino::Utf8PathBuf;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn update_session_view_record_persists_valid_view() {
        let session_dir = test_session_dir("persist-view");
        fs::create_dir_all(&session_dir).expect("create session dir");

        write_session_record(
            &session_dir,
            &SessionRecord {
                id: "session-test".into(),
                name: "Session Test".into(),
                status: "draft".into(),
                pinned: false,
                updated_at: "epoch-1".into(),
                last_build_at: None,
                last_build_status: None,
                last_build_exit_code: None,
                last_build_stdout_path: None,
                last_build_stderr_path: None,
                has_preview: false,
                current_view: "source".into(),
            },
        )
        .expect("write record");

        update_session_view_record(&session_dir, "inspect", None).expect("update view");
        let record = read_session_record(&session_dir).expect("read record");

        assert_eq!(record.current_view, "inspect");
        let _ = fs::remove_dir_all(&session_dir);
    }

    #[test]
    fn update_session_view_record_rejects_invalid_view() {
        let session_dir = test_session_dir("reject-invalid-view");
        fs::create_dir_all(&session_dir).expect("create session dir");

        write_session_record(
            &session_dir,
            &SessionRecord {
                id: "session-test".into(),
                name: "Session Test".into(),
                status: "draft".into(),
                pinned: false,
                updated_at: "epoch-1".into(),
                last_build_at: None,
                last_build_status: None,
                last_build_exit_code: None,
                last_build_stdout_path: None,
                last_build_stderr_path: None,
                has_preview: false,
                current_view: "source".into(),
            },
        )
        .expect("write record");

        let error = update_session_view_record(&session_dir, "timeline", None)
            .expect_err("invalid view should fail");
        assert_eq!(error.code, "ui-validation");

        let record = read_session_record(&session_dir).expect("read record");
        assert_eq!(record.current_view, "source");
        let _ = fs::remove_dir_all(&session_dir);
    }

    #[test]
    fn build_session_proposal_text_highlights_error_and_missing_page() {
        let record = SessionRecord {
            id: "session-test".into(),
            name: "Session Test".into(),
            status: "error".into(),
            pinned: false,
            updated_at: "epoch-1".into(),
            last_build_at: Some("epoch-2".into()),
            last_build_status: None,
            last_build_exit_code: None,
            last_build_stdout_path: None,
            last_build_stderr_path: None,
            has_preview: false,
            current_view: "inspect".into(),
        };
        let build = BuildRunSummary {
            run_id: "build-1".into(),
            session_id: "session-test".into(),
            started_at: "epoch-2".into(),
            finished_at: Some("epoch-3".into()),
            status: "failed".into(),
            exit_code: Some(1),
            stdout_path: None,
            stderr_path: None,
            preview_path: None,
        };
        let logs = LogSnapshot {
            stdout: None,
            stderr: Some("Validation failed".into()),
        };

        let text = build_session_proposal_text(&record, "<card />", Some(&build), &logs);

        assert!(text.contains("Proposal for Session Test"));
        assert!(text.contains("\n- [build] Add a <page> root"));
        assert!(text.contains("[build] Add a <page> root"));
        assert!(text.contains("[inspect]"));
        assert!(text.contains("stderr log"));
        assert!(text.contains("[build] The latest build failed"));
    }

    #[test]
    fn build_run_summary_from_record_keeps_failed_status_with_stale_preview() {
        let session_dir = test_session_dir("restore-failed-build");
        fs::create_dir_all(session_dir.join("build")).expect("create build dir");
        fs::write(session_dir.join("build").join("index.html"), "<html />")
            .expect("write preview");

        let summary = build_run_summary_from_record(
            &SessionRecord {
                id: "session-test".into(),
                name: "Session Test".into(),
                status: "error".into(),
                pinned: false,
                updated_at: "epoch-1".into(),
                last_build_at: Some("2026-05-16T09:00:00Z".into()),
                last_build_status: Some("failed".into()),
                last_build_exit_code: Some(1),
                last_build_stdout_path: Some("D:/tmp/build.stdout.log".into()),
                last_build_stderr_path: Some("D:/tmp/build.stderr.log".into()),
                has_preview: true,
                current_view: "inspect".into(),
            },
            &session_dir,
        )
        .expect("summary");

        assert_eq!(summary.status, "failed");
        assert_eq!(summary.exit_code, Some(1));
        assert_eq!(
            summary.stdout_path.as_deref(),
            Some("D:/tmp/build.stdout.log")
        );
        assert_eq!(
            summary.stderr_path.as_deref(),
            Some("D:/tmp/build.stderr.log")
        );
        assert_eq!(
            summary.preview_path,
            Some(session_dir.join("build").join("index.html").into_string())
        );

        let _ = fs::remove_dir_all(&session_dir);
    }

    fn test_session_dir(suffix: &str) -> Utf8PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        Utf8PathBuf::from_path_buf(
            std::env::temp_dir().join(format!("agent-html-app-{suffix}-{nonce}")),
        )
        .expect("temp dir should be valid UTF-8")
    }
}
