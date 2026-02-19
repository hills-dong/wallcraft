mod screens;
mod settings;
mod wallpaper;
mod scheduler;

use std::sync::Mutex;
use tauri::{
    Manager,
    menu::{Menu, MenuItem},
    tray::{MouseButton, TrayIconBuilder, TrayIconEvent},
    Emitter,
};

pub struct AppState {
    pub scheduler_abort: Mutex<Option<tokio::task::AbortHandle>>,
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            app.manage(AppState {
                scheduler_abort: Mutex::new(None),
            });

            // System tray
            let open_i = MenuItem::with_id(app, "open", "Open WallCraft", true, None::<&str>)?;
            let next_i = MenuItem::with_id(app, "next", "Next Wallpaper", true, None::<&str>)?;
            let sep = tauri::menu::PredefinedMenuItem::separator(app)?;
            let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open_i, &next_i, &sep, &quit_i])?;

            TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("WallCraft")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "next" => {
                        let _ = app.emit("next-wallpaper", ());
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        ..
                    } = event
                    {
                        if let Some(window) = tray.app_handle().get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Start scheduler from saved settings
            let app_handle = app.handle().clone();
            let saved = settings::load_settings_inner(&app_handle);
            if saved.update_interval != "manual" {
                let state = app.state::<AppState>();
                scheduler::start_scheduler_inner(&state, saved, app_handle);
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            screens::get_screens,
            screens::refresh_screens,
            wallpaper::apply_wallpaper,
            settings::get_settings,
            settings::save_settings,
            scheduler::start_scheduler_cmd,
            scheduler::stop_scheduler_cmd,
        ])
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
