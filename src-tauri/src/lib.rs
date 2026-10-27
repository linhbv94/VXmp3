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
        use cocoa::foundation::{NSPoint, NSRect};
        use objc::{class, msg_send, sel, sel_impl};

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
                // SDK27.0 native appearance, center spacing20pt; never force a12pt bezel.
                // View dimensions include AppKit padding; never force the view to 12x12.
                for (i, btn_id) in [0, 1, 2].iter().enumerate() {
                    let btn: id = msg_send![ns_window, standardWindowButton: *btn_id];
                    if btn != nil {
                        let is_hidden: BOOL = msg_send![btn, isHidden];
                        if is_hidden == YES {
                            continue;
                        }
                        // Native geometry depends on SDK/OS; preserve the SDK27.0 AppKit reference.
                        // Restore pristine AppKit geometry, never scale the bezel to 12x12.
                        let reference: id = msg_send![class!(NSWindow),
                            standardWindowButton: *btn_id forStyleMask: style_mask];
                        if reference == nil {
                            continue;
                        }
                        let reference_frame: NSRect = msg_send![reference, frame];
                        let reference_bounds: NSRect = msg_send![reference, bounds];
                        let control_size: u64 = msg_send![reference, controlSize];
                        let _: () = msg_send![btn, setControlSize: control_size];
                        // Align against the web content toolbar, not AppKit titlebar metrics.
                        // convertPoint handles the native parent hierarchy and flipped coordinates.
                        let content_view: id = msg_send![ns_window, contentView];
                        let superview: id = msg_send![btn, superview];
                        if content_view == nil || superview == nil {
                            continue;
                        }
                        let content_bounds: NSRect = msg_send![content_view, bounds];
                        let is_flipped: BOOL = msg_send![content_view, isFlipped];
                        // DOM flex center: (32px header − 1px bottom divider) / 2.
                        let toolbar_center_from_top = 15.5;
                        let toolbar_center_y = if is_flipped == YES {
                            toolbar_center_from_top
                        } else {
                            content_bounds.size.height - toolbar_center_from_top
                        };
                        let content_center = NSPoint {
                            x: content_bounds.origin.x + 8.0 + (i as f64) * 20.0 + 6.0,
                            y: content_bounds.origin.y + toolbar_center_y,
                        };
                        let native_center: NSPoint = msg_send![superview,
                            convertPoint: content_center fromView: content_view];
                        let target_x = native_center.x - reference_frame.size.width / 2.0;
                        let target_y = native_center.y - reference_frame.size.height / 2.0;
                        let target_frame = NSRect {
                            origin: NSPoint { x: target_x, y: target_y },
                            size: reference_frame.size,
                        };
                        let _: () = msg_send![btn, setFrame: target_frame];
                        // Match frame/bounds without a view transform, retaining native padding.
                        let _: () = msg_send![btn, setBounds: reference_bounds];
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
