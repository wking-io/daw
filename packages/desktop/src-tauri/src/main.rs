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
use tokio::{net::TcpListener, sync::oneshot};

#[derive(Clone)]
struct PendingRequests(Arc<Mutex<HashMap<String, oneshot::Sender<String>>>>);

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
        let mut map = state
            .0
            .lock()
            .map_err(|_| "poisoned mutex".to_string())?;
        map.remove(&request_id)
    };

    match tx {
        Some(tx) => tx.send(result_json).map_err(|_| "receiver dropped".to_string()),
        None => Err("unknown request_id".to_string()),
    }
}

fn ipc_port() -> u16 {
    std::env::var("DAW_IPC_PORT")
        .ok()
        .and_then(|s| s.parse::<u16>().ok())
        .unwrap_or(43123)
}

fn main() {
    let pending = PendingRequests(Arc::new(Mutex::new(HashMap::new())));

    tauri::Builder::default()
        .manage(pending.clone())
        .invoke_handler(tauri::generate_handler![respond_daw_command])
        .setup(move |app| {
            let handle = app.handle().clone();
            let pending = pending.clone();

            tauri::async_runtime::spawn(async move {
                let port = ipc_port();
                let addr = SocketAddr::from(([127, 0, 0, 1], port));

                let handle_for_router = handle.clone();
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
                                        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

                                    let result =
                                        tokio::time::timeout(Duration::from_secs(10), rx)
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
                    .with_state(pending);

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

