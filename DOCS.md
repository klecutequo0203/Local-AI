# TÀI LIỆU KIẾN TRÚC & CHỨC NĂNG HÀM (FUNCTIONS ARCHITECTURE)

> **Dự án**: Desktop AI Companion (Local-AI)  
> **Kiến trúc công nghệ**: Tauri v2 (Rust Backend) + React 18 / TypeScript / Vite (Frontend UI)  
> **Đặc điểm kiến trúc**: Cửa sổ trong suốt (Transparent Borderless), xuyên chuột thông minh (Smart Hit-Testing), thanh công cụ kính mờ (Glassmorphism), kéo thả tự do đa nền tảng (Windows & macOS).

---

## 🏗️ 1. TỔNG QUAN LUỒNG KIẾN TRÚC & DỮ LIỆU

```
┌─────────────────────────────────────────────────────────────────┐
│                    NGƯỜI DÙNG (USER INPUT)                      │
│        (Kéo chuột, Click nút, Phím tắt, Menu System Tray)        │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│              REACT / TYPESCRIPT FRONTEND (UI LAYER)             │
│   • App.tsx: Điều phối trạng thái, thanh công cụ, hit rects     │
│   • Titlebar.tsx: Điều khiển cửa sổ cross-platform (Mac / Win)  │
│   • Slider.tsx: Thu phóng thời gian thực (0ms DOM update)       │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                 Tauri IPC (Invoke / Event Listen)
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                 TAURI NATIVE BACKEND (RUST LAYER)               │
│   • lib.rs: Quản lý HitTestState, luồng chạy nền 30ms           │
│   • System Tray: Quản lý icon và menu góc hệ thống              │
│   • Global Shortcut Plugin: Lắng nghe Cmd/Ctrl + Alt + C        │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                    Hệ điều hành Native API
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                 HỆ ĐIỀU HÀNH (OS WINDOW MANAGER)                │
│   • Windows: DWM, WebView2, WS_EX_TRANSPARENT, SetDecorations   │
│   • macOS: Cocoa, WKWebView, NSWindow performWindowDrag         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🦀 2. TẦNG NATIVE RUST (BACKEND TAURI)

File nguồn: `Frontend/src-tauri/src/lib.rs` & `Frontend/src-tauri/src/main.rs`

### 2.1. `main()`
* **Vị trí**: `Frontend/src-tauri/src/main.rs`
* **Tham số**: Không có
* **Kiểu trả về**: `()`
* **Chức năng**: Điểm khởi động (Entry Point) của file thực thi nhị phân.
* **Ý nghĩa**: Gọi hàm `app_lib::run()` để kích hoạt vòng đời ứng dụng Tauri trên môi trường Desktop.

---

### 2.2. `update_hit_rects(state, rects)`
* **Vị trí**: `Frontend/src-tauri/src/lib.rs`
* **Tham số**:
  * `state: State<'_, Arc<HitTestState>>`: Con trỏ state chia sẻ luồng an toàn chứa `Mutex<Vec<HitRect>>`.
  * `rects: Vec<HitRect>`: Mảng toạ độ pixel (`x`, `y`, `width`, `height`) của các phần tử tương tác do Frontend quét gửi xuống.
* **Kiểu trả về**: `()`
* **Chức năng**: Cập nhật danh sách các vùng giao diện hợp lệ cần nhận sự kiện chuột.
* **Ý nghĩa**: Là trái tim của cơ chế **Smart Hit-Testing**. Luồng Native sẽ liên tục so sánh toạ độ chuột thực tế với danh sách `rects` này để quyết định có cho chuột click xuyên qua app hay không.

---

### 2.3. `set_smart_hit_test(state, enabled)`
* **Vị trí**: `Frontend/src-tauri/src/lib.rs`
* **Tham số**:
  * `state: State<'_, Arc<HitTestState>>`
  * `enabled: bool`: Trạng thái Bật/Tắt tính năng.
* **Kiểu trả về**: `()`
* **Chức năng**: Bật hoặc tắt tính năng xuyên chuột thông minh.
* **Ý nghĩa**: Khi `enabled = false`, cửa sổ trở về trạng thái bình thường (luôn bắt chuột trên toàn bộ diện tích 520x760, không click xuyên).

---

### 2.4. `set_force_click_through(state, window, force)`
* **Vị trí**: `Frontend/src-tauri/src/lib.rs`
* **Tham số**:
  * `state: State<'_, Arc<HitTestState>>`
  * `window: tauri::WebviewWindow`: Handle cửa sổ ứng dụng hiện tại.
  * `force: bool`: Trạng thái khóa xuyên 100%.
* **Kiểu trả về**: `()`
* **Chức năng**: Cưỡng chế bật/tắt click-through toàn phần thông qua `window.set_ignore_cursor_events(force)`.
* **Ý nghĩa**: Được kích hoạt khi người dùng bấm phím tắt toàn cục (`Cmd+Alt+C` trên Mac hoặc `Ctrl+Alt+C` trên Windows). Cho phép bỏ qua hoàn toàn giao diện AI để làm việc với các phần mềm bên dưới mà không sợ bấm nhầm.

---

### 2.5. `set_is_dragging(state, dragging)`
* **Vị trí**: `Frontend/src-tauri/src/lib.rs`
* **Tham số**:
  * `state: State<'_, Arc<HitTestState>>`
  * `dragging: bool`: Cờ báo đang kéo cửa sổ.
* **Kiểu trả về**: `()`
* **Chức năng**: Báo hiệu cho luồng Native biết người dùng đang nhấp giữ chuột để di chuyển cửa sổ.
* **Ý nghĩa**: Khóa tạm thời luồng hit-test. Nếu không có hàm này, khi người dùng kéo cửa sổ bay qua các vị trí trong suốt với tốc độ cao, hit-testing có thể nhầm là vùng trống và bật click-through làm ngắt quãng (drop) phiên kéo cửa sổ.

---

### 2.6. `run()`
* **Vị trí**: `Frontend/src-tauri/src/lib.rs`
* **Tham số**: Không có
* **Kiểu trả về**: `()`
* **Chức năng**: Thiết lập khởi chạy toàn diện cho ứng dụng:
  1. Đăng ký các Tauri command (`update_hit_rects`, `set_smart_hit_test`, `set_force_click_through`, `set_is_dragging`).
  2. Tạo Menu và Icon khay hệ thống (**System Tray**): Hỗ trợ nhấp trái để Hiện/Ẩn, nhấp phải để mở menu tính năng.
  3. Cấu hình Borderless trên Windows (`set_decorations(false)`) để giao diện kính mờ không bị nhấp nháy viền trắng OS.
  4. Khởi chạy luồng nền kiểm tra toạ độ chuột thời gian thực (Background Thread Polling - chu kỳ 30ms):
     $$\text{rel\_x} = \frac{\text{cursor\_pos.x} - \text{win\_pos.x}}{\text{scale\_factor}}$$
     $$\text{rel\_y} = \frac{\text{cursor\_pos.y} - \text{win\_pos.y}}{\text{scale\_factor}}$$
     Tự động áp dụng tỉ lệ màn hình chuẩn (DPI scaling) trên cả Windows lẫn màn hình Retina của macOS.

---

## ⚛️ 3. TẦNG KHỞI TẠO & APP CHÍNH (REACT / TYPESCRIPT)

File nguồn: `Frontend/src/main.tsx` & `Frontend/src/app/App.tsx`

### 3.1. `main.tsx`
* **Vị trí**: `Frontend/src/main.tsx`
* **Chức năng**: Tạo React Root bằng `ReactDOM.createRoot` và gắn component `<App />` vào phần tử `#root` của `index.html`.

---

### 3.2. `showToast(msg)`
* **Vị trí**: `Frontend/src/app/App.tsx`
* **Tham số**: `msg: string` (nội dung thông báo)
* **Kiểu trả về**: `void`
* **Chức năng**: Tạo thông báo dạng viên thuốc (Toast pill) kính mờ hiển thị ở phía trên màn hình, tự động ẩn sau 2.500ms.

---

### 3.3. `handleStartDrag(e)`
* **Vị trí**: `Frontend/src/app/App.tsx`
* **Tham số**: `e: React.MouseEvent` (sự kiện chuột React)
* **Kiểu trả về**: `Promise<void>`
* **Chức năng**: Thực hiện hành vi kéo thả tự do cửa sổ trên màn hình.
* **Cơ chế hoạt động**:
  1. Kiểm tra chỉ nhận chuột trái (`e.button === 0`).
  2. Bỏ qua nếu người dùng bấm vào các nút điều khiển hoặc slider (`closest('.window-no-drag')`).
  3. Gọi `set_is_dragging(true)` xuống Native.
  4. Gọi API OS native: `getCurrentWindow().startDragging()`.
  5. Đảm bảo khôi phục `set_is_dragging(false)` trong khối `finally`.

---

### 3.4. `syncHitRects()`
* **Vị trí**: `Frontend/src/app/App.tsx`
* **Tham số**: Không có
* **Kiểu trả về**: `void`
* **Chức năng**: Quét toàn bộ DOM tìm các thẻ có class `.interactive-hit-target` và lấy toạ độ bằng `getBoundingClientRect()`.
* **Ý nghĩa**: Gửi danh sách toạ độ các phần tử UI đang hiển thị xuống Backend Rust để luồng hit-testing không click xuyên qua các phần tử này. Tự động kích hoạt khi mount, khi resize cửa sổ và lặp lại định kỳ mỗi 600ms.

---

### 3.5. `handleToggleAlwaysOnTop()`
* **Vị trí**: `Frontend/src/app/App.tsx`
* **Kiểu trả về**: `Promise<void>`
* **Chức năng**: Đổi trạng thái ghim cửa sổ trên cùng qua `getCurrentWindow().setAlwaysOnTop(!isAlwaysOnTop)` kèm thông báo Toast.

---

### 3.6. `handleToggleSmartHitTest()`
* **Vị trí**: `Frontend/src/app/App.tsx`
* **Kiểu trả về**: `Promise<void>`
* **Chức năng**: Bật hoặc tắt tính năng Smart Hit-Testing từ thanh công cụ.

---

### 3.7. `handleToggleForceClickThrough()`
* **Vị trí**: `Frontend/src/app/App.tsx`
* **Kiểu trả về**: `Promise<void>`
* **Chức năng**: Bật/tắt chế độ khóa xuyên chuột toàn phần. Hiển thị thông báo nhãn phím tắt tương ứng với hệ điều hành (`⌘⌥C` trên macOS, `Ctrl+Alt+C` trên Windows).

---

### 3.8. `App()`
* **Vị trí**: `Frontend/src/app/App.tsx`
* **Kiểu trả về**: `JSX.Element`
* **Chức năng**: Component trung tâm của ứng dụng.
  * Quản lý toàn bộ State (Mute AI, Mute Mic, AlwaysOnTop, SmartHitTest, ForceClickThrough, UiHidden, CharacterScale).
  * Đăng ký phím tắt toàn cầu `CommandOrControl+Alt+C`.
  * Lắng nghe sự kiện từ System Tray (`tray-toggle-click-through`, `tray-toggle-always-on-top`).
  * Render giao diện: Titlebar, nút Ghost Trigger hiện lại UI khi bị ẩn, thanh công cụ Floating Pill Toolbar và thẻ Status Card.

---

## 🪟 4. CUSTOM TITLEBAR CROSS-PLATFORM

File nguồn: `Frontend/src/components/ui/Titlebar.tsx`

### 4.1. `handleMinimize()`
* **Vị trí**: `Frontend/src/components/ui/Titlebar.tsx`
* **Chức năng**: Thu nhỏ cửa sổ qua `getCurrentWindow().minimize()`.
* **Đặc thù OS**: Trên macOS, bổ sung kiểm tra fallback sau 60ms để đảm bảo cửa sổ borderless ẩn vào Dock chính xác.

---

### 4.2. `handleMaximize()`
* **Vị trí**: `Frontend/src/components/ui/Titlebar.tsx`
* **Chức năng**: Chuyển đổi giữa trạng thái phóng to (Maximize) và khôi phục (Restore) kích thước cửa sổ qua `win.maximize()` và `win.unmaximize()`. Cập nhật trạng thái `isMaximized` cho biểu tượng nút bấm.

---

### 4.3. `handleClose()`
* **Vị trí**: `Frontend/src/components/ui/Titlebar.tsx`
* **Chức năng**: Đóng ứng dụng an toàn qua `getCurrentWindow().close()`.

---

### 4.4. `checkOS()` & `simulateOS(os)`
* **Vị trí**: `Frontend/src/components/ui/Titlebar.tsx`
* **Chức năng**:
  * `checkOS()`: Tự động phân tích `navigator.userAgent` để nhận diện đang chạy trên Windows hay macOS.
  * `simulateOS(os)`: Hàm tiện ích gắn vào `window` giúp lập trình viên gõ `simulateOS('windows')` hoặc `simulateOS('mac')` trong DevTools để test giao diện qua lại tức thì.

---

### 4.5. `handleKeyDown(e)`
* **Vị trí**: `Frontend/src/components/ui/Titlebar.tsx`
* **Chức năng**: Bắt phím tắt `Cmd+Shift+W` (Mac) hoặc `Ctrl+Shift+W` (Windows) để chuyển đổi nhanh giữa layout macOS và Windows.

---

### 4.6. `handleWindowShortcuts(e)`
* **Vị trí**: `Frontend/src/components/ui/Titlebar.tsx`
* **Chức năng**: Lắng nghe và thực thi các phím tắt quản lý cửa sổ phổ biến của từng hệ điều hành:
  * Đóng cửa sổ: `Alt+F4`, `Ctrl+W` (Win) / `Cmd+W` (Mac).
  * Thu nhỏ: `Ctrl+M`, `Alt+M` (Win) / `Cmd+M` (Mac).
  * Phóng to / Khôi phục: `F11`, `Alt+Enter` (Win) / `Cmd+Ctrl+F` (Mac).

---

### 4.7. `Titlebar()`
* **Vị trí**: `Frontend/src/components/ui/Titlebar.tsx`
* **Kiểu trả về**: `JSX.Element`
* **Chức năng**: Component thanh tiêu đề tuỳ chỉnh:
  * Chiều cao cố định `36px`, đăng ký là `.interactive-hit-target`.
  * Hỗ trợ kéo cửa sổ và **Double-click** để phóng to/thu nhỏ.
  * Tự động hiển thị Traffic Lights bên trái trên macOS hoặc cụm 3 nút `_ □ ✕` bên phải trên Windows.

---

## 🎚️ 5. THANH THU PHÓNG SIÊU MƯỢT (SLIDER)

File nguồn: `Frontend/src/components/ui/Slider.tsx`

### 5.1. `getGradient(val)`
* **Vị trí**: `Frontend/src/components/ui/Slider.tsx`
* **Tham số**: `val: number` (giá trị scale hiện tại, ví dụ: 0.5 - 2.0).
* **Kiểu trả về**: `string` (chuỗi CSS `linear-gradient(...)`).
* **Ý nghĩa & Công thức toán học**:
  Nút trượt hình tròn (thumb) có đường kính 16px (bán kính 8px). Để vạch màu xanh Cyan luôn nằm chính xác tại tâm nút tròn mà không bị hụt hoặc thừa ở hai đầu:
  $$\text{pct} = \frac{\text{val} - \text{min}}{\text{max} - \text{min}} \times 100$$
  $$\text{offsetPx} = \left(0.5 - \frac{\text{pct}}{100}\right) \times 16$$
  $$\text{stopPos} = \text{calc}(\text{pct}\% + \text{offsetPx}\,\text{px})$$
  Hàm trả về dải màu gradient dừng chính xác tại `stopPos`.

---

### 5.2. `handleInput(e)`
* **Vị trí**: `Frontend/src/components/ui/Slider.tsx`
* **Tham số**: `e: React.FormEvent<HTMLInputElement>`
* **Kiểu trả về**: `void`
* **Chức năng & Tối ưu hiệu năng**:
  * Khi người dùng kéo chuột, hàm trực tiếp gán `e.currentTarget.style.background = getGradient(v)`.
  * Thao tác cập nhật DOM diễn ra đồng bộ ngay trong frame vẽ hiện tại (0ms latency), loại bỏ hoàn toàn độ trễ của chu kỳ React re-render.
  * Kết hợp với CSS `transition: none !important;` giúp thanh màu bám dính tuyệt đối vào nút trượt ở tốc độ 60/120Hz.

---

### 5.3. `Slider()`
* **Vị trí**: `Frontend/src/components/ui/Slider.tsx`
* **Kiểu trả về**: `JSX.Element`
* **Chức năng**: Component thanh trượt kính mờ, có nhãn phần trăm hiển thị font monospace và icon thu phóng `ZoomIn`.

---

## 🔘 6. CÁC COMPONENT GIAO DIỆN HỖ TRỢ

### 6.1. `IconButton()`
* **Vị trí**: `Frontend/src/components/ui/IconButton.tsx`
* **Tham số**: `IconButtonProps` (`icon`, `label`, `activeState`, `size`, `onClick`,...)
* **Kiểu trả về**: `JSX.Element`
* **Chức năng**: Nút bấm tròn kính mờ có hiệu ứng phản hồi xúc giác (active scale 0.94), tự động chuyển đổi màu viền và ánh sáng glow theo trạng thái:
  * `default`: Viền trắng mờ mạ kính.
  * `muted`: Viền đỏ hồng, phát sáng màu Rose (`--accent-rose`).
  * `pinned`: Viền xanh lá, phát sáng màu Emerald (`--accent-emerald`).
  * `active`: Viền xanh da trời, phát sáng màu Cyan (`--accent-cyan`).

---

### 6.2. `Tooltip()`
* **Vị trí**: `Frontend/src/components/ui/Tooltip.tsx`
* **Tham số**: `TooltipProps` (`content`, `children`, `position`)
* **Kiểu trả về**: `JSX.Element`
* **Chức năng**: Hiển thị bong bóng giải thích nổi khi rê chuột hoặc focus vào một phần tử. Hỗ trợ căn chỉnh 4 hướng linh hoạt (`top`, `bottom`, `left`, `right`).

---

## ⌨️ 7. BẢNG TRA CỨU PHÍM TẮT TOÀN DỰ ÁN

| Chức năng | Phím tắt macOS | Phím tắt Windows |
| :--- | :--- | :--- |
| **Bật/Tắt khóa xuyên chuột 100% (Global)** | `Cmd + Alt + C` (⌘⌥C) | `Ctrl + Alt + C` |
| **Đổi giả lập giao diện macOS ↔ Windows** | `Cmd + Shift + W` | `Ctrl + Shift + W` |
| **Đóng cửa sổ (Close)** | `Cmd + W` | `Alt + F4` / `Ctrl + W` / `Alt + C` |
| **Thu nhỏ cửa sổ (Minimize)** | `Cmd + M` | `Ctrl + M` / `Alt + M` / `Alt + N` |
| **Phóng to / Khôi phục (Maximize/Restore)** | `Cmd + Ctrl + F` | `F11` / `Alt + Enter` / `Alt + X` |
| **Kéo di chuyển cửa sổ tự do** | Nhấp giữ chuột vào Grip Toolbar / Titlebar / Status Card | Nhấp giữ chuột vào Grip Toolbar / Titlebar / Status Card |
| **Phóng to/Thu nhỏ nhanh** | Double-click vùng Titlebar | Double-click vùng Titlebar |

---

## 🚀 8. HƯỚNG DẪN KHỞI CHẠY (SCRIPTS & CROSS-PLATFORM LAUNCH)

| Lệnh thực thi | Mục đích | Lưu ý hệ điều hành |
| :--- | :--- | :--- |
| `npm run tauri:dev` | **Khởi chạy ứng dụng Desktop (Khuyên dùng)** | **Khuyên dùng cho cả Windows & macOS**. Trên Windows PowerShell, lệnh này đảm bảo CLI nhận diện chính xác cờ `dev` mà không cần thêm `--`. |
| `npm run dev` | Khởi chạy Vite web server | Phục vụ kiểm thử giao diện trên trình duyệt (localhost:5174). |
| `npm run build` | Kiểm tra kiểu TypeScript & đóng gói | Chạy `tsc && vite build` kiểm tra toàn bộ lỗi biên dịch trước khi push. |

