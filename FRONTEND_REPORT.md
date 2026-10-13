# BÁO CÁO TỔNG QUAN KIẾN TRÚC & CHỨC NĂNG FRONTEND
## DỰ ÁN: DESKTOP AI COMPANION (LOCAL-AI)

> **Mục đích tài liệu**: Tài liệu tổng hợp toàn diện về kiến trúc, chức năng, giải pháp công nghệ và thiết kế UI/UX tầng Frontend, phục vụ cho việc viết báo cáo kỹ thuật, báo cáo đồ án và tài liệu dự án.

---

## 1. TỔNG QUAN VỀ FRONTEND (OVERVIEW & TECH STACK)

### 1.1. Mục tiêu sản phẩm
Frontend của **Local-AI Desktop Companion** là giao diện hiển thị cho một trợ lý ảo thông minh chạy trực tiếp trên máy tính của người dùng. Khác với các ứng dụng desktop dạng cửa sổ truyền thống (hình chữ nhật có viền và nền trắng), ứng dụng này được thiết kế theo mô hình **Desktop Overlay trong suốt**:
* Cửa sổ hiển thị lơ lửng trên màn hình máy tính (Floating Pet / Overlay).
* Toàn bộ phần nền là trong suốt 100%, chỉ có các phần tử giao diện (Avatar AI, thanh công cụ, thông báo) là hiển thị.
* Cho phép người dùng vừa làm việc với các ứng dụng khác (soạn thảo, lướt web, lập trình) vừa có thể tương tác với AI đồng thời mà không bị che khuất tầm nhìn.

### 1.2. Công nghệ sử dụng
* **Core Framework**: React 18 (sử dụng Functional Components & Hooks).
* **Ngôn ngữ**: TypeScript (đảm bảo type-safety, hạn chế runtime errors).
* **Build Tool**: Vite 6 (tốc độ khởi động HMR cực nhanh, tối ưu dung lượng đóng gói).
* **Styling**: Vanilla CSS kết hợp hệ thống Design Tokens (`tokens.css`, `globals.css`) theo phong cách **Glassmorphism** (kính mờ sang trọng, ánh sáng viền tinh tế).
* **Bộ Icon**: `lucide-react` (icon tối giản, sắc nét).
* **Giao tiếp Native (IPC)**: `@tauri-apps/api` (Window API, Core Invoke, Event Listen) và `@tauri-apps/plugin-global-shortcut`.

---

## 2. KIẾN TRÚC TẦNG FRONTEND (FRONTEND ARCHITECTURE)

```
Frontend/src
 ├── main.tsx                    # Điểm khởi tạo React Root
 ├── app/
 │    └── App.tsx                # Trung tâm điều phối State, Toolbar & Layout
 ├── components/ui/
 │    ├── Titlebar.tsx           # Thanh điều khiển cửa sổ thích ứng đa nền tảng
 │    ├── Slider.tsx             # Thanh trượt thu phóng mượt mà 0ms latency
 │    ├── IconButton.tsx         # Nút bấm tròn kính mờ hỗ trợ nhiều trạng thái
 │    └── Tooltip.tsx            # Bong bóng hướng dẫn khi hover
 └── styles/
      ├── tokens.css             # Biến CSS (màu sắc, độ mờ, font, timing)
      └── globals.css            # Reset CSS, hiệu ứng kính, trạng thái nút, ClearType
```

### 2.1. Luồng dữ liệu và Quản lý trạng thái (State Management)
* **Tập trung tại `App.tsx`**: Đóng vai trò là Single Source of Truth cho các trạng thái toàn cục của ứng dụng:
  * Trạng thái âm thanh AI (`isAiMuted`) và Microphone (`isMicMuted`).
  * Trạng thái ghim cửa sổ trên cùng (`isAlwaysOnTop`).
  * Chế độ xuyên chuột (`isSmartHitTest` và `isForceClickThrough`).
  * Ẩn/Hiện thanh điều khiển (`isUiHidden`).
  * Tỉ lệ thu phóng nhân vật (`characterScale`).
* **Cơ chế Event Bridge (Cầu nối sự kiện hai chiều)**:
  * **Frontend $\to$ Backend**: Dùng `invoke('tên_command', { tham_số })` để yêu cầu Native Rust thực thi các tác vụ cấp hệ điều hành (như xuyên chuột, ghim cửa sổ, di chuyển).
  * **Backend $\to$ Frontend**: Dùng `listen('tên_sự_kiện', callback)` để nhận tín hiệu khi người dùng click vào System Tray (khay đồng hồ hệ thống).

---

## 3. CHI TIẾT CÁC CHỨC NĂNG NỔI BẬT (DETAILED FEATURES)

### 3.1. Thanh công cụ nổi kính mờ (Floating Pill Toolbar)
* **Ý nghĩa**: Là bảng điều khiển trung tâm gom gọn tất cả các nút bấm chức năng vào một thanh dạng "viên thuốc" (Pill) bo tròn, áp dụng kỹ thuật Frosted Glass (backdrop-filter: blur) lơ lửng trên màn hình.
* **Các nút chức năng trên thanh**:
  1. **Nút Mute AI Sound (`Volume2` / `VolumeX`)**: Tắt hoặc bật tiếng phát ra từ AI.
  2. **Nút Mute Microphone (`Mic` / `MicOff`)**: Tắt hoặc bật mic thu âm của người dùng.
  3. **Nút Always on Top (`Pin` / `PinOff`)**: Ghim cửa sổ AI luôn nằm trên cùng mọi cửa sổ khác.
  4. **Nút Click-through (`MousePointerClick`)**: Bật hoặc tắt tính năng tự động click xuyên qua vùng trống.
  5. **Thanh trượt Scale (`Slider`)**: Điều chỉnh kích thước hiển thị của trợ lý ảo từ 50% đến 200%.
  6. **Nút Ẩn UI (`EyeOff`)**: Ẩn thanh công cụ để nhường toàn bộ không gian cho nhân vật AI.

---

### 3.2. Tính năng Smart Hit-Testing (Xuyên chuột thông minh)
* **Vấn đề thực tế**: Với cửa sổ trong suốt, nếu bắt chuột trên toàn màn hình thì người dùng không click được vào các phần mềm bên dưới (Chrome, Word, VSCode). Nếu tắt chuột hoàn toàn thì không bấm được vào thanh công cụ của AI.
* **Giải pháp của Frontend (`syncHitRects`)**:
  * Frontend gắn class đánh dấu `.interactive-hit-target` vào tất cả các vùng cần nhận chuột (Titlebar, Toolbar, Status Card).
  * Hàm `syncHitRects()` quét hàm `getBoundingClientRect()` của các phần tử này để lấy toạ độ hình chữ nhật chính xác $(x, y, \text{width}, \text{height})$.
  * Gửi danh sách toạ độ này xuống luồng Native Rust thông qua `update_hit_rects`.
  * Luồng Native đối chiếu chuột theo thời gian thực: Khi chuột nằm trên nút bấm $\to$ Nhận tương tác bình thường; khi chuột nằm ngoài vùng trống $\to$ Tự động click xuyên qua cửa sổ.

---

### 3.3. Tính năng Kéo thả tự do trên màn hình (Free Window Dragging)
* **Ý nghĩa**: Cho phép người dùng nhấc và di chuyển trợ lý ảo tới bất kỳ vị trí nào trên màn hình làm việc (góc màn hình, cạnh thanh taskbar, giữa màn hình).
* **Cơ chế triển khai (`handleStartDrag`)**:
  * Tích hợp biểu tượng tay nắm **Grip Handle (`GripVertical`)** ở góc trái thanh Toolbar, khi hover đổi màu Cyan và con trỏ chuột chuyển sang `grab`.
  * Hỗ trợ kéo từ: **Tay nắm Grip**, **Thanh Titlebar**, **Khoảng trống của Toolbar**, và **Thẻ trạng thái (Status Card)**.
  * Tận dụng API Native `getCurrentWindow().startDragging()`.
  * **Đặc biệt**: Đồng bộ cờ `set_is_dragging(true/false)` xuống Rust để tạm thời vô hiệu hóa bộ ngắt hit-test trong lúc đang kéo, đảm bảo cửa sổ di chuyển mượt mà ở tần số 60Hz/120Hz mà không bị rơi (drop) giữa chừng.

---

### 3.4. Hệ thống Thanh tiêu đề thích ứng đa nền tảng (Adaptive Cross-Platform Titlebar)
* **Ý nghĩa**: Đảm bảo trải nghiệm người dùng tự nhiên và đồng nhất trên cả 2 hệ điều hành phổ biến nhất: **macOS** và **Windows**.
* **Cơ chế tự động thích ứng (`Titlebar.tsx`)**:
  * **Trên macOS**: Tự động chừa khoảng trống 80px ở góc trên bên trái cho bộ 3 nút đèn giao thông native (Traffic Lights: Đỏ, Vàng, Xanh).
  * **Trên Windows**: Ẩn thanh tiêu đề mặc định của hệ điều hành, hiển thị cụm 3 nút tuỳ chỉnh chuẩn Windows ở góc trên bên phải:
    * `_` (Thu nhỏ): Gọi `win.minimize()`.
    * `□` / `⧉` (Phóng to / Khôi phục): Tự động đổi biểu tượng khi cửa sổ đạt kích thước tối đa. Hỗ trợ **Double-click** vào thanh tiêu đề để phóng to/thu nhỏ nhanh.
    * `✕` (Đóng): Đóng ứng dụng với hiệu ứng hover nền đỏ `#e81123`.
  * **Phím tắt chuyển đổi (`Cmd+Shift+W` / `Ctrl+Shift+W`)**: Cho phép lập trình viên và người dùng kiểm thử giao diện của hệ điều hành còn lại ngay trên máy của mình.

---

### 3.5. Thanh thu phóng thời gian thực (High-Performance 0ms Slider)
* **Ý nghĩa**: Dùng để phóng to / thu nhỏ kích thước nhân vật Live2D theo tỉ lệ từ $0.5\times$ đến $2.0\times$.
* **Điểm sáng kỹ thuật (Technical Highlight)**:
  * **Loại bỏ độ trễ 150ms**: Tắt triệt để thuộc tính `transition: background` trong CSS vốn gây ra hiện tượng thanh màu xanh bị trễ và đuổi theo sau nút tròn.
  * **Công thức khớp tâm hình học pixel**: Nút trượt tròn có bán kính 8px. Công thức CSS gradient bù trừ tọa độ chính xác:
    $$\text{Vị trí dừng} = \text{calc}\left(\% + \left(0.5 - \frac{\%}{100}\right) \times 16\text{px}\right)$$
    Đảm bảo vạch màu xanh luôn nằm chính xác ngay tại tâm nút tròn trên toàn dải trượt.
  * **Cập nhật DOM trực tiếp (0ms Latency)**: Cập nhật thẳng `style.background` ngay trên sự kiện `onInput` trong frame vẽ hiện tại trước khi React hoàn tất chu kỳ re-render, đạt phản hồi tức thì 60/120fps.

---

### 3.6. Chế độ Khóa xuyên chuột 100% (Force Click-Through)
* **Ý nghĩa**: Cho phép "đóng băng" ứng dụng thành một lớp hiển thị hoàn toàn trong suốt đối với chuột, rất hữu ích khi người dùng chơi game hoặc xem tài liệu toàn màn hình mà vẫn muốn thấy AI trên màn hình.
* **Thao tác**: Kích hoạt bằng phím tắt toàn cầu **`Cmd + Alt + C`** (trên Mac) hoặc **`Ctrl + Alt + C`** (trên Windows).

---

### 3.7. Chế độ Ẩn UI & Nút kích hoạt Ghost Trigger
* **Ý nghĩa**: Khi người dùng muốn ngắm nhìn nhân vật trọn vẹn mà không bị vướng thanh công cụ, bấm nút `Ẩn UI` (`EyeOff`).
* **Cơ chế**: Toàn bộ thanh công cụ mờ dần và ẩn đi (`opacity: 0`). Ở góc dưới màn hình sẽ xuất hiện một nút bấm nhỏ mờ ảo (**Ghost Trigger Button**) mang icon `Eye`. Nhấp vào nút này sẽ mở lại thanh công cụ ngay lập tức.

---

### 3.8. Thẻ xem trước trạng thái (Status Preview Card)
* **Ý nghĩa**: Nằm ngay bên dưới thanh công cụ, tóm tắt trực quan các thông số hệ thống đang chạy bằng chữ nhỏ và mã màu:
  * **AI Sound**: `ACTIVE` (Xanh cyan) / `MUTED` (Đỏ rose).
  * **Mic**: `LISTENING` (Xanh ngọc) / `MUTED` (Đỏ rose).
  * **Pin**: `PINNED` (Xanh ngọc) / `NORMAL` (Màu xám).
  * **Click-thru**: `SMART (AUTO)` / `FORCE 100%` / `OFF`.
  * **Scale**: Tỉ lệ phần trăm thu phóng hiện tại (ví dụ: `100%`, `125%`).

---

## 4. CÁC GIẢI PHÁP TỐI ƯU GIAO DIỆN & TRẢI NGHIỆM (UI/UX HIGHLIGHTS)

1. **Hiệu ứng Kính mờ cao cấp (Glassmorphism & Depth)**:
   * Ứng dụng nhiều cấp độ kính mờ: Kính cơ sở (`--glass-bg-base`), kính nhẹ cho popover (`--glass-bg-subtle`), và kính nổi cho modal (`--glass-bg-elevated`).
   * Sử dụng viền sáng mờ nhẹ (`border: 1px solid rgba(255, 255, 255, 0.15)`) tạo cảm giác chiều sâu 3D trên màn hình.
2. **Khử răng cưa chữ trên Windows ClearType**:
   * Thêm thuộc tính `text-shadow: 1px 1px 1px rgba(0, 0, 0, 0.004)` trong CSS reset giúp font chữ hệ thống của Windows không bị vỡ viền màu trên nền cửa sổ trong suốt.
3. **Phản hồi xúc giác trực quan (Micro-Interactions)**:
   * Mọi nút bấm khi click đều có hiệu ứng nén nhẹ (`transform: scale(0.94)`).
   * Đổi màu glow ánh sáng theo đúng ngữ nghĩa trạng thái (Đỏ Rose cho Mute, Xanh ngọc Emerald cho Always-on-top, Xanh Cyan cho Active).
4. **Tôn trọng tuỳ chọn giảm chuyển động (Reduced Motion)**:
   * Tự động phát hiện cài đặt trợ năng `prefers-reduced-motion` của hệ điều hành để đưa thời lượng chuyển động về gần 0, giúp người dùng nhạy cảm với chuyển động không bị chóng mặt.

---

## 5. BẢNG TRA CỨU COMPONENT & PROPS (DÀNH CHO BÁO CÁO)

| Tên Component | File nguồn | Các Props chính | Chức năng chính |
| :--- | :--- | :--- | :--- |
| **`App`** | `src/app/App.tsx` | Không có (Root layout) | Quản lý state toàn cục, Toolbar, Toast, đăng ký phím tắt toàn cục và điều phối hit-testing. |
| **`Titlebar`** | `src/components/ui/Titlebar.tsx` | Không có | Thanh điều khiển cửa sổ thích ứng: Traffic lights trên Mac, bộ nút `_ □ ✕` trên Windows, double-click phóng to. |
| **`Slider`** | `src/components/ui/Slider.tsx` | `value`, `min`, `max`, `step`, `onChange`, `icon`, `label` | Thanh trượt thu phóng nhân vật, tối ưu DOM 0ms latency, khớp tâm hình học nút tròn 16px. |
| **`IconButton`** | `src/components/ui/IconButton.tsx` | `icon`, `label`, `activeState`, `size`, `onClick`, `disabled` | Nút bấm tròn kính mờ, tự động đổi màu và hiệu ứng glow theo trạng thái (muted/pinned/active). |
| **`Tooltip`** | `src/components/ui/Tooltip.tsx` | `content`, `position`, `children`, `className` | Bong bóng chú thích nổi 4 hướng xuất hiện khi hover chuột vào nút bấm. |
