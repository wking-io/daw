#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use axum::{extract::State, http::StatusCode, routing::post, Json, Router};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashMap,
    net::SocketAddr,
    sync::{Arc, Mutex},
    time::Duration,
};
use tauri::Emitter;
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;
use tokio::{net::TcpListener, sync::oneshot};
use tower_http::cors::{Any, CorsLayer};
use uuid::Uuid;

#[derive(Clone)]
struct PendingRequests(Arc<Mutex<HashMap<String, oneshot::Sender<String>>>>);

#[derive(Clone)]
struct ServerInfoState(Arc<Mutex<ServerInfo>>);

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ServerInfo {
    base_url: String,
    token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DawCommandRequest {
    request_id: String,
    name: String,
    payload: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CommandHttpRequest {
    #[serde(rename = "requestId")]
    request_id: String,
    name: String,
    payload: serde_json::Value,
}

#[tauri::command]
async fn respond_daw_command(
    state: tauri::State<'_, PendingRequests>,
    request_id: String,
    result_json: String,
) -> Result<(), String> {
    let tx = {
        let mut map = state.0.lock().map_err(|_| "poisoned mutex".to_string())?;
        map.remove(&request_id)
    };

    match tx {
        Some(tx) => tx
            .send(result_json)
            .map_err(|_| "receiver dropped".to_string()),
        None => Err("unknown request_id".to_string()),
    }
}

#[tauri::command]
async fn get_server_info(state: tauri::State<'_, ServerInfoState>) -> Result<ServerInfo, String> {
    let info = state.0.lock().map_err(|_| "poisoned mutex".to_string())?;
    Ok(info.clone())
}

fn ipc_port() -> u16 {
    std::env::var("DAW_IPC_PORT")
        .ok()
        .and_then(|s| s.parse::<u16>().ok())
        .unwrap_or(43123)
}

fn mcp_port() -> u16 {
    std::env::var("DAW_MCP_PORT")
        .ok()
        .and_then(|s| s.parse::<u16>().ok())
        .unwrap_or(43124)
}

fn state_port() -> u16 {
    std::env::var("DAW_STATE_PORT")
        .ok()
        .and_then(|s| s.parse::<u16>().ok())
        .unwrap_or(43125)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_ipc_port_from_env_or_defaults() {
        std::env::remove_var("DAW_IPC_PORT");
        assert_eq!(ipc_port(), 43123);

        std::env::set_var("DAW_IPC_PORT", "50001");
        assert_eq!(ipc_port(), 50001);

        std::env::set_var("DAW_IPC_PORT", "not-a-number");
        assert_eq!(ipc_port(), 43123);
    }

    #[test]
    fn parses_mcp_port_from_env_or_defaults() {
        std::env::remove_var("DAW_MCP_PORT");
        assert_eq!(mcp_port(), 43124);

        std::env::set_var("DAW_MCP_PORT", "50002");
        assert_eq!(mcp_port(), 50002);

        std::env::set_var("DAW_MCP_PORT", "not-a-number");
        assert_eq!(mcp_port(), 43124);
    }

    #[test]
    fn parses_state_port_from_env_or_defaults() {
        std::env::remove_var("DAW_STATE_PORT");
        assert_eq!(state_port(), 43125);

        std::env::set_var("DAW_STATE_PORT", "50003");
        assert_eq!(state_port(), 50003);

        std::env::set_var("DAW_STATE_PORT", "not-a-number");
        assert_eq!(state_port(), 43125);
    }

    #[test]
    fn command_http_request_serde_shape_matches_expected() {
        let json = serde_json::json!({
            "requestId": "abc",
            "name": "daw.instrument.create",
            "payload": { "type": "synth", "name": "Bass" }
        });

        let req: CommandHttpRequest = serde_json::from_value(json).expect("deserialize");
        assert_eq!(req.request_id, "abc");
        assert_eq!(req.name, "daw.instrument.create");
        assert!(req.payload.is_object());
    }
}

fn main() {
    let pending = PendingRequests(Arc::new(Mutex::new(HashMap::new())));
    let server_info = ServerInfoState(Arc::new(Mutex::new(ServerInfo {
        base_url: String::new(),
        token: String::new(),
    })));

    tauri::Builder::default()
        .manage(pending.clone())
        .manage(server_info.clone())
        .invoke_handler(tauri::generate_handler![
            respond_daw_command,
            get_server_info
        ])
        .plugin(tauri_plugin_shell::init())
        .setup(move |app| {
            let handle = app.handle().clone();
            let pending = pending.clone();
            let server_info = server_info.clone();

            // Spawn the MCP server sidecar (packaged via bundle.externalBin).
            // The sidecar hosts MCP over Streamable HTTP at http://127.0.0.1:${DAW_MCP_PORT}/mcp
            let mcp_port = mcp_port();
            let ipc_port_num = ipc_port();
            let state_port = state_port();
            let state_token = Uuid::new_v4().to_string();
            {
                let mut info = server_info.0.lock().expect("poisoned mutex");
                info.base_url = format!("http://127.0.0.1:{state_port}");
                info.token = state_token.clone();
            }
            let sidecar = app
                .shell()
                .sidecar("daw-mcp")
                .expect("failed to create daw-mcp sidecar command")
                .env("DAW_MCP_PORT", format!("{mcp_port}"))
                .env("DAW_IPC_PORT", format!("{ipc_port_num}"));

            let (mut rx, child) = sidecar.spawn().expect("failed to spawn daw-mcp sidecar");

            tauri::async_runtime::spawn(async move {
                while let Some(event) = rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            let line = String::from_utf8_lossy(&line);
                            print!("[daw-mcp] {line}");
                        }
                        CommandEvent::Stderr(line) => {
                            let line = String::from_utf8_lossy(&line);
                            eprint!("[daw-mcp] {line}");
                        }
                        CommandEvent::Terminated(payload) => {
                            eprintln!("[daw-mcp] terminated: {:?}", payload);
                        }
                        _ => {}
                    }
                }

                // Keep `child` alive for the lifetime of this task.
                // If the stream ends, we drop the handle.
                drop(child);
            });

            let statecar = app
                .shell()
                .sidecar("daw-server")
                .expect("failed to create daw-server sidecar command")
                .env("DAW_STATE_PORT", format!("{state_port}"))
                .env("DAW_STATE_TOKEN", state_token);

            let (mut state_rx, state_child) = statecar
                .spawn()
                .expect("failed to spawn daw-server sidecar");

            tauri::async_runtime::spawn(async move {
                while let Some(event) = state_rx.recv().await {
                    match event {
                        CommandEvent::Stdout(line) => {
                            let line = String::from_utf8_lossy(&line);
                            print!("[daw-server] {line}");
                        }
                        CommandEvent::Stderr(line) => {
                            let line = String::from_utf8_lossy(&line);
                            eprint!("[daw-server] {line}");
                        }
                        CommandEvent::Terminated(payload) => {
                            eprintln!("[daw-server] terminated: {:?}", payload);
                        }
                        _ => {}
                    }
                }

                drop(state_child);
            });

            tauri::async_runtime::spawn(async move {
                let port = ipc_port_num;
                let addr = SocketAddr::from(([127, 0, 0, 1], port));

                let handle_for_router = handle.clone();
                let cors = CorsLayer::new()
                    // Local-only IPC, allow any origin (dev server, Tauri webview, etc.)
                    .allow_origin(Any)
                    .allow_headers(Any)
                    .allow_methods(Any);

                let router = Router::new()
                    .route(
                        "/command",
                        post(
                            move |State(state): State<PendingRequests>,
                                  Json(req): Json<CommandHttpRequest>| {
                                let handle = handle_for_router.clone();
                                async move {
                                    let (tx, rx) = oneshot::channel::<String>();
                                    {
                                        let mut map = state.0.lock().map_err(|_| {
                                            (
                                                StatusCode::INTERNAL_SERVER_ERROR,
                                                "poisoned mutex".to_string(),
                                            )
                                        })?;
                                        map.insert(req.request_id.clone(), tx);
                                    }

                                    let event_payload = DawCommandRequest {
                                        request_id: req.request_id.clone(),
                                        name: req.name,
                                        payload: req.payload,
                                    };

                                    handle
                                        .emit_to("main", "daw:command", event_payload)
                                        .map_err(|e| {
                                            (StatusCode::INTERNAL_SERVER_ERROR, e.to_string())
                                        })?;

                                    let result = tokio::time::timeout(Duration::from_secs(10), rx)
                                        .await
                                        .map_err(|_| {
                                            (
                                                StatusCode::GATEWAY_TIMEOUT,
                                                "timeout waiting for UI response".to_string(),
                                            )
                                        })?
                                        .map_err(|_| {
                                            (
                                                StatusCode::BAD_GATEWAY,
                                                "UI response channel dropped".to_string(),
                                            )
                                        })?;

                                    let parsed: serde_json::Value = serde_json::from_str(&result)
                                        .unwrap_or_else(|_| {
                                            serde_json::json!({
                                              "ok": false,
                                              "error": "UI returned non-JSON response"
                                            })
                                        });

                                    Ok::<Json<serde_json::Value>, (StatusCode, String)>(Json(
                                        parsed,
                                    ))
                                }
                            },
                        ),
                    )
                    .with_state(pending)
                    .layer(cors);

                let listener = TcpListener::bind(addr)
                    .await
                    .expect("failed to bind IPC HTTP server");

                axum::serve(listener, router)
                    .await
                    .expect("IPC HTTP server crashed");
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
