use serde::{Deserialize, Serialize};
use tauri::WebviewWindow;

#[derive(Serialize, Deserialize, Clone, Debug)]
#[serde(rename_all = "camelCase")]
pub struct ScreenInfo {
    pub id: String,
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub scale_factor: f64,
}

pub fn collect_screens(window: &WebviewWindow) -> Vec<ScreenInfo> {
    window
        .available_monitors()
        .unwrap_or_default()
        .into_iter()
        .enumerate()
        .map(|(i, m)| {
            let pos = m.position();
            let size = m.size();
            let scale = m.scale_factor();
            // Convert physical pixels to logical pixels
            let logical_x = (pos.x as f64 / scale).round() as i32;
            let logical_y = (pos.y as f64 / scale).round() as i32;
            let logical_w = (size.width as f64 / scale).round() as u32;
            let logical_h = (size.height as f64 / scale).round() as u32;
            ScreenInfo {
                id: i.to_string(),
                name: m.name().unwrap_or_else(|| format!("Display {}", i + 1)),
                x: logical_x,
                y: logical_y,
                width: logical_w,
                height: logical_h,
                scale_factor: scale,
            }
        })
        .collect()
}

#[tauri::command]
pub fn get_screens(window: WebviewWindow) -> Vec<ScreenInfo> {
    collect_screens(&window)
}

#[tauri::command]
pub fn refresh_screens(window: WebviewWindow) -> Vec<ScreenInfo> {
    collect_screens(&window)
}
