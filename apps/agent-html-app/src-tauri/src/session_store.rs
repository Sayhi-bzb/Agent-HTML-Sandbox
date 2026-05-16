use super::{
    AppError, BackendError, SessionDetail, SessionRecord, SessionSummary,
    build_run_summary_from_record, path_to_string, preview_path, CHAT_FILE_NAME,
    LOGS_DIR_NAME, SOURCE_FILE_NAME,
};
use camino::Utf8Path;
use fs_err as fs;

pub(super) fn load_session_detail_from_dir(
    session_dir: &Utf8Path,
) -> Result<SessionDetail, AppError> {
    let record = read_session_record(session_dir)?;
    let source_path = session_dir.join(SOURCE_FILE_NAME);
    let chat_path = session_dir.join(CHAT_FILE_NAME);
    let log_directory = session_dir.join(LOGS_DIR_NAME);
    let source = fs::read_to_string(&source_path).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to read source file.",
            error,
        ))
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
        preview_path: preview_path(session_dir)
            .filter(|path| path.exists())
            .map(path_to_string),
        last_build: build_run_summary_from_record(&record, session_dir),
        log_directory: path_to_string(log_directory),
        chat_path: path_to_string(chat_path),
        current_view: record.current_view,
        source,
    })
}

pub(super) fn read_session_record(session_dir: &Utf8Path) -> Result<SessionRecord, AppError> {
    let record_path = session_dir.join(super::SESSION_FILE_NAME);
    let raw = fs::read_to_string(&record_path).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to read session metadata.",
            error,
        ))
    })?;

    serde_json::from_str(&raw).map_err(|error| {
        AppError::from(BackendError::json(
            "session-io",
            "Session metadata is invalid JSON.",
            error,
        ))
    })
}

pub(super) fn write_session_record(
    session_dir: &Utf8Path,
    record: &SessionRecord,
) -> Result<(), AppError> {
    let record_path = session_dir.join(super::SESSION_FILE_NAME);
    let serialized = serde_json::to_string_pretty(record).map_err(|error| {
        AppError::from(BackendError::json(
            "session-io",
            "Unable to serialize session metadata.",
            error,
        ))
    })?;

    fs::write(record_path, serialized).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to write session metadata.",
            error,
        ))
    })
}

pub(super) fn update_session_view_record(
    session_dir: &Utf8Path,
    view: &str,
    session_id: Option<String>,
) -> Result<(), AppError> {
    if !matches!(view, "preview" | "source" | "inspect") {
        let error = AppError::from(BackendError::ui_validation(
            "Session view must be preview, source, or inspect.",
        ));

        return Err(match session_id {
            Some(id) => error.with_session(id),
            None => error,
        });
    }

    let mut record = read_session_record(session_dir)?;
    record.current_view = view.to_string();
    write_session_record(session_dir, &record)
}
