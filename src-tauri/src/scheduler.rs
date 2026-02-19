use tauri::{AppHandle, Emitter};

fn get_interval_secs(interval: &str) -> u64 {
    match interval {
        "30min" => 30 * 60,
        "1hour" => 60 * 60,
        "6hour" => 6 * 60 * 60,
        "daily" => 24 * 60 * 60,
        _ => 0,
    }
}

pub fn start_scheduler_inner(
    state: &crate::AppState,
    settings: crate::settings::Settings,
    app: AppHandle,
) {
    stop_scheduler_inner(state);

    let secs = get_interval_secs(&settings.update_interval);
    if secs == 0 {
        return;
    }

    let handle = tokio::spawn(async move {
        loop {
            tokio::time::sleep(std::time::Duration::from_secs(secs)).await;
            let _ = app.emit("next-wallpaper", ());
        }
    });

    *state.scheduler_abort.lock().unwrap() = Some(handle.abort_handle());
}

pub fn stop_scheduler_inner(state: &crate::AppState) {
    if let Some(abort) = state.scheduler_abort.lock().unwrap().take() {
        abort.abort();
    }
}

#[tauri::command]
pub fn start_scheduler_cmd(
    app: tauri::AppHandle,
    state: tauri::State<'_, crate::AppState>,
) {
    let settings = crate::settings::load_settings_inner(&app);
    if settings.update_interval != "manual" {
        start_scheduler_inner(&state, settings, app);
    }
}

#[tauri::command]
pub fn stop_scheduler_cmd(state: tauri::State<'_, crate::AppState>) {
    stop_scheduler_inner(&state);
}
