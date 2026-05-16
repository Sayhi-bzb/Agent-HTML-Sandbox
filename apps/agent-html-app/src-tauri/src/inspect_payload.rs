use super::DiagnosticItem;
use serde_json::Value;

pub(super) fn diagnostics_from_inspect_payload(
    payload: &Value,
    exit_code: Option<i32>,
) -> Vec<DiagnosticItem> {
    if payload.get("kind").and_then(Value::as_str) == Some("agent-html-inspection") {
        return Vec::new();
    }

    if exit_code != Some(0) {
        return vec![DiagnosticItem {
            id: "inspect-failed".into(),
            severity: "error".into(),
            message:
                "Inspect failed before machine-readable diagnostics were available. Check the inspect logs.".into(),
            source: "inspect".into(),
            line: None,
            column: None,
            code: Some("inspect-failed".into()),
        }];
    }

    Vec::new()
}

pub(super) fn diagnostics_from_validation_payload(
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

pub(super) fn structure_summary_from_inspection(inspection: &Value) -> String {
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

pub(super) fn structure_summary_from_inspection_value(payload: &Value) -> String {
    if payload.get("kind").and_then(Value::as_str) == Some("agent-html-inspection") {
        return structure_summary_from_inspection(payload);
    }

    "No inspection summary available yet.".into()
}

pub(super) fn structure_summary_from_validation_payload(payload: &Value) -> String {
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

pub(super) fn validation_fallback_diagnostics(
    exit_code: Option<i32>,
) -> Vec<DiagnosticItem> {
    if exit_code == Some(0) {
        return Vec::new();
    }

    vec![DiagnosticItem {
        id: "validation-failed".into(),
        severity: "error".into(),
        message:
            "Validation failed before structured diagnostics were available. Check the validation logs.".into(),
        source: "validation".into(),
        line: None,
        column: None,
        code: Some("validation-failed".into()),
    }]
}

#[cfg(test)]
mod tests {
    use super::{
        diagnostics_from_inspect_payload, diagnostics_from_validation_payload,
        structure_summary_from_inspection_value,
        structure_summary_from_validation_payload,
    };
    use serde_json::json;

    #[test]
    fn diagnostics_from_validation_payload_maps_machine_readable_diagnostics() {
        let payload = json!({
            "kind": "agent-html-validation-result",
            "ok": false,
            "diagnostics": [
                {
                    "severity": "error",
                    "message": "Missing <page> root.",
                    "path": "/0",
                    "code": "missing-root"
                }
            ]
        });

        let diagnostics = diagnostics_from_validation_payload(&payload, Some(1));
        assert_eq!(diagnostics.len(), 1);
        assert_eq!(diagnostics[0].message, "Missing <page> root.");
        assert_eq!(diagnostics[0].source, "/0");
        assert_eq!(diagnostics[0].code.as_deref(), Some("missing-root"));
    }

    #[test]
    fn diagnostics_from_validation_payload_falls_back_when_payload_is_missing() {
        let diagnostics = diagnostics_from_validation_payload(&json!({}), Some(1));
        assert_eq!(diagnostics[0].code.as_deref(), Some("validation-failed"));
    }

    #[test]
    fn diagnostics_from_inspect_payload_returns_error_when_inspect_fails_without_json() {
        let diagnostics = diagnostics_from_inspect_payload(&json!({}), Some(1));
        assert_eq!(diagnostics[0].code.as_deref(), Some("inspect-failed"));
    }

    #[test]
    fn structure_summary_from_validation_payload_prefers_embedded_inspection() {
        let payload = json!({
            "kind": "agent-html-validation-result",
            "ok": true,
            "inspection": {
                "components": [
                    { "name": "card", "count": 2 },
                    { "name": "page", "count": 1 }
                ]
            }
        });

        assert_eq!(
            structure_summary_from_validation_payload(&payload),
            "card x2, page x1"
        );
    }

    #[test]
    fn structure_summary_from_inspection_value_handles_machine_readable_inspection() {
        let payload = json!({
            "kind": "agent-html-inspection",
            "components": [
                { "name": "alert", "count": 1 },
                { "name": "page", "count": 1 }
            ]
        });

        assert_eq!(
            structure_summary_from_inspection_value(&payload),
            "alert x1, page x1"
        );
    }
}
