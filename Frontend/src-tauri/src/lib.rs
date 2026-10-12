use std::sync::{
  atomic::{AtomicBool, Ordering},
  Arc, Mutex,
};
use tauri::{
  menu::{Menu, MenuItem, PredefinedMenuItem},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  Emitter, Manager, State,
};

#[derive(serde::Deserialize, serde::Serialize, Clone, Debug)]
pub struct HitRect {
  pub x: f64,
  pub y: f64,
  pub width: f64,
  pub height: f64,
}

pub struct HitTestState {
  pub enabled: AtomicBool,
  pub force_ignore: AtomicBool,
  pub is_dragging: AtomicBool,
  pub rects: Mutex<Vec<HitRect>>,
}

#[tauri::command]
fn update_hit_rects(state: State<'_, Arc<HitTestState>>, rects: Vec<HitRect>) {
  if let Ok(mut lock) = state.rects.lock() {
    *lock = rects;
  }
}

#[tauri::command]
fn set_smart_hit_test(state: State<'_, Arc<HitTestState>>, enabled: bool) {
  state.enabled.store(enabled, Ordering::Relaxed);
}

#[tauri::command]
fn set_force_click_through(
  state: State<'_, Arc<HitTestState>>,
  window: tauri::WebviewWindow,
  force: bool,
) {
  state.force_ignore.store(force, Ordering::Relaxed);
  let _ = window.set_ignore_cursor_events(force);
}

#[tauri::command]
fn set_is_dragging(state: State<'_, Arc<HitTestState>>, dragging: bool) {
  state.is_dragging.store(dragging, Ordering::Relaxed);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let hit_state = Arc::new(HitTestState {
    enabled: AtomicBool::new(true),
    force_ignore: AtomicBool::new(false),
    is_dragging: AtomicBool::new(false),
    rects: Mutex::new(Vec::new()),
  });

  let hit_state_loop = hit_state.clone();

  tauri::Builder::default()
    .manage(hit_state.clone())
    .invoke_handler(tauri::generate_handler![
      update_hit_rects,
      set_smart_hit_test,
      set_force_click_through,
      set_is_dragging
    ])
    .plugin(tauri_plugin_global_shortcut::Builder::new().build())
    .setup(move |app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // 1. Tạo Tray Menu (Hiển thị nhãn phím tắt phù hợp với từng hệ điều hành)
      let shortcut_label = if cfg!(target_os = "macos") { "⌘⌥C" } else { "Ctrl+Alt+C" };
      let toggle_window = MenuItem::with_id(app, "toggle_window", "Hiện / Ẩn ứng dụng", true, None::<&str>)?;
      let sep1 = PredefinedMenuItem::separator(app)?;
      let toggle_click_through = MenuItem::with_id(
        app,
        "toggle_click_through",
        &format!("Click-through: Bật/Tắt ({})", shortcut_label),
        true,
        None::<&str>,
      )?;
      let toggle_always_on_top = MenuItem::with_id(app, "toggle_always_on_top", "Always on Top: Bật/Tắt", true, None::<&str>)?;
      let sep2 = PredefinedMenuItem::separator(app)?;
      let quit = MenuItem::with_id(app, "quit", "Thoát ứng dụng", true, None::<&str>)?;

      #[cfg(target_os = "windows")]
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_decorations(false);
      }

      let menu = Menu::with_items(
        app,
        &[
          &toggle_window,
          &sep1,
          &toggle_click_through,
          &toggle_always_on_top,
          &sep2,
          &quit,
        ],
      )?;

      // 2. Khởi tạo Tray Icon trên Menu Bar / Taskbar
      if let Some(icon) = app.default_window_icon() {
        let _ = TrayIconBuilder::new()
          .icon(icon.clone())
          .tooltip("AI Companion")
          .menu(&menu)
          .show_menu_on_left_click(false)
          .on_menu_event(|app, event| {
            match event.id.as_ref() {
              "toggle_window" => {
                if let Some(window) = app.get_webview_window("main") {
                  if window.is_visible().unwrap_or(false) {
                    let _ = window.hide();
                  } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                  }
                }
              }
              "toggle_click_through" => {
                if let Some(window) = app.get_webview_window("main") {
                  let _ = window.emit("tray-toggle-click-through", ());
                }
              }
              "toggle_always_on_top" => {
                if let Some(window) = app.get_webview_window("main") {
                  let _ = window.emit("tray-toggle-always-on-top", ());
                }
              }
              "quit" => {
                app.exit(0);
              }
              _ => {}
            }
          })
          .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
              button: MouseButton::Left,
              button_state: MouseButtonState::Up,
              ..
            } = event
            {
              let app = tray.app_handle();
              if let Some(window) = app.get_webview_window("main") {
                if window.is_visible().unwrap_or(false) {
                  let _ = window.hide();
                } else {
                  let _ = window.show();
                  let _ = window.set_focus();
                }
              }
            }
          })
          .build(app);
      }

      // 3. Khởi chạy luồng Native Smart Hit-Testing (kiểm tra toạ độ chuột thời gian thực)
      let app_handle = app.handle().clone();
      std::thread::spawn(move || {
        let mut currently_ignoring = false;

        loop {
          std::thread::sleep(std::time::Duration::from_millis(30));

          // Nếu đang bật Force Click-through (ví dụ bằng phím tắt), không can thiệp
          if hit_state_loop.force_ignore.load(Ordering::Relaxed) {
            continue;
          }

          // Nếu người dùng đang giữ chuột kéo cửa sổ (startDragging), giữ nguyên tương tác
          if hit_state_loop.is_dragging.load(Ordering::Relaxed) {
            if currently_ignoring {
              if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.set_ignore_cursor_events(false);
                currently_ignoring = false;
              }
            }
            continue;
          }

          // Nếu tính năng Smart Hit-testing bị tắt
          if !hit_state_loop.enabled.load(Ordering::Relaxed) {
            if currently_ignoring {
              if let Some(window) = app_handle.get_webview_window("main") {
                let _ = window.set_ignore_cursor_events(false);
                currently_ignoring = false;
              }
            }
            continue;
          }

          let Some(window) = app_handle.get_webview_window("main") else {
            continue;
          };

          if !window.is_visible().unwrap_or(false) {
            continue;
          }

          let (cursor_pos, win_pos, scale_factor) = match (
            app_handle.cursor_position(),
            window.outer_position(),
            window.scale_factor(),
          ) {
            (Ok(c), Ok(w), Ok(s)) => (c, w, s),
            _ => continue,
          };

          let rel_x = (cursor_pos.x - win_pos.x as f64) / scale_factor;
          let rel_y = (cursor_pos.y - win_pos.y as f64) / scale_factor;

          let Ok(rects) = hit_state_loop.rects.lock() else {
            continue;
          };

          let mut hit = false;
          for r in rects.iter() {
            if rel_x >= r.x && rel_x <= (r.x + r.width) && rel_y >= r.y && rel_y <= (r.y + r.height) {
              hit = true;
              break;
            }
          }

          // Nếu trỏ chuột nằm trong các phần tử tương tác (Toolbar, Titlebar, Avatar) => nhận chuột
          // Nếu nằm ngoài vùng trống trong suốt => click xuyên qua cửa sổ
          let should_ignore = !hit;

          if should_ignore != currently_ignoring {
            let _ = window.set_ignore_cursor_events(should_ignore);
            currently_ignoring = should_ignore;
          }
        }
      });

      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app_handle, event| {
      #[cfg(target_os = "macos")]
      if let tauri::RunEvent::Reopen { .. } = event {
        if let Some(window) = app_handle.get_webview_window("main") {
          let _ = window.show();
          let _ = window.set_focus();
        }
      }
    });
}
