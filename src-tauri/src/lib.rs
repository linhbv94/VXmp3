pub mod audio_core;
pub mod metadata;
pub mod transaction;

use tauri::Emitter;
#[cfg(target_os = "macos")]
use tauri::menu::{MenuBuilder, MenuItemBuilder, SubmenuBuilder};

#[cfg(target_os = "macos")]
#[allow(deprecated)]
fn sync_mac_traffic_lights(window: &tauri::WebviewWindow) {
    let win = window.clone();
    let win_closure = win.clone();
    let _ = win.run_on_main_thread(move || {
        #[allow(deprecated)]
        use cocoa::base::{id, nil, BOOL, YES};
        #[allow(deprecated)]
        use cocoa::foundation::{NSPoint, NSRect, NSSize};
        use objc::{msg_send, sel, sel_impl};

        if let Ok(ns_win_ptr) = win_closure.ns_window() {
            let ns_window = ns_win_ptr as id;
            unsafe {
                let style_mask: u64 = msg_send![ns_window, styleMask];
                // NSWindowStyleMaskFullScreen = 1 << 14
                let is_fullscreen = (style_mask & (1 << 14)) != 0;
                if is_fullscreen {
                    return;
                }

                // Traffic lights buttons: 0 = Close, 1 = Miniaturize, 2 = Zoom
                // Standard diameter = 12pt, spacing = 20pt (center-to-center)
                // Left margin chừa 82px:
                // Close button: origin x = 8.0 (span 8.0..20.0, center 14.0)
                // Miniaturize button: origin x = 28.0 (span 28.0..40.0, center 34.0)
                // Zoom button: origin x = 48.0 (span 48.0..60.0, center 54.0)
                // Span ends at 60.0px, giving 22px clearance before pl-[82px]
                for (i, btn_id) in [0, 1, 2].iter().enumerate() {
                    let btn: id = msg_send![ns_window, standardWindowButton: *btn_id];
                    if btn != nil {
                        let is_hidden: BOOL = msg_send![btn, isHidden];
                        if is_hidden == YES {
                            continue;
                        }
                        let _: () = msg_send![btn, setControlSize: 1_u64];
                        let cur: NSRect = msg_send![btn, frame];
                        let drawing_bounds: NSRect = msg_send![btn, bounds];
                        let target_x = 8.0 + (i as f64) * 20.0;
                        let target_y = cur.origin.y + (cur.size.height - 12.0) / 2.0;
                        let target_frame = NSRect {
                            origin: NSPoint { x: target_x, y: target_y },
                            size: NSSize { width: 12.0, height: 12.0 },
                        };
                        let _: () = msg_send![btn, setFrame: target_frame];
                        // Preserve AppKit's drawing space, scaling the native bezel to the frame.
                        // Use its actual bounds so older macOS control sizes remain correct.
                        let _: () = msg_send![btn, setBoundsSize: drawing_bounds.size];
                    }
                }
            }
        }
    });
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to VXmp3.", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            greet,
            metadata::pick_directory,
            metadata::scan_audio_directory,
            metadata::apply_batch_tags,
            metadata::read_audio_tracks,
            audio_core::batch_analyze_loudness,
            audio_core::apply_lossless_mp3_gain,
            transaction::undo_last_operation,
            transaction::prepare_app_update,
            transaction::cancel_app_update,
        ])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                let about_item = MenuItemBuilder::with_id("open_about", "Giới thiệu VXmp3...").build(app)?;

                let settings_item = MenuItemBuilder::with_id("open_settings", "Cài đặt...")
                    .accelerator("CmdOrCtrl+,")
                    .build(app)?;

                let app_submenu = SubmenuBuilder::new(app, "VXmp3")
                    .item(&about_item)
                    .separator()
                    .item(&settings_item)
                    .separator()
                    .services()
                    .separator()
                    .hide()
                    .hide_others()
                    .show_all()
                    .separator()
                    .quit()
                    .build()?;

                let open_folder = MenuItemBuilder::with_id("open_folder", "Mở thư mục...")
                    .accelerator("CmdOrCtrl+O")
                    .build(app)?;

                let save_tags = MenuItemBuilder::with_id("save_tags", "Lưu thay đổi thẻ...")
                    .accelerator("CmdOrCtrl+S")
                    .build(app)?;

                let file_submenu = SubmenuBuilder::new(app, "File")
                    .item(&open_folder)
                    .item(&save_tags)
                    .separator()
                    .close_window()
                    .build()?;

                let select_all = MenuItemBuilder::with_id("select_all", "Chọn tất cả")
                    .accelerator("CmdOrCtrl+A")
                    .build(app)?;

                let edit_submenu = SubmenuBuilder::new(app, "Edit")
                    .item(&select_all)
                    .separator()
                    .cut()
                    .copy()
                    .paste()
                    .build()?;

                let menu = MenuBuilder::new(app)
                    .item(&app_submenu)
                    .item(&file_submenu)
                    .item(&edit_submenu)
                    .build()?;

                let _ = app.set_menu(menu);

                use tauri::Manager;
                if let Some(main_win) = app.get_webview_window("main") {
                    sync_mac_traffic_lights(&main_win);
                }
            }

            #[cfg(target_os = "windows")]
            {
                use tauri::Manager;
                if let Some(main_win) = app.get_webview_window("main") {
                    let _ = main_win.set_decorations(false);
                }
            }

            // Khởi động Crash Recovery quét tệp tạm mồ côi và journal dở dang
            let app_handle = app.handle().clone();
            transaction::startup_crash_recovery(&app_handle);
            Ok(())
        })
        .on_window_event(|window, event| {
            #[cfg(target_os = "macos")]
            {
                if matches!(event, tauri::WindowEvent::Resized(_) | tauri::WindowEvent::Focused(true) | tauri::WindowEvent::ScaleFactorChanged { .. }) {
                    use tauri::Manager;
                    if let Some(win) = window.app_handle().get_webview_window(window.label()) {
                        sync_mac_traffic_lights(&win);
                    }
                }
            }
        })
        .on_menu_event(|app_handle, event| match event.id().as_ref() {
            "open_folder" => {
                let _ = app_handle.emit("trigger-open-folder", ());
            }
            "open_about" => {
                let _ = app_handle.emit("trigger-open-about", ());
            }
            "open_settings" => {
                let _ = app_handle.emit("trigger-open-settings", ());
            }
            "save_tags" => {
                let _ = app_handle.emit("trigger-save-tags", ());
            }
            "select_all" => {
                let _ = app_handle.emit("trigger-select-all", ());
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running vx_mp3 application");
}

#[cfg(test)]
mod regression_tests;
