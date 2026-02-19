use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{AppHandle, Manager};

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub api_key: String,
    pub topic_slug: String,
    pub update_interval: String,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            api_key: String::new(),
            topic_slug: String::new(),
            update_interval: "manual".to_string(),
        }
    }
}

fn settings_path(app: &AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("settings.json")
}

pub fn load_settings_inner(app: &AppHandle) -> Settings {
    let path = settings_path(app);
    if path.exists() {
        if let Ok(data) = fs::read_to_string(&path) {
            if let Ok(settings) = serde_json::from_str::<Settings>(&data) {
                return settings;
            }
        }
    }
    Settings::default()
}

#[tauri::command]
pub fn get_settings(app: AppHandle) -> Settings {
    load_settings_inner(&app)
}

#[tauri::command]
pub fn save_settings(
    app: AppHandle,
    state: tauri::State<'_, crate::AppState>,
    settings: Settings,
) -> Result<bool, String> {
    let path = settings_path(&app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;

    // Restart scheduler with new interval
    crate::scheduler::stop_scheduler_inner(&state);
    if settings.update_interval != "manual" {
        crate::scheduler::start_scheduler_inner(&state, settings, app);
    }

    Ok(true)
}
