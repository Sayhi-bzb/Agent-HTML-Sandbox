use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager};

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
    log_directory: String,
    chat_path: String,
    current_view: String,
    source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AgentShellMessage {
    id: String,
    role: String,
    created_at: String,
    text: String,
    kind: String,
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
    has_preview: bool,
    current_view: String,
}

struct CliExecution {
    stdout_path: PathBuf,
    stderr_path: PathBuf,
    exit_code: Option<i32>,
    json: Option<Value>,
}

impl AppError {
    fn new(code: &str, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            details: None,
            session_id: None,
            run_id: None,
        }
    }

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
    let root = ensure_sessions_root(&app)?;
    let mut sessions = Vec::new();

    let entries = fs::read_dir(root).map_err(|error| {
        AppError::new("session-io", "Unable to read sessions directory.")
            .with_details(error.to_string())
    })?;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        if let Ok(session) = load_session_detail_from_dir(&path) {
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

    Ok(sessions)
}

#[tauri::command]
fn create_session(app: AppHandle, input: SessionCreateInput) -> Result<SessionDetail, AppError> {
    let name = if input.name.trim().is_empty() {
        "Untitled Session".to_string()
    } else {
        input.name.trim().to_string()
    };
    let session_id = format!("session-{}-{}", slugify(&name), now_epoch_millis());
    let session_dir = ensure_sessions_root(&app)?.join(&session_id);

    fs::create_dir_all(session_dir.join(BUILD_DIR_NAME)).map_err(|error| {
        AppError::new("session-io", "Unable to create build directory.")
            .with_details(error.to_string())
            .with_session(session_id.clone())
    })?;
    fs::create_dir_all(session_dir.join(LOGS_DIR_NAME)).map_err(|error| {
        AppError::new("session-io", "Unable to create logs directory.")
            .with_details(error.to_string())
            .with_session(session_id.clone())
    })?;

    let record = SessionRecord {
        id: session_id.clone(),
        name: name.clone(),
        status: "draft".into(),
        pinned: false,
        updated_at: now_iso_stub(),
        last_build_at: None,
        has_preview: false,
        current_view: "source".into(),
    };

    write_session_record(&session_dir, &record)?;
    fs::write(session_dir.join(SOURCE_FILE_NAME), default_source(&name)).map_err(|error| {
        AppError::new("session-io", "Unable to write initial source file.")
            .with_details(error.to_string())
            .with_session(session_id.clone())
    })?;
    write_chat_messages(&session_dir, &default_chat_messages())?;

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
        return Err(
            AppError::new("ui-validation", "Session names cannot be empty.")
                .with_session(session_id),
        );
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
        AppError::new("session-io", "Unable to delete the session directory.")
            .with_details(error.to_string())
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
        AppError::new("session-io", "Unable to write source file.")
            .with_details(error.to_string())
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
    let session_dir = session_dir(&app, &session_id)?;
    let mut record = read_session_record(&session_dir)?;
    let ahtml_home = ensure_ahtml_home(&app)?;
    let logs_dir = session_dir.join(LOGS_DIR_NAME);
    let source_path = session_dir.join(SOURCE_FILE_NAME);
    let run_id = format!("inspect-{}", now_epoch_millis());

    fs::create_dir_all(&logs_dir).map_err(|error| {
        AppError::new("session-io", "Unable to prepare session logs directory.")
            .with_details(error.to_string())
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
            source_path.display().to_string(),
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
        AppError::new("session-io", "Unable to prepare session logs directory.")
            .with_details(error.to_string())
            .with_session(session_id.clone())
    })?;
    fs::write(&input_path, source).map_err(|error| {
        AppError::new("session-io", "Unable to write validation draft input.")
            .with_details(error.to_string())
            .with_session(session_id.clone())
    })?;

    let execution = run_ahtml_json(
        &ahtml_home,
        &logs_dir,
        &run_id,
        &[
            "validate".into(),
            "--input".into(),
            input_path.display().to_string(),
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
    let logs_dir = ensure_support_root(&app)?.join(LOGS_DIR_NAME);
    let ahtml_home = ensure_ahtml_home(&app)?;
    fs::create_dir_all(&logs_dir).map_err(|error| {
        AppError::new("session-io", "Unable to prepare runtime log directory.")
            .with_details(error.to_string())
    })?;

    let execution = run_ahtml_json(
        &ahtml_home,
        &logs_dir,
        &format!("doctor-{}", now_epoch_millis()),
        &["doctor".into(), "--format".into(), "json".into()],
    )?;

    execution.json.ok_or_else(|| {
        AppError::new("cli-launch", "ahtml doctor did not return valid JSON.")
            .with_details(format!(
                "stdout log: {}; stderr log: {}",
                execution.stdout_path.display(),
                execution.stderr_path.display()
            ))
    })
}

#[tauri::command]
fn read_preview_html(app: AppHandle, session_id: String) -> Result<String, AppError> {
    let session_dir = session_dir(&app, &session_id)?;
    let Some(preview_path) = preview_path(&session_dir) else {
        return Err(
            AppError::new("preview-missing", "No built preview is available for this session.")
                .with_session(session_id),
        );
    };

    fs::read_to_string(preview_path).map_err(|error| {
        AppError::new("preview-missing", "Unable to read the built preview HTML.")
            .with_details(error.to_string())
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
        return Err(
            AppError::new("ui-validation", "Chat messages cannot be empty.")
                .with_session(session_id),
        );
    }

    let message = AgentShellMessage {
        id: format!("chat-{}", now_epoch_millis()),
        role: input.role,
        created_at: now_iso_stub(),
        text: text.to_string(),
        kind: input.kind,
    };

    append_chat_message_to_file(&session_dir, &message)?;
    record.updated_at = now_iso_stub();
    write_session_record(&session_dir, &record)?;
    read_chat_messages(&session_dir)
}

fn run_build_internal(app: &AppHandle, session_id: &str) -> Result<BuildRunSummary, AppError> {
    let session_dir = session_dir(app, session_id)?;
    let mut record = read_session_record(&session_dir)?;
    let ahtml_home = ensure_ahtml_home(app)?;
    let logs_dir = session_dir.join(LOGS_DIR_NAME);
    let build_dir = session_dir.join(BUILD_DIR_NAME);
    let source_path = session_dir.join(SOURCE_FILE_NAME);
    let run_id = format!("build-{}", now_epoch_millis());
    let started_at = now_iso_stub();

    fs::create_dir_all(&logs_dir).map_err(|error| {
        AppError::new("session-io", "Unable to prepare session logs directory.")
            .with_details(error.to_string())
            .with_session(session_id.to_string())
    })?;
    fs::create_dir_all(&build_dir).map_err(|error| {
        AppError::new("session-io", "Unable to prepare build directory.")
            .with_details(error.to_string())
            .with_session(session_id.to_string())
    })?;

    let execution = run_ahtml_json(
        &ahtml_home,
        &logs_dir,
        &run_id,
        &[
            "build".into(),
            source_path.display().to_string(),
            "--out".into(),
            build_dir.display().to_string(),
            "--format".into(),
            "json".into(),
        ],
    )?;

    let preview_path = preview_path(&session_dir)
        .filter(|path| path.exists())
        .map(path_to_string);
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
        stdout_path: Some(path_to_string(execution.stdout_path)),
        stderr_path: Some(path_to_string(execution.stderr_path)),
        preview_path,
    })
}

fn run_ahtml_json(
    ahtml_home: &Path,
    logs_dir: &Path,
    run_id: &str,
    args: &[String],
) -> Result<CliExecution, AppError> {
    let mut command = configured_ahtml_command(ahtml_home);
    command.args(args);

    let output = command.output().map_err(|error| {
        AppError::new("cli-launch", "Unable to start the ahtml CLI.")
            .with_details(error.to_string())
    })?;

    let stdout_raw = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr_raw = String::from_utf8_lossy(&output.stderr).to_string();
    let stdout_path = logs_dir.join(format!("{run_id}.stdout.log"));
    let stderr_path = logs_dir.join(format!("{run_id}.stderr.log"));

    fs::write(&stdout_path, &stdout_raw).map_err(|error| {
        AppError::new("session-io", "Unable to write stdout log.")
            .with_details(error.to_string())
    })?;
    fs::write(&stderr_path, &stderr_raw).map_err(|error| {
        AppError::new("session-io", "Unable to write stderr log.")
            .with_details(error.to_string())
    })?;

    Ok(CliExecution {
        stdout_path,
        stderr_path,
        json: serde_json::from_str(&stdout_raw).ok(),
        exit_code: output.status.code(),
    })
}

fn run_validation_command(
    ahtml_home: &Path,
    logs_dir: &Path,
    run_id: &str,
    input_path: &Path,
) -> Result<CliExecution, AppError> {
    run_ahtml_json(
        ahtml_home,
        logs_dir,
        run_id,
        &[
            "validate".into(),
            "--input".into(),
            input_path.display().to_string(),
            "--format".into(),
            "json".into(),
        ],
    )
}

fn configured_ahtml_command(ahtml_home: &Path) -> Command {
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

fn ensure_support_root(app: &AppHandle) -> Result<PathBuf, AppError> {
    let root = app.path().app_data_dir().map_err(|error| {
        AppError::new("session-io", "Unable to resolve the app data directory.")
            .with_details(error.to_string())
    })?;
    fs::create_dir_all(&root).map_err(|error| {
        AppError::new("session-io", "Unable to create the app support directory.")
            .with_details(error.to_string())
    })?;
    Ok(root)
}

fn ensure_sessions_root(app: &AppHandle) -> Result<PathBuf, AppError> {
    let sessions_dir = ensure_support_root(app)?.join("sessions");
    fs::create_dir_all(&sessions_dir).map_err(|error| {
        AppError::new("session-io", "Unable to create the sessions directory.")
            .with_details(error.to_string())
    })?;
    Ok(sessions_dir)
}

fn ensure_ahtml_home(app: &AppHandle) -> Result<PathBuf, AppError> {
    let ahtml_home = ensure_support_root(app)?.join("ahtml-home");
    fs::create_dir_all(&ahtml_home).map_err(|error| {
        AppError::new("session-io", "Unable to create the isolated ahtml home.")
            .with_details(error.to_string())
    })?;
    Ok(ahtml_home)
}

fn session_dir(app: &AppHandle, session_id: &str) -> Result<PathBuf, AppError> {
    let path = ensure_sessions_root(app)?.join(session_id);
    if !path.exists() {
        return Err(
            AppError::new("session-io", format!("Session {session_id} was not found."))
                .with_session(session_id.to_string()),
        );
    }
    Ok(path)
}

fn load_session_detail_from_dir(session_dir: &Path) -> Result<SessionDetail, AppError> {
    let record = read_session_record(session_dir)?;
    let source_path = session_dir.join(SOURCE_FILE_NAME);
    let chat_path = session_dir.join(CHAT_FILE_NAME);
    let log_directory = session_dir.join(LOGS_DIR_NAME);
    let source = fs::read_to_string(&source_path).map_err(|error| {
        AppError::new("session-io", "Unable to read source file.")
            .with_details(error.to_string())
            .with_session(record.id.clone())
    })?;

    Ok(SessionDetail {
        summary: SessionSummary {
            id: record.id.clone(),
            name: record.name.clone(),
            directory: path_to_string(session_dir.to_path_buf()),
            status: record.status.clone(),
            pinned: record.pinned,
            updated_at: record.updated_at.clone(),
            last_build_at: record.last_build_at.clone(),
            has_preview: record.has_preview,
        },
        source_path: path_to_string(source_path),
        preview_path: preview_path(session_dir).filter(|path| path.exists()).map(path_to_string),
        log_directory: path_to_string(log_directory),
        chat_path: path_to_string(chat_path),
        current_view: record.current_view,
        source,
    })
}

fn read_session_record(session_dir: &Path) -> Result<SessionRecord, AppError> {
    let record_path = session_dir.join(SESSION_FILE_NAME);
    let raw = fs::read_to_string(&record_path).map_err(|error| {
        AppError::new("session-io", "Unable to read session metadata.")
            .with_details(error.to_string())
    })?;

    serde_json::from_str(&raw).map_err(|error| {
        AppError::new("session-io", "Session metadata is invalid JSON.")
            .with_details(error.to_string())
    })
}

fn read_chat_messages(session_dir: &Path) -> Result<Vec<AgentShellMessage>, AppError> {
    let chat_path = session_dir.join(CHAT_FILE_NAME);

    if !chat_path.exists() {
        let defaults = default_chat_messages();
        write_chat_messages(session_dir, &defaults)?;
        return Ok(defaults);
    }

    let source = fs::read_to_string(&chat_path).map_err(|error| {
        AppError::new("session-io", "Unable to read chat log.")
            .with_details(error.to_string())
    })?;

    if source.trim().is_empty() {
        return Ok(Vec::new());
    }

    source
        .lines()
        .enumerate()
        .filter(|(_, line)| !line.trim().is_empty())
        .map(|(index, line)| {
            serde_json::from_str::<AgentShellMessage>(line).map_err(|error| {
                AppError::new("session-io", format!("Invalid chat log entry at line {}.", index + 1))
                    .with_details(error.to_string())
            })
        })
        .collect()
}

fn write_chat_messages(
    session_dir: &Path,
    messages: &[AgentShellMessage],
) -> Result<(), AppError> {
    let chat_path = session_dir.join(CHAT_FILE_NAME);
    let content = if messages.is_empty() {
        String::new()
    } else {
        format!(
            "{}\n",
            messages
                .iter()
                .map(|message| serde_json::to_string(message))
                .collect::<Result<Vec<_>, _>>()
                .map_err(|error| {
                    AppError::new("session-io", "Unable to serialize chat messages.")
                        .with_details(error.to_string())
                })?
                .join("\n")
        )
    };

    fs::write(chat_path, content).map_err(|error| {
        AppError::new("session-io", "Unable to write chat log.")
            .with_details(error.to_string())
    })
}

fn append_chat_message_to_file(
    session_dir: &Path,
    message: &AgentShellMessage,
) -> Result<(), AppError> {
    let mut messages = read_chat_messages(session_dir)?;
    messages.push(message.clone());
    write_chat_messages(session_dir, &messages)
}

fn write_session_record(session_dir: &Path, record: &SessionRecord) -> Result<(), AppError> {
    let record_path = session_dir.join(SESSION_FILE_NAME);
    let serialized = serde_json::to_string_pretty(record).map_err(|error| {
        AppError::new("session-io", "Unable to serialize session metadata.")
            .with_details(error.to_string())
    })?;

    fs::write(record_path, serialized).map_err(|error| {
        AppError::new("session-io", "Unable to write session metadata.")
            .with_details(error.to_string())
    })
}

fn build_run_summary_from_record(
    record: &SessionRecord,
    session_dir: &Path,
) -> Option<BuildRunSummary> {
    let started_at = record
        .last_build_at
        .clone()
        .unwrap_or_else(|| record.updated_at.clone());
    let preview_path = preview_path(session_dir)
        .filter(|path| path.exists())
        .map(path_to_string);

    if !record.has_preview && record.last_build_at.is_none() {
        return None;
    }

    Some(BuildRunSummary {
        run_id: format!("{}-last-build", record.id),
        session_id: record.id.clone(),
        started_at: started_at.clone(),
        finished_at: record.last_build_at.clone(),
        status: if record.has_preview {
            "succeeded".into()
        } else if record.status == "error" {
            "failed".into()
        } else if record.status == "building" {
            "running".into()
        } else {
            "idle".into()
        },
        exit_code: if record.has_preview { Some(0) } else { None },
        stdout_path: None,
        stderr_path: None,
        preview_path,
    })
}

fn update_session_view_record(
    session_dir: &Path,
    view: &str,
    session_id: Option<String>,
) -> Result<(), AppError> {
    if !matches!(view, "preview" | "source" | "inspect") {
        let error = AppError::new(
            "ui-validation",
            "Session view must be preview, source, or inspect.",
        );

        return Err(match session_id {
            Some(id) => error.with_session(id),
            None => error,
        });
    }

    let mut record = read_session_record(session_dir)?;
    record.current_view = view.to_string();
    write_session_record(session_dir, &record)
}

fn preview_path(session_dir: &Path) -> Option<PathBuf> {
    let path = session_dir.join(BUILD_DIR_NAME).join("index.html");
    if path.exists() {
        Some(path)
    } else {
        None
    }
}

fn read_latest_log(logs_dir: &Path, suffix: &str) -> Option<String> {
    let mut matches = fs::read_dir(logs_dir)
        .ok()?
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| {
            path.file_name()
                .and_then(|name| name.to_str())
                .map(|name| name.ends_with(suffix))
                .unwrap_or(false)
        })
        .collect::<Vec<_>>();

    matches.sort();
    let latest = matches.pop()?;
    fs::read_to_string(latest).ok()
}

fn diagnostics_from_inspect_payload(payload: &Value, exit_code: Option<i32>) -> Vec<DiagnosticItem> {
    if payload.get("kind").and_then(Value::as_str) == Some("agent-html-inspection") {
        return Vec::new();
    }

    if exit_code != Some(0) {
        return vec![DiagnosticItem {
            id: "inspect-failed".into(),
            severity: "error".into(),
            message: "Inspect failed before machine-readable diagnostics were available. Check the inspect logs.".into(),
            source: "inspect".into(),
            line: None,
            column: None,
            code: Some("inspect-failed".into()),
        }];
    }

    Vec::new()
}

fn diagnostics_from_validation_payload(
    payload: &Value,
    exit_code: Option<i32>,
) -> Vec<DiagnosticItem> {
    let Some(kind) = payload.get("kind").and_then(Value::as_str) else {
        return validation_fallback_diagnostics(exit_code);
    };

    if kind != "agent-html-validation-result" {
        return validation_fallback_diagnostics(exit_code);
    }

    let diagnostics = payload
        .get("diagnostics")
        .and_then(Value::as_array)
        .map(|items| {
            items
                .iter()
                .enumerate()
                .map(|(index, item)| DiagnosticItem {
                    id: format!("validation-{index}"),
                    severity: item
                        .get("severity")
                        .and_then(Value::as_str)
                        .unwrap_or("error")
                        .to_string(),
                    message: item
                        .get("message")
                        .and_then(Value::as_str)
                        .unwrap_or("Validation failed without a diagnostic message.")
                        .to_string(),
                    source: item
                        .get("path")
                        .and_then(Value::as_str)
                        .unwrap_or("validation")
                        .to_string(),
                    line: None,
                    column: None,
                    code: item
                        .get("code")
                        .and_then(Value::as_str)
                        .map(|code| code.to_string()),
                })
                .collect::<Vec<_>>()
        })
        .unwrap_or_default();

    if diagnostics.is_empty() && exit_code != Some(0) {
        return validation_fallback_diagnostics(exit_code);
    }

    diagnostics
}

fn structure_summary_from_inspection(inspection: &Value) -> String {
    let Some(components) = inspection.get("components").and_then(Value::as_array) else {
        return "Inspection data is missing component counts.".into();
    };

    if components.is_empty() {
        return "No components found.".into();
    }

    components
        .iter()
        .map(|component| {
            let name = component
                .get("name")
                .and_then(Value::as_str)
                .unwrap_or("unknown");
            let count = component
                .get("count")
                .and_then(Value::as_u64)
                .unwrap_or(0);
            format!("{name} x{count}")
        })
        .collect::<Vec<_>>()
        .join(", ")
}

fn structure_summary_from_inspection_value(payload: &Value) -> String {
    if payload.get("kind").and_then(Value::as_str) == Some("agent-html-inspection") {
        return structure_summary_from_inspection(payload);
    }

    "No inspection summary available yet.".into()
}

fn structure_summary_from_validation_payload(payload: &Value) -> String {
    if payload.get("kind").and_then(Value::as_str) != Some("agent-html-validation-result") {
        return "Validation summary unavailable.".into();
    }

    if payload.get("ok").and_then(Value::as_bool) == Some(true) {
        if let Some(inspection) = payload.get("inspection") {
            return structure_summary_from_inspection(inspection);
        }

        return "Validation passed without an inspection summary.".into();
    }

    "Validation reported source issues.".into()
}

fn validation_fallback_diagnostics(exit_code: Option<i32>) -> Vec<DiagnosticItem> {
    if exit_code == Some(0) {
        return Vec::new();
    }

    vec![DiagnosticItem {
        id: "validation-failed".into(),
        severity: "error".into(),
        message: "Validation failed before structured diagnostics were available. Check the validation logs.".into(),
        source: "validation".into(),
        line: None,
        column: None,
        code: Some("validation-failed".into()),
    }]
}

fn default_source(name: &str) -> String {
    format!(
        "<meta-agent profile=\"report-default\" />\n\n<page title=\"{name}\">\n  <card title=\"Summary\">\n    Draft the first artifact content here.\n  </card>\n</page>\n"
    )
}

fn default_chat_messages() -> Vec<AgentShellMessage> {
    let created_at = now_iso_stub();

    vec![
        AgentShellMessage {
            id: format!("chat-{}", now_epoch_millis()),
            role: "system".into(),
            created_at: created_at.clone(),
            text: "Agent shell is session-backed. Live provider integration is intentionally disabled in v1.".into(),
            kind: "message".into(),
        },
        AgentShellMessage {
            id: format!("chat-{}", now_epoch_millis() + 1),
            role: "placeholder".into(),
            created_at,
            text: "Prompt drafts, placeholder replies, and future proposals are persisted in chat.jsonl.".into(),
            kind: "proposal-placeholder".into(),
        },
    ]
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
    format!("epoch-{}", now_epoch_millis())
}

fn path_to_string(path: PathBuf) -> String {
    path.to_string_lossy().replace('\\', "/")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let main_window = app.get_webview_window("main").expect("main window");
            main_window.set_title("agent-html-app").ok();
            ensure_sessions_root(app.handle()).expect("sessions root");
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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{read_session_record, update_session_view_record, write_session_record, SessionRecord};
    use std::fs;
    use std::path::PathBuf;
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

    fn test_session_dir(suffix: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        std::env::temp_dir().join(format!("agent-html-app-{suffix}-{nonce}"))
    }
}
