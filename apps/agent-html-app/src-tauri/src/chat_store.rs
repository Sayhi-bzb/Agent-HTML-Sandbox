use super::{
    AgentShellMessage, AppError, BackendError, CHAT_FILE_NAME, now_epoch_millis,
    now_iso_stub,
};
use camino::Utf8Path;
use fs_err as fs;

pub(super) fn read_chat_messages(
    session_dir: &Utf8Path,
) -> Result<Vec<AgentShellMessage>, AppError> {
    let chat_path = session_dir.join(CHAT_FILE_NAME);

    if !chat_path.exists() {
        let defaults = default_chat_messages();
        write_chat_messages(session_dir, &defaults)?;
        return Ok(defaults);
    }

    let source = fs::read_to_string(&chat_path).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to read chat log.",
            error,
        ))
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
                AppError::from(BackendError::json(
                    "session-io",
                    format!("Invalid chat log entry at line {}.", index + 1),
                    error,
                ))
            })
        })
        .collect()
}

pub(super) fn write_chat_messages(
    session_dir: &Utf8Path,
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
                    AppError::from(BackendError::json(
                        "session-io",
                        "Unable to serialize chat messages.",
                        error,
                    ))
                })?
                .join("\n")
        )
    };

    fs::write(chat_path, content).map_err(|error| {
        AppError::from(BackendError::session_io(
            "Unable to write chat log.",
            error,
        ))
    })
}

pub(super) fn append_chat_message_to_file(
    session_dir: &Utf8Path,
    message: &AgentShellMessage,
) -> Result<(), AppError> {
    let mut messages = read_chat_messages(session_dir)?;
    messages.push(message.clone());
    write_chat_messages(session_dir, &messages)
}

pub(super) fn default_chat_messages() -> Vec<AgentShellMessage> {
    let created_at = now_iso_stub();

    vec![
        AgentShellMessage {
            id: format!("chat-{}", now_epoch_millis()),
            role: "system".into(),
            created_at: created_at.clone(),
            text: "Agent shell is session-backed. Live provider integration is intentionally disabled in v1.".into(),
            kind: "message".into(),
            proposal_snapshot: None,
        },
        AgentShellMessage {
            id: format!("chat-{}", now_epoch_millis() + 1),
            role: "placeholder".into(),
            created_at,
            text: "Prompt drafts, placeholder replies, and future proposals are persisted in chat.jsonl.".into(),
            kind: "proposal-placeholder".into(),
            proposal_snapshot: None,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::{append_chat_message_to_file, read_chat_messages};
    use crate::{AgentShellMessage, ProposalSnapshot};
    use camino::Utf8PathBuf;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    #[test]
    fn append_chat_message_to_file_creates_and_appends_messages() {
        let session_dir = test_session_dir("chat-store");
        fs::create_dir_all(&session_dir).expect("create session dir");

        append_chat_message_to_file(
            &session_dir,
            &AgentShellMessage {
                id: "chat-user".into(),
                role: "user".into(),
                created_at: "2026-05-16T10:00:00Z".into(),
                text: "Hello".into(),
                kind: "message".into(),
                proposal_snapshot: Some(ProposalSnapshot {
                    source: "<page />".into(),
                    line_count: 1,
                }),
            },
        )
        .expect("append message");

        let messages = read_chat_messages(&session_dir).expect("read messages");
        assert_eq!(messages.len(), 3);
        assert_eq!(messages.last().expect("last").text, "Hello");

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
