use image::{codecs::jpeg::JpegEncoder, GenericImageView};
use serde::Serialize;
use std::{fs, path::PathBuf};
use tauri::{AppHandle, Emitter, Manager};

use crate::screens::ScreenInfo;

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct WallpaperStatus {
    screen_id: String,
    status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
}

fn wallpaper_dir(app: &AppHandle) -> PathBuf {
    app.path().app_data_dir().unwrap().join("wallpapers")
}

fn emit_status(app: &AppHandle, screen_id: &str, status: &str, error: Option<&str>) {
    let _ = app.emit(
        "wallpaper-status",
        WallpaperStatus {
            screen_id: screen_id.to_string(),
            status: status.to_string(),
            error: error.map(|s| s.to_string()),
        },
    );
}

async fn download_image(url: &str) -> Result<Vec<u8>, String> {
    let client = reqwest::Client::builder()
        .user_agent("WallCraft/1.0")
        .build()
        .map_err(|e| e.to_string())?;
    let response = client.get(url).send().await.map_err(|e| e.to_string())?;
    if !response.status().is_success() {
        return Err(format!("HTTP {}", response.status()));
    }
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    Ok(bytes.to_vec())
}

#[derive(Clone)]
struct TotalBounds {
    min_x: i32,
    min_y: i32,
    total_width: u32,
    total_height: u32,
}

fn crop_and_save(
    image_bytes: Vec<u8>,
    screen: ScreenInfo,
    total_bounds: TotalBounds,
    output_path: PathBuf,
) -> Result<(), String> {
    let img = image::load_from_memory(&image_bytes).map_err(|e| e.to_string())?;
    let (img_width, img_height) = img.dimensions();

    let scale_x = img_width as f64 / total_bounds.total_width as f64;
    let scale_y = img_height as f64 / total_bounds.total_height as f64;
    let scale = scale_x.max(scale_y);

    let scaled_total_w = total_bounds.total_width as f64 * scale;
    let scaled_total_h = total_bounds.total_height as f64 * scale;
    let offset_x = ((img_width as f64 - scaled_total_w) / 2.0).round() as i64;
    let offset_y = ((img_height as f64 - scaled_total_h) / 2.0).round() as i64;

    let raw_cx = ((screen.x - total_bounds.min_x) as f64 * scale + offset_x as f64).round() as i64;
    let raw_cy = ((screen.y - total_bounds.min_y) as f64 * scale + offset_y as f64).round() as i64;

    let crop_x = raw_cx.max(0) as u32;
    let crop_y = raw_cy.max(0) as u32;
    let crop_width = ((screen.width as f64 * scale).round() as u32)
        .min(img_width.saturating_sub(crop_x))
        .max(1);
    let crop_height = ((screen.height as f64 * scale).round() as u32)
        .min(img_height.saturating_sub(crop_y))
        .max(1);

    let out_w = (screen.width as f64 * screen.scale_factor).round() as u32;
    let out_h = (screen.height as f64 * screen.scale_factor).round() as u32;

    let cropped = img.crop_imm(crop_x, crop_y, crop_width, crop_height);
    let resized = cropped.resize_exact(
        out_w.max(1),
        out_h.max(1),
        image::imageops::FilterType::Lanczos3,
    );

    let file = fs::File::create(&output_path).map_err(|e| e.to_string())?;
    let encoder = JpegEncoder::new_with_quality(file, 95);
    resized
        .write_with_encoder(encoder)
        .map_err(|e| e.to_string())?;

    Ok(())
}

async fn set_wallpapers_for_all_spaces(
    screen_images: &[Option<String>],
    wdir: &PathBuf,
) -> Result<(), String> {
    #[cfg(not(target_os = "macos"))]
    {
        for (i, path) in screen_images.iter().enumerate() {
            if let Some(p) = path {
                println!("[Dev] Screen {}: {}", i, p);
            }
        }
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        let valid: Vec<(usize, &str)> = screen_images
            .iter()
            .enumerate()
            .filter_map(|(i, p)| p.as_deref().map(|s| (i, s)))
            .collect();

        if valid.is_empty() {
            return Ok(());
        }

        let max_idx = valid.iter().map(|(i, _)| *i).max().unwrap_or(0);
        let list_items: Vec<String> = (0..=max_idx)
            .map(|i| {
                let entry = valid.iter().find(|(idx, _)| *idx == i);
                let safe = entry
                    .map(|(_, p)| p.replace('\\', "\\\\").replace('"', "\\\""))
                    .unwrap_or_default();
                format!("\"{}\"", safe)
            })
            .collect();
        let image_paths_list = format!("{{{}}}", list_items.join(", "));

        // JXA — NSWorkspace visual refresh
        let ns_assignments: Vec<String> = valid
            .iter()
            .map(|(idx, path)| {
                let safe = path.replace('\\', "\\\\").replace('"', "\\\"");
                format!(
                    "  if ({idx} < screens.count()) {{\n    ws.setDesktopImageURLForScreenOptionsError(\n      $.NSURL.fileURLWithPath($(\"{safe}\")),\n      screens.objectAtIndex({idx}),\n      {{}},\n      0\n    );\n  }}"
                )
            })
            .collect();
        let jxa_script = format!(
            "ObjC.import('AppKit');\nvar ws = $.NSWorkspace.sharedWorkspace;\nvar screens = $.NSScreen.screens;\n{}",
            ns_assignments.join("\n")
        );

        let jxa_path = wdir.join("set_wallpaper.js");
        fs::write(&jxa_path, &jxa_script).map_err(|e| e.to_string())?;

        let out = std::process::Command::new("osascript")
            .args(["-l", "JavaScript", jxa_path.to_str().unwrap()])
            .output()
            .map_err(|e| e.to_string())?;
        if !out.status.success() {
            return Err(String::from_utf8_lossy(&out.stderr).to_string());
        }

        // AppleScript — all-spaces persistence
        let apple_script = format!(
            r#"tell application "System Events"
  set imagePathsList to {image_paths_list}
  set allDesktops to every desktop

  set displayNamesOrdered to {{}}
  repeat with d in allDesktops
    set dn to display name of d
    if displayNamesOrdered does not contain dn then
      set end of displayNamesOrdered to dn
    end if
  end repeat

  repeat with d in allDesktops
    set dn to display name of d
    repeat with i from 1 to count of displayNamesOrdered
      if item i of displayNamesOrdered is dn then
        if i <= count of imagePathsList then
          set imgPath to item i of imagePathsList
          if imgPath is not "" then
            tell d
              set picture to POSIX file imgPath
            end tell
          end if
        end if
        exit repeat
      end if
    end repeat
  end repeat
end tell"#
        );

        let as_path = wdir.join("set_wallpaper.applescript");
        fs::write(&as_path, &apple_script).map_err(|e| e.to_string())?;

        let out = std::process::Command::new("osascript")
            .arg(as_path.to_str().unwrap())
            .output()
            .map_err(|e| e.to_string())?;
        if !out.status.success() {
            return Err(String::from_utf8_lossy(&out.stderr).to_string());
        }

        Ok(())
    }
}

#[tauri::command]
pub async fn apply_wallpaper(
    photo_url: String,
    app: AppHandle,
    window: tauri::WebviewWindow,
) -> Result<bool, String> {
    let wdir = wallpaper_dir(&app);
    fs::create_dir_all(&wdir).map_err(|e| e.to_string())?;

    let screens = crate::screens::collect_screens(&window);

    if screens.is_empty() {
        return Err("No screens detected".to_string());
    }

    // Calculate total virtual desktop bounds
    let min_x = screens.iter().map(|s| s.x).min().unwrap_or(0);
    let min_y = screens.iter().map(|s| s.y).min().unwrap_or(0);
    let max_x = screens.iter().map(|s| s.x + s.width as i32).max().unwrap_or(1920);
    let max_y = screens.iter().map(|s| s.y + s.height as i32).max().unwrap_or(1080);
    let total_bounds = TotalBounds {
        min_x,
        min_y,
        total_width: (max_x - min_x) as u32,
        total_height: (max_y - min_y) as u32,
    };

    // Step 1: Download
    for s in &screens {
        emit_status(&app, &s.id, "downloading", None);
    }

    let image_bytes = match download_image(&photo_url).await {
        Ok(b) => b,
        Err(e) => {
            for s in &screens {
                emit_status(&app, &s.id, "error", Some(&format!("Download failed: {e}")));
            }
            return Ok(false);
        }
    };

    // Step 2: Crop each screen
    let mut cropped_paths: Vec<Option<String>> = Vec::new();
    for screen in &screens {
        emit_status(&app, &screen.id, "cropping", None);

        let output_path = wdir.join(format!("wallpaper_{}.jpg", screen.id));
        let result = tokio::task::spawn_blocking({
            let bytes = image_bytes.clone();
            let sc = screen.clone();
            let tb = total_bounds.clone();
            let op = output_path.clone();
            move || crop_and_save(bytes, sc, tb, op)
        })
        .await
        .map_err(|e| e.to_string())
        .and_then(|r| r);

        match result {
            Ok(()) => cropped_paths.push(Some(output_path.to_string_lossy().to_string())),
            Err(e) => {
                emit_status(&app, &screen.id, "error", Some(&e));
                cropped_paths.push(None);
            }
        }
    }

    // Step 3: Apply all at once
    for (screen, path) in screens.iter().zip(cropped_paths.iter()) {
        if path.is_some() {
            emit_status(&app, &screen.id, "applying", None);
        }
    }

    match set_wallpapers_for_all_spaces(&cropped_paths, &wdir).await {
        Ok(()) => {
            for (screen, path) in screens.iter().zip(cropped_paths.iter()) {
                if path.is_some() {
                    emit_status(&app, &screen.id, "success", None);
                }
            }
        }
        Err(e) => {
            for (screen, path) in screens.iter().zip(cropped_paths.iter()) {
                if path.is_some() {
                    emit_status(&app, &screen.id, "error", Some(&e));
                }
            }
            return Ok(false);
        }
    }

    Ok(cropped_paths.iter().all(|p| p.is_some()))
}
