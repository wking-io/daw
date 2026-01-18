#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::{
    net::SocketAddr,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    time::Duration,
};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;
use uuid::Uuid;

#[derive(Clone)]
struct ServerInfoState(Arc<Mutex<ServerInfo>>);

/// Tracks spawned sidecar child handles for graceful shutdown.
#[derive(Clone, Default)]
struct SidecarHandles(Arc<Mutex<Vec<CommandChild>>>);

impl SidecarHandles {
    fn add(&self, child: CommandChild) {
        if let Ok(mut handles) = self.0.lock() {
            handles.push(child);
        }
    }

    fn kill_all(&self) {
        if let Ok(mut handles) = self.0.lock() {
            for child in handles.drain(..) {
                let _ = child.kill();
            }
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ServerInfo {
    base_url: String,
    token: String,
}

#[tauri::command]
async fn get_server_info(state: tauri::State<'_, ServerInfoState>) -> Result<ServerInfo, String> {
    let info = state.0.lock().map_err(|_| "poisoned mutex".to_string())?;
    Ok(info.clone())
}

fn get_env_port(key: &str, default: u16) -> u16 {
    std::env::var(key)
        .ok()
        .and_then(|s| s.parse::<u16>().ok())
        .unwrap_or(default)
}

fn mcp_port() -> u16 {
    get_env_port("DAW_MCP_PORT", 43124)
}

fn state_port() -> u16 {
    get_env_port("DAW_STATE_PORT", 43125)
}

/// Check if a port is available by attempting to bind to it.
fn is_port_available(port: u16) -> bool {
    std::net::TcpListener::bind(SocketAddr::from(([127, 0, 0, 1], port))).is_ok()
}

/// Find an available port starting from the given port.
/// If the given port is available, use it. Otherwise, find the next available port.
fn find_available_port(preferred: u16) -> Option<u16> {
    if is_port_available(preferred) {
        return Some(preferred);
    }

    // Search for an available port in a range around the preferred port
    for offset in 1..100 {
        let candidate = preferred.wrapping_add(offset);
        if is_port_available(candidate) {
            eprintln!(
                "[daw] Port {} unavailable, using {} instead",
                preferred, candidate
            );
            return Some(candidate);
        }
    }
    None
}

/// Wait for a health check endpoint to respond successfully.
async fn wait_for_health(base_url: &str, token: &str, timeout: Duration) -> bool {
    let client = match reqwest::Client::builder()
        .timeout(Duration::from_secs(2))
        .build()
    {
        Ok(c) => c,
        Err(_) => return false,
    };

    let url = format!("{}/health", base_url);
    let start = std::time::Instant::now();

    while start.elapsed() < timeout {
        let request = client
            .get(&url)
            .header("Authorization", format!("Bearer {}", token));
        if let Ok(resp) = request.send().await {
            if resp.status().is_success() {
                return true;
            }
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }

    false
}

#[cfg(test)]
mod tests {
    use super::*;

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
    fn is_port_available_detects_used_ports() {
        // Bind to a port
        let listener = std::net::TcpListener::bind("127.0.0.1:0").expect("bind");
        let used_port = listener.local_addr().expect("addr").port();

        // The port should now be unavailable
        assert!(!is_port_available(used_port));

        // Drop the listener
        drop(listener);

        // Now it should be available (may need a small delay on some systems)
        std::thread::sleep(std::time::Duration::from_millis(10));
        assert!(is_port_available(used_port));
    }
}

fn main() {
    let server_info = ServerInfoState(Arc::new(Mutex::new(ServerInfo {
        base_url: String::new(),
        token: String::new(),
    })));
    let sidecar_handles = SidecarHandles::default();
    let shutdown_flag = Arc::new(AtomicBool::new(false));

    // Clone for use after setup closure moves the originals
    let sidecar_handles_for_cleanup = sidecar_handles.clone();

    tauri::Builder::default()
        .manage(server_info.clone())
        .manage(sidecar_handles.clone())
        .invoke_handler(tauri::generate_handler![get_server_info])
        .plugin(tauri_plugin_shell::init())
        .on_window_event({
            let sidecar_handles = sidecar_handles.clone();
            let shutdown_flag = shutdown_flag.clone();
            move |_window, event| {
                if let tauri::WindowEvent::CloseRequested { .. } = event {
                    eprintln!("[daw] Window closing, terminating sidecars...");
                    shutdown_flag.store(true, Ordering::SeqCst);
                    sidecar_handles.kill_all();
                }
            }
        })
        .setup(move |app| {
            let server_info = server_info.clone();
            let sidecar_handles = sidecar_handles.clone();
            let shutdown_flag = shutdown_flag.clone();

            // Allocate ports dynamically to avoid conflicts
            let final_mcp_port =
                find_available_port(mcp_port()).expect("failed to find available MCP port");
            let final_state_port =
                find_available_port(state_port()).expect("failed to find available state port");

            eprintln!(
                "[daw] Using ports: MCP={} STATE={}",
                final_mcp_port, final_state_port
            );

            let state_token = Uuid::new_v4().to_string();
            let state_base_url = format!("http://127.0.0.1:{}", final_state_port);

            {
                let mut info = server_info.0.lock().expect("poisoned mutex");
                info.base_url = state_base_url.clone();
                info.token = state_token.clone();
            }

            // Start the state server sidecar FIRST (MCP depends on it)
            let statecar = app
                .shell()
                .sidecar("daw-server")
                .expect("failed to create daw-server sidecar command")
                .env("DAW_STATE_PORT", format!("{}", final_state_port))
                .env("DAW_STATE_TOKEN", state_token.clone());

            let (mut state_rx, state_child) = statecar
                .spawn()
                .expect("failed to spawn daw-server sidecar");

            sidecar_handles.add(state_child);

            let shutdown_flag_state = shutdown_flag.clone();
            tauri::async_runtime::spawn(async move {
                while let Some(event) = state_rx.recv().await {
                    if shutdown_flag_state.load(Ordering::SeqCst) {
                        break;
                    }
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
                            break;
                        }
                        _ => {}
                    }
                }
            });

            // Spawn the MCP sidecar in setup (not in an async block that escapes)
            let mcp_sidecar = app
                .shell()
                .sidecar("daw-mcp")
                .expect("failed to create daw-mcp sidecar command")
                .env("DAW_MCP_PORT", format!("{}", final_mcp_port))
                .env("DAW_STATE_PORT", format!("{}", final_state_port));

            // Wait for state server to be healthy, then spawn MCP
            let state_base_url_clone = state_base_url.clone();
            let state_token_clone = state_token.clone();
            let sidecar_handles_mcp = sidecar_handles.clone();
            let shutdown_flag_mcp = shutdown_flag.clone();

            tauri::async_runtime::spawn(async move {
                eprintln!("[daw] Waiting for state server to be ready...");

                if !wait_for_health(
                    &state_base_url_clone,
                    &state_token_clone,
                    Duration::from_secs(30),
                )
                .await
                {
                    eprintln!(
                        "[daw] Warning: State server health check timed out, continuing anyway"
                    );
                } else {
                    eprintln!("[daw] State server is ready");
                }

                if shutdown_flag_mcp.load(Ordering::SeqCst) {
                    return;
                }

                // Now spawn the MCP sidecar
                let (mut rx, child) = match mcp_sidecar.spawn() {
                    Ok(result) => result,
                    Err(e) => {
                        eprintln!("[daw] Failed to spawn daw-mcp sidecar: {}", e);
                        return;
                    }
                };

                sidecar_handles_mcp.add(child);

                while let Some(event) = rx.recv().await {
                    if shutdown_flag_mcp.load(Ordering::SeqCst) {
                        break;
                    }
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
                            break;
                        }
                        _ => {}
                    }
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    // Ensure sidecars are terminated on exit
    eprintln!("[daw] Application exiting, cleaning up...");
    sidecar_handles_for_cleanup.kill_all();
}
